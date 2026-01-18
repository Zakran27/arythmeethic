import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Client ID requis' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch the client to verify it exists and get email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    // Get procedure type for PREPARATION_RDV1
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'PREPARATION_RDV1')
      .single();

    // Create a new procedure record and add to status history
    if (procedureType) {
      const { data: newProcedure } = await supabase.from('procedures').insert({
        client_id: clientId,
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

    // Determine the email to send to (priority: parent1 > jeune > main email)
    const recipientEmail = client.email_parent1 || client.email_jeune || client.email;
    const recipientName = client.first_name_parent1 || client.first_name_jeune || client.first_name;
    const jeuneName = client.first_name_jeune
      ? `${client.first_name_jeune}${client.last_name_jeune ? ' ' + client.last_name_jeune : ''}`
      : 'votre enfant';

    // Build email HTML
    const emailHtml = `
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
                Afin de préparer au mieux notre premier rendez-vous avec ${jeuneName}, je vous invite à rassembler les documents suivants :
              </p>

              <!-- Documents list -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0;">
                <tr>
                  <td style="padding: 20px; background-color: #f9f3ee; border-radius: 12px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; color: #6e3a25; font-size: 15px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #2ba1bd; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-size: 13px;">1</span>
                          Les <strong>3 derniers bulletins de notes</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6e3a25; font-size: 15px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #2ba1bd; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-size: 13px;">2</span>
                          Les <strong>2 dernières évaluations</strong> de mathématiques
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6e3a25; font-size: 15px;">
                          <span style="display: inline-block; width: 24px; height: 24px; background-color: #2ba1bd; color: white; border-radius: 50%; text-align: center; line-height: 24px; margin-right: 12px; font-size: 13px;">3</span>
                          Le(s) <strong>cahier(s) ou classeur de mathématiques</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Ces éléments me permettront de mieux comprendre le parcours scolaire et d'adapter mon accompagnement.
              </p>

              <p style="margin: 20px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Si vous avez des questions, n'hésitez pas à me contacter.
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

    try {
      const emailResult = await sendBrevoEmail({
        to: recipientEmail,
        toName: recipientName,
        subject: 'A Rythme Ethic - Préparation du premier rendez-vous',
        htmlContent: emailHtml,
      });

      if (!emailResult.success) {
        console.warn('Email not sent:', emailResult.reason);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Procédure lancée avec succès',
    });
  } catch (error) {
    console.error('Error launching procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
