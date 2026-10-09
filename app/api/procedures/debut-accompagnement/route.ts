import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getEmailTemplate } from '@/lib/email-templates-server';
import { renderTemplate } from '@/lib/email-templates';
import { formatDateLongFr, formatHeureFr } from '@/lib/format';
import {
  launchProcedure,
  familyContact,
  FAMILY_MEMBERS,
  type FamilyMember,
} from '@/lib/procedures';

// Lancement (admin, session exigée par middleware.ts) : UN email à toute la famille cochée.
export async function POST(request: NextRequest) {
  try {
    const { clientId, recipients, premierCoursDate, premierCoursHeure } =
      (await request.json()) as {
        clientId?: string;
        recipients?: FamilyMember[];
        premierCoursDate?: string;
        premierCoursHeure?: string;
      };
    if (
      !clientId ||
      !Array.isArray(recipients) ||
      !recipients.every(r => FAMILY_MEMBERS.includes(r)) ||
      (premierCoursDate && !/^\d{4}-\d{2}-\d{2}$/.test(premierCoursDate)) ||
      (premierCoursHeure && !/^\d{2}:\d{2}$/.test(premierCoursHeure))
    ) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    // Emails relus sur la fiche, dédoublonnés (un parent et le jeune peuvent partager une adresse)
    const seen = new Set<string>();
    const contacts = recipients
      .map(r => familyContact(client, r))
      .filter(c => c.email && !seen.has(c.email.toLowerCase()) && seen.add(c.email.toLowerCase()));
    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun destinataire avec une adresse email' },
        { status: 400 }
      );
    }

    const premierCours = premierCoursDate
      ? `${formatDateLongFr(premierCoursDate)}${premierCoursHeure ? ` à ${formatHeureFr(premierCoursHeure)}` : ''}`
      : '';
    const email = renderTemplate(await getEmailTemplate('debut-accompagnement'), {
      // Prénom seulement pour un destinataire unique ; sinon « Bonjour à tous, » (le texte parle du jeune à la 3e personne)
      recipientName: (contacts.length === 1 && contacts[0].firstName) || 'à tous',
      jeunePrenom: client.first_name_jeune || 'votre enfant',
      premierCours,
    });

    const result = await launchProcedure({
      clientId,
      code: 'DEBUT_ACCOMPAGNEMENT',
      // ponytail: deadline_at (date) porte la date du 1er cours pour l'historique de la fiche
      fields: {
        recipient_email: contacts.map(c => c.email).join(', '),
        deadline_at: premierCoursDate || null,
      },
      email: { to: contacts.map(c => ({ email: c.email, name: c.firstName })), ...email },
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true, sentTo: contacts.map(c => c.email) });
  } catch (error) {
    console.error('Error launching debut-accompagnement:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
