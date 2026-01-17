import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

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
      'accept': 'application/json',
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

// Format phone number to international format (France)
function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // French number starting with 0
  if (digits.startsWith('0') && digits.length === 10) {
    return '33' + digits.substring(1);
  }

  // Already international format with 33
  if (digits.startsWith('33') && digits.length === 11) {
    return digits;
  }

  // Return null if format not recognized
  return null;
}

// Send SMS via Brevo API
async function sendBrevoSMS({
  recipient,
  content,
}: {
  recipient: string;
  content: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY not configured, skipping SMS');
    return { success: false, reason: 'API key not configured' };
  }

  const formattedPhone = formatPhoneNumber(recipient);
  if (!formattedPhone) {
    console.warn('Invalid phone number format:', recipient);
    return { success: false, reason: 'Invalid phone number format' };
  }

  const response = await fetch('https://api.brevo.com/v3/transactionalSMS/send', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: 'ARythmeEthic',
      recipient: formattedPhone,
      content,
      type: 'transactional',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Brevo SMS API error:', error);
    return { success: false, reason: error };
  }

  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, email: requestedEmail } = body;

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID requis' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch the client to verify it exists and get email
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return NextResponse.json(
        { success: false, error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    // Generate a secure token for the form
    const formToken = randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 7); // Token valid for 7 days

    // Update client with the form token
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        form_token: formToken,
        form_token_expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('id', clientId);

    if (updateError) {
      console.error('Error updating client with token:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erreur lors de la génération du lien' },
        { status: 500 }
      );
    }

    // Get procedure type for RECUEIL_INFORMATIONS
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'RECUEIL_INFORMATIONS')
      .single();

    // Create a new procedure record
    if (procedureType) {
      await supabase.from('procedures').insert({
        client_id: clientId,
        procedure_type_id: procedureType.id,
        status: 'DRAFT',
      });
    }

    // Build the form URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arythmeethic.vercel.app';
    const formUrl = `${baseUrl}/formulaire/recueil-informations?token=${formToken}`;

    // Determine the email to send to (use requested email if provided, otherwise fallback to priority)
    const recipientEmail = requestedEmail || client.email_parent1 || client.email_jeune || client.email;

    // Determine recipient name and phone based on the email used
    let recipientName = client.first_name;
    let recipientPhone = client.phone1;
    if (recipientEmail === client.email_parent1) {
      recipientName = client.first_name_parent1 || client.first_name;
      recipientPhone = client.phone_parent1 || client.phone1;
    } else if (recipientEmail === client.email_parent2) {
      recipientName = client.first_name_parent2 || client.first_name;
      recipientPhone = client.phone_parent2 || client.phone1;
    } else if (recipientEmail === client.email_jeune) {
      recipientName = client.first_name_jeune || client.first_name;
      recipientPhone = client.phone_jeune || client.phone1;
    }

    // Send email via Brevo
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
                Afin de préparer au mieux notre collaboration, je vous invite à compléter le formulaire de recueil des informations en cliquant sur le bouton ci-dessous.
              </p>
              <p style="margin: 0 0 30px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Ce formulaire me permettra de mieux connaître votre situation et d'adapter mon accompagnement.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${formUrl}" style="display: inline-block; background-color: #2ba1bd; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Compléter le formulaire
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Ce lien est valable pendant 7 jours. Si vous rencontrez des difficultés, n'hésitez pas à me contacter.
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
        subject: 'A Rythme Ethic - Formulaire de recueil des informations',
        htmlContent: emailHtml,
      });

      if (!emailResult.success) {
        console.warn('Email not sent:', emailResult.reason);
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Don't fail the request if email fails
    }

    // Send SMS notification
    if (recipientPhone) {
      try {
        const smsContent = `Bonjour, je suis Florence d'A Rythme Ethic. Je vous ai envoyé un mail pour recueillir un peu plus d'informations sur votre demande d'accompagnement. Veuillez vérifier votre boîte mail et votre boîte de spam/indésirables. A très vite !`;

        const smsResult = await sendBrevoSMS({
          recipient: recipientPhone,
          content: smsContent,
        });

        if (!smsResult.success) {
          console.warn('SMS not sent:', smsResult.reason);
        }
      } catch (smsError) {
        console.error('Error sending SMS:', smsError);
        // Don't fail the request if SMS fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Procédure lancée avec succès',
      formUrl, // Return for testing/debugging
    });
  } catch (error) {
    console.error('Error launching procedure:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du lancement de la procédure' },
      { status: 500 }
    );
  }
}
