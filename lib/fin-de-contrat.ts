import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getEmailTemplateOverride } from '@/lib/email-templates-server';
import { renderEmailShell, emailButton } from '@/lib/email-templates';

const FIN_DE_CONTRAT_TYPE_CODE = 'FIN_DE_CONTRAT';

export interface LaunchFinDeContratParams {
  clientId: string;
  recipientEmail: string;
  recipientName: string;
  /**
   * Si true, n'envoie pas de nouvelle procédure si une fin de contrat a déjà été
   * complétée (SIGNED) pour ce client durant le mois calendaire en cours.
   * Utilisé par le déclenchement auto depuis le formulaire de renouvellement pour
   * éviter de relancer un client qui vient de terminer sa fin de contrat.
   */
  skipIfSignedThisMonth?: boolean;
}

interface BrevoEmailParams {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

async function sendBrevoEmail({ to, toName, subject, htmlContent }: BrevoEmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('[Brevo] BREVO_API_KEY non configurée');
    return { success: false };
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: {
        name: 'A Rythme Ethic',
        email: process.env.BREVO_SENDER_EMAIL || 'florence.louazel@arythmeethic.fr',
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
  });
  if (!res.ok) {
    console.error('[Brevo] Erreur:', await res.text());
    return { success: false };
  }
  return { success: true };
}

