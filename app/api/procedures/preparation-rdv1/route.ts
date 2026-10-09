import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getEmailTemplate } from '@/lib/email-templates-server';
import { renderTemplate } from '@/lib/email-templates';
import { formatDateLongFr, formatHeureFr } from '@/lib/format';
import { launchProcedure } from '@/lib/procedures';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      recipientEmail: overrideEmail,
      recipientName: overrideName,
      rdvDate,
      rdvHeure,
    } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID requis' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rdvDate ?? '') || !/^\d{2}:\d{2}$/.test(rdvHeure ?? '')) {
      return NextResponse.json(
        { success: false, error: 'Date et heure du rendez-vous requises' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    if (clientError || !client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    // Enregistré avant l'envoi : si la colonne manque (migration non appliquée), aucun email ne part.
    const { error: updateError } = await supabase
      .from('clients')
      .update({ rdv1_date: rdvDate, rdv1_heure: rdvHeure })
      .eq('id', clientId);
    if (updateError) {
      console.error('Error saving RDV 1 date:', updateError);
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'enregistrement du rendez-vous" },
        { status: 500 }
      );
    }

    // Destinataire choisi dans la modale, sinon parent 1 > jeune > email principal ; prénom seul
    const recipientEmail =
      overrideEmail || client.email_parent1 || client.email_jeune || client.email;
    const recipientName =
      overrideName || client.first_name_parent1 || client.first_name_jeune || client.first_name;
    const jeuneName = client.first_name_jeune
      ? `${client.first_name_jeune}${client.last_name_jeune ? ' ' + client.last_name_jeune : ''}`
      : 'votre enfant';
    const vars = {
      recipientName,
      jeuneName,
      rdvDate: formatDateLongFr(rdvDate),
      rdvHeure: formatHeureFr(rdvHeure),
    };

    // La version personnalisée de Florence ne cite pas la date : encadré ajouté tant que
    // le texte n'utilise pas {{rdvDate}} (pas de doublon sinon).
    const template = await getEmailTemplate('preparation-rdv1');
    const rdvBlock = /\{\{\s*rdvDate\s*\}\}/.test(template.html)
      ? ''
      : `<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;"><tr><td style="padding:16px 20px;background-color:#f9f3ee;border-radius:12px;color:#6e3a25;font-size:16px;">Rendez-vous prévu le <strong>${vars.rdvDate} à ${vars.rdvHeure}</strong></td></tr></table>`;

    const result = await launchProcedure({
      clientId,
      code: 'PREPARATION_RDV1',
      // ponytail: deadline_at (date) porte la date du RDV pour l'historique de la fiche
      fields: { deadline_at: rdvDate, recipient_email: recipientEmail },
      email: {
        to: [{ email: recipientEmail, name: recipientName }],
        ...renderTemplate(template, vars, rdvBlock),
      },
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Procédure lancée avec succès' });
  } catch (error) {
    console.error('Error launching procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
