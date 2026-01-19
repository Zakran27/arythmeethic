import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

/**
 * CRON Job: Relance automatique tous les vendredis à 16h
 * À configurer dans Vercel: 0 16 * * 5 (vendredi 16h)
 *
 * Envoie une relance aux clients qui:
 * - Ont reçu un email de renouvellement
 * - N'ont pas encore répondu
 * - Le dernier email date de plus de 7 jours
 * - Le token n'est pas expiré
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

// Generate the reminder email HTML
function generateReminderEmailHtml(recipientName: string, jeuneName: string, formUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <style>
    :root { color-scheme: light only; }
    @media (prefers-color-scheme: dark) {
      body, table, td, div, p, span, h1, h2, h3, a { background-color: #fafafa !important; }
      .email-wrapper { background-color: #fafafa !important; }
      .email-content { background-color: #ffffff !important; }
    }
  </style>
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
                Je me permets de vous relancer concernant le renouvellement de l'accompagnement de ${jeuneName} pour l'année prochaine.
              </p>
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                <strong>Votre réponse m'aiderait à organiser au mieux mon planning pour la rentrée.</strong>
              </p>
              <p style="margin: 0 0 30px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Cela ne prend que quelques secondes :
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
                Merci d'avance pour votre retour !
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

    // Get procedure type for finding procedures
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'SOUHAIT_RENOUVELLEMENT')
      .single();

    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get clients who:
    // - Have a valid renewal token (not expired)
    // - Haven't responded yet
    // - Last email was sent more than 7 days ago
    const now = new Date().toISOString();

    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('type_client', 'Particulier')
      .not('renouvellement_token', 'is', null)
      .is('renouvellement_date_reponse', null)
      .gt('renouvellement_token_expires_at', now)
      .lt('renouvellement_dernier_email_at', sevenDaysAgo.toISOString());

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return NextResponse.json({ error: 'Error fetching clients' }, { status: 500 });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({ success: true, message: 'No clients to remind', count: 0 });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const client of clients) {
      try {
        // Build form URL with existing token
        const formUrl = `${baseUrl}/formulaire/renouvellement?token=${client.renouvellement_token}`;
        const recipientEmail = client.email_parent1 || client.email_jeune || client.email;
        const recipientName = client.first_name_parent1 || client.first_name_jeune || client.first_name;
        const jeuneName = client.first_name_jeune
          ? `${client.first_name_jeune}${client.last_name_jeune ? ' ' + client.last_name_jeune : ''}`
          : 'votre enfant';

        const emailHtml = generateReminderEmailHtml(recipientName, jeuneName, formUrl);

        const result = await sendBrevoEmail({
          to: recipientEmail,
          toName: recipientName,
          subject: 'A Rythme Ethic - Rappel : Votre avis sur le renouvellement',
          htmlContent: emailHtml,
        });

        if (result.success) {
          // Update last email date
          await supabase
            .from('clients')
            .update({ renouvellement_dernier_email_at: new Date().toISOString() })
            .eq('id', client.id);

          // Add status to history
          if (procedureType) {
            const { data: procedure } = await supabase
              .from('procedures')
              .select('id')
              .eq('client_id', client.id)
              .eq('procedure_type_id', procedureType.id)
              .eq('status', 'DRAFT')
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (procedure) {
              await supabase.from('procedure_status_history').insert({
                procedure_id: procedure.id,
                status: 'RELANCE_ENVOYEE',
              });
            }
          }

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
      message: `Relances terminées: ${successCount} succès, ${errorCount} erreurs`,
      successCount,
      errorCount,
      totalClients: clients.length,
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