function buildEmailHtml(recipientName: string, uploadUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
</head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica','Arial',sans-serif;background-color:#fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding:40px 40px 20px 40px;text-align:center;background:linear-gradient(to bottom,#f9f3ee,#efe3d7);border-radius:16px 16px 0 0;">
            <h1 style="margin:0;color:#6e3a25;font-family:'Georgia',serif;font-size:28px;font-weight:600;">A Rythme Ethic</h1>
            <p style="margin:10px 0 0 0;color:#c3826e;font-size:16px;">Accompagnement humain et bienveillant</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">Bonjour ${recipientName},</p>
            <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">L'accompagnement de votre enfant touche à sa fin.</p>
            <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
              Pourriez-vous effectuer les démarches sur le site du CESU pour mettre fin à mon contrat qui me lie à vous ?
              Il est possible de réaliser la déclaration du mois en cours en même temps.
            </p>
            <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
              <a href="https://www.cesu.urssaf.fr/info/accueil/question-du-moment/comment-gerer-la-fin-de-contrat.html" style="color:#2ba1bd;text-decoration:underline;">
                Procédure CESU - comment gérer la fin de contrat
              </a>
            </p>
            <p style="margin:0 0 12px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
              Une fois que vous aurez ces trois documents, merci de me les transmettre via le formulaire ci-dessous :
            </p>
            <ul style="margin:0 0 20px 0;color:#7b4a31;font-size:15px;line-height:1.8;padding-left:24px;">
              <li>Reçu pour solde de tout compte</li>
              <li>Attestation employeur</li>
              <li>Certificat de travail</li>
            </ul>
            <p style="margin:0 0 20px 0;color:#7b4a31;font-size:16px;line-height:1.6;">Je vous retournerai les documents signés.</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding:20px 0;">
                  <a href="${uploadUrl}" style="display: inline-block; background-color: #2ba1bd !important; color: #ffffff !important; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500; mso-padding-alt: 0;"><span style="color: #ffffff !important;">Déposer les documents</span></a>
                </td>
              </tr>
            </table>

            <p style="margin:30px 0 16px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
              Ce fut un plaisir d'accompagner votre enfant, je lui souhaite le meilleur pour la suite et de la
              réussite dans ses projets.
            </p>
            <p style="margin:0 0 16px 0;color:#7b4a31;font-size:16px;line-height:1.6;">
              Pour information, si besoin, j'effectue des sessions de révisions du brevet et du BAC ponctuellement
              dans l'année, n'hésitez pas à me contacter si le besoin s'en fait sentir.
            </p>
            <p style="margin:0;color:#a97761;font-size:14px;line-height:1.6;">Belle journée,</p>
          </td>
        </tr>
        <tr>
          <td style="padding:30px 40px;background-color:#f9f3ee;border-radius:0 0 16px 16px;text-align:center;">
            <a href="https://arythmeethic.fr" style="text-decoration:none;color:inherit;display:block;">
              <p style="margin:0;color:#6e3a25;font-size:14px;font-weight:600;">Florence Louazel</p>
              <p style="margin:5px 0 0 0;color:#a97761;font-size:13px;">A Rythme Ethic</p>
            </a>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function launchFinDeContratProcedure(params: LaunchFinDeContratParams): Promise<{
  success: boolean;
  procedureId?: string;
  skipped?: boolean;
  error?: string;
}> {
  const supabase = createServiceRoleClient();
  const { data: client } = await supabase
    .from('clients')
    .select('id, type_client')
    .eq('id', params.clientId)
    .single();
  if (!client) return { success: false, error: 'Client introuvable' };
  if (client.type_client !== 'Particulier') {
    return {
      success: false,
      error: 'La procédure de fin de contrat est réservée aux particuliers',
    };
  }

  const { data: procedureType } = await supabase
    .from('procedure_types')
    .select('id')
    .eq('code', FIN_DE_CONTRAT_TYPE_CODE)
    .single();
  if (!procedureType) return { success: false, error: 'Type de procédure introuvable' };

  // Si demandé, ne pas relancer si une fin de contrat a déjà été complétée ce mois-ci.
  // (cas typique : client qui termine sa fin de contrat puis répond "non" au
  //  renouvellement le même mois → on évite le doublon)
  if (params.skipIfSignedThisMonth) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const { data: signedThisMonth } = await supabase
      .from('procedures')
      .select('id')
      .eq('client_id', params.clientId)
      .eq('procedure_type_id', procedureType.id)
      .eq('status', 'SIGNED')
      .gte('updated_at', startOfMonth.toISOString())
      .limit(1);
    if (signedThisMonth && signedThisMonth.length > 0) {
      return { success: true, skipped: true };
    }
  }

  // Neutraliser les éventuelles procédures fin de contrat encore en DRAFT pour ce
  // client : elles sont superseded par celle qu'on s'apprête à créer et, laissées
  // ouvertes, continueraient à recevoir des relances automatiques.
  await supabase
    .from('procedures')
    .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
    .eq('client_id', params.clientId)
    .eq('procedure_type_id', procedureType.id)
    .eq('status', 'DRAFT');

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 60);

  const { data: procedure, error: procError } = await supabase
    .from('procedures')
    .insert({
      client_id: params.clientId,
      procedure_type_id: procedureType.id,
      status: 'DRAFT',
      recipient_email: params.recipientEmail,
      download_token: token,
      download_token_expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();
  if (procError || !procedure) {
    console.error('Error creating fin-de-contrat procedure:', procError);
    return { success: false, error: 'Erreur création procédure' };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://arythmeethic.fr';
  const uploadUrl = `${origin}/formulaire/fin-de-contrat/${token}`;

  const ovFdc = await getEmailTemplateOverride('fin-de-contrat', {
    recipientName: params.recipientName,
  });
  const fdcCta =
    emailButton(uploadUrl, 'Déposer les documents') +
    `<p style="margin:30px 0 16px 0;color:#7b4a31;font-size:16px;line-height:1.6;">Ce fut un plaisir d'accompagner votre enfant, je lui souhaite le meilleur pour la suite et de la réussite dans ses projets.</p><p style="margin:0 0 16px 0;color:#7b4a31;font-size:16px;line-height:1.6;">Pour information, si besoin, j'effectue des sessions de révisions du brevet et du BAC ponctuellement dans l'année, n'hésitez pas à me contacter si le besoin s'en fait sentir.</p><p style="margin:0;color:#a97761;font-size:14px;line-height:1.6;">Belle journée,</p>`;
  await sendBrevoEmail({
    to: params.recipientEmail,
    toName: params.recipientName,
    subject: ovFdc?.subject ?? 'A Rythme Ethic - Fin de contrat - documents à transmettre',
    htmlContent: ovFdc
      ? renderEmailShell(ovFdc.html, fdcCta)
      : buildEmailHtml(params.recipientName, uploadUrl),
  });

  await supabase.from('procedure_status_history').insert({
    procedure_id: procedure.id,
    status: 'MAIL_ENVOYE',
  });

  return { success: true, procedureId: procedure.id };
}
