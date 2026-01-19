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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { procedureId } = body;

    if (!procedureId) {
      return NextResponse.json(
        { success: false, error: 'Procedure ID requis' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get the procedure with client info
    const { data: procedure, error: procError } = await supabase
      .from('procedures')
      .select(`
        id,
        download_token,
        download_token_expires_at,
        recipient_email,
        client:clients (
          id,
          first_name,
          last_name,
          organisation,
          ecole_resp_modules_email,
          ecole_resp_modules_prenom,
          ecole_resp_modules_nom,
          ecole_resp_facturation_email,
          ecole_resp_facturation_prenom,
          ecole_resp_facturation_nom,
          ecole_resp_planning_email,
          ecole_resp_planning_prenom,
          ecole_resp_planning_nom,
          ecole_resp_autorisation_email,
          ecole_resp_autorisation_prenom,
          ecole_resp_autorisation_nom
        )
      `)
      .eq('id', procedureId)
      .single();

    if (procError || !procedure) {
      return NextResponse.json(
        { success: false, error: 'Procédure non trouvée' },
        { status: 404 }
      );
    }

    const client = procedure.client as {
      id: string;
      first_name: string;
      last_name: string;
      organisation: string;
      ecole_resp_modules_email?: string;
      ecole_resp_modules_prenom?: string;
      ecole_resp_modules_nom?: string;
      ecole_resp_facturation_email?: string;
      ecole_resp_facturation_prenom?: string;
      ecole_resp_facturation_nom?: string;
      ecole_resp_planning_email?: string;
      ecole_resp_planning_prenom?: string;
      ecole_resp_planning_nom?: string;
      ecole_resp_autorisation_email?: string;
      ecole_resp_autorisation_prenom?: string;
      ecole_resp_autorisation_nom?: string;
    };

    // Determine the recipient name based on email
    let recipientName = client.first_name;
    const recipientEmail = procedure.recipient_email;

    if (recipientEmail === client.ecole_resp_modules_email) {
      recipientName = client.ecole_resp_modules_prenom || client.first_name;
    } else if (recipientEmail === client.ecole_resp_facturation_email) {
      recipientName = client.ecole_resp_facturation_prenom || client.first_name;
    } else if (recipientEmail === client.ecole_resp_planning_email) {
      recipientName = client.ecole_resp_planning_prenom || client.first_name;
    } else if (recipientEmail === client.ecole_resp_autorisation_email) {
      recipientName = client.ecole_resp_autorisation_prenom || client.first_name;
    }

    // Build the download URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arythmeethic.vercel.app';
    const downloadUrl = `${baseUrl}/download/${procedure.download_token}`;

    // Format expiration date
    const expiresAt = new Date(procedure.download_token_expires_at);
    const expiresFormatted = expiresAt.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Build the email HTML
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
                Documents à télécharger
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
                Je vous transmets ci-dessous les documents demandés (CV actualisé et/ou extrait de casier judiciaire).
              </p>
              <p style="margin: 0 0 30px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Cliquez sur le bouton ci-dessous pour accéder à la page de téléchargement :
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${downloadUrl}" style="display: inline-block; background-color: #2ba1bd; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      Télécharger les documents
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Ce lien est valable jusqu'au <strong>${expiresFormatted}</strong>. Si vous rencontrez des difficultés, n'hésitez pas à me contacter.
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

    // Send the email
    const emailResult = await sendBrevoEmail({
      to: recipientEmail,
      toName: recipientName,
      subject: 'A Rythme Ethic - Documents à télécharger',
      htmlContent: emailHtml,
    });

    if (!emailResult.success) {
      console.warn('Email not sent:', emailResult.reason);
    }

    // Update procedure status and add to history
    await supabase
      .from('procedures')
      .update({ status: 'PDF_GENERATED', updated_at: new Date().toISOString() })
      .eq('id', procedureId);

    await supabase.from('procedure_status_history').insert({
      procedure_id: procedureId,
      status: 'MAIL_ENVOYE',
    });

    // Log to audit
    await supabase.from('audit_log').insert({
      source: 'admin',
      event: 'ENVOI_CV_CASIER_EMAIL_SENT',
      payload: { procedureId, email: recipientEmail },
    });

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
    });
  } catch (error) {
    console.error('Error sending CV/Casier email:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}
