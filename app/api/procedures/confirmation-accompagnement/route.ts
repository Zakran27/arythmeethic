import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getEmailTemplate } from '@/lib/email-templates-server';
import { renderTemplate, emailButton } from '@/lib/email-templates';
import { anneeScolaire } from '@/lib/format';
import {
  launchProcedure,
  familyContact,
  FAMILY_MEMBERS,
  type FamilyMember,
} from '@/lib/procedures';

// Lancement (admin, session exigée par middleware.ts) : email avec un lien Oui / Non valable 30 jours.
export async function POST(request: NextRequest) {
  try {
    const { clientId, recipient } = (await request.json()) as {
      clientId?: string;
      recipient?: FamilyMember;
    };
    if (!clientId || !recipient || !FAMILY_MEMBERS.includes(recipient)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data: client } = await supabase.from('clients').select('*').eq('id', clientId).single();
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }
    const contact = familyContact(client, recipient);
    if (!contact.email) {
      return NextResponse.json(
        { success: false, error: "Ce destinataire n'a pas d'adresse email" },
        { status: 400 }
      );
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arythmeethic.fr';
    const link = `${baseUrl}/formulaire/confirmation-accompagnement/${token}`;

    const email = renderTemplate(
      await getEmailTemplate('confirmation-accompagnement'),
      {
        recipientName: contact.firstName || 'Madame, Monsieur',
        jeunePrenom: client.first_name_jeune || 'votre enfant',
        anneeScolaire: anneeScolaire(),
      },
      emailButton(link, 'Donner ma réponse') +
        `<p style="margin:30px 0 0 0;color:#a97761;font-size:14px;line-height:1.6;">Ce lien est valable pendant 30 jours. Si vous avez des questions, n'hésitez pas à me contacter.</p>`
    );

    const result = await launchProcedure({
      clientId,
      code: 'CONFIRMATION_ACCOMPAGNEMENT',
      fields: {
        download_token: token,
        download_token_expires_at: expiresAt.toISOString(),
        recipient_email: contact.email,
      },
      closePreviousDrafts: true,
      email: { to: [{ email: contact.email, name: contact.firstName }], ...email },
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 502 });
    }
    return NextResponse.json({ success: true, sentTo: contact.email });
  } catch (error) {
    console.error('Error launching confirmation-accompagnement:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
