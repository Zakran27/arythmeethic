import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

/**
 * CRON Job: Envoi automatique mi-juin pour tous les clients Particulier au statut 'Client'
 * À configurer dans Vercel: 0 9 15 6 * (15 juin à 9h)
 *
 * Sécurisé par CRON_SECRET
 */

// Send email via Brevo API
async function sendBrevoEmail({
  to,
  toName,
  subject,
  htmlContent,
}: {
  to: string;
  toName: string;
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY not configured, skipping email');
    return { success: false, reason: 'API key not configured' };
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'A Rythme Ethic',
        email: process.env.BREVO_SENDER_EMAIL || 'noreply@arythmeethic.fr',
      },
      to: [{ email: to, name: toName }],
      subject,
      htmlContent,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Brevo API error:', error);
    return { success: false, reason: error };
  }

  return { success: true };
}

// Generate the renewal email HTML
function generateRenewalEmailHtml(recipientName: string, jeuneName: string, formUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif; background-color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(to bottom, #f9f3ee, #efe3d7); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #6e3a25; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600;">
                A Rythme Ethic
              </h1>
              <p style="margin: 10px 0 0 0; color: #c3826e; font-size: 16px;">
                Accompagnement humain et bienveillant
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Bonjour ${recipientName},
              </p>
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                L'année scolaire touche à sa fin et je tenais à vous remercier pour la confiance que vous m'avez accordée pour l'accompagnement de ${jeuneName}.
              </p>
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Afin de préparer la rentrée prochaine, <strong>souhaitez-vous poursuivre l'accompagnement l'année suivante ?</strong>
              </p>
              <p style="margin: 0 0 30px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Merci de me faire part de votre décision en cliquant sur le bouton ci-dessous :
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${formUrl}" style="display: inline-block; background-color: #2ba1bd; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Donner ma réponse
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Ce lien est valable pendant 30 jours. Si vous avez des questions, n'hésitez pas à me contacter.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f3ee; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #6e3a25; font-size: 14px;">
                Florence Louazel
              </p>
              <p style="margin: 5px 0 0 0; color: #a97761; font-size: 13px;">
                A Rythme Ethic - Cours de mathématiques
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arythmeethic.vercel.app';

    // Get all Particulier clients with status 'Client' who haven't responded yet this year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1).toISOString();

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('type_client', 'Particulier')
      .eq('client_status', 'Client')
      .or(`renouvellement_date_reponse.is.null,renouvellement_date_reponse.lt.${yearStart}`);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json({ error: 'Error fetching clients' }, { status: 500 });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No clients to notify', count: 0 });
    }

    // Get procedure type
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'SOUHAIT_RENOUVELLEMENT')
      .single();

    let successCount = 0;
    let errorCount = 0;

    for (const client of clients) {
      try {
        // Generate token
        const renewalToken = randomBytes(32).toString('hex');
        const tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

        // Update client
        await supabase
          .from('clients')
          .update({
            renouvellement_token: renewalToken,
            renouvellement_token_expires_at: tokenExpiresAt.toISOString(),
            renouvellement_dernier_email_at: new Date().toISOString(),
            renouvellement_souhaite: null,
            renouvellement_commentaire: null,
            renouvellement_date_reponse: null,
          })
          .eq('id', client.id);

        // Create procedure and add to status history
        if (procedureType) {
          const { data: newProcedure } = await supabase.from('procedures').insert({
            client_id: client.id,
            procedure_type_id: procedureType.id,
            status: 'DRAFT',
          }).select('id').single();

          // Add initial status to history
          if (newProcedure) {
            await supabase.from('procedure_status_history').insert({
              procedure_id: newProcedure.id,
              status: 'MAIL_ENVOYE',
            });
          }
        }

        // Send email
        const formUrl = `${baseUrl}/formulaire/renouvellement?token=${renewalToken}`;
        const recipientEmail = client.email_parent1 || client.email_jeune || client.email;
        const recipientName = client.first_name_parent1 || client.first_name_jeune || client.first_name;
        const jeuneName = client.first_name_jeune
          ? `${client.first_name_jeune}${client.last_name_jeune ? ' ' + client.last_name_jeune : ''}`
          : 'votre enfant';

        const emailHtml = generateRenewalEmailHtml(recipientName, jeuneName, formUrl);

        const result = await sendBrevoEmail({
          to: recipientEmail,
          toName: recipientName,
          subject: "A Rythme Ethic - Souhaitez-vous poursuivre l'accompagnement ?",
          htmlContent: emailHtml,
        });

        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        console.error(`Error processing client ${client.id}:`, err);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Envoi terminé: ${successCount} succès, ${errorCount} erreurs`,
      successCount,
      errorCount,
      totalClients: clients.length,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
