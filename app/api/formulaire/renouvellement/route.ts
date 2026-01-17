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

// Generate the Google review request email HTML
function generateGoogleReviewEmailHtml(recipientName: string): string {
  const googleReviewUrl = process.env.GOOGLE_REVIEW_URL || 'https://www.google.com/search?client=opera-gx&hs=6VG&sca_esv=35cc2770783c4fd6&sxsrf=ANbL-n6bYbkzt6xGvHh1_otCAXk20Au6KQ:1768676583605&si=AL3DRZEsmMGCryMMFSHJ3StBhOdZ2-6yYkXd_doETEE1OR-qOS6yz36kfP72E4isVy8v8-pFookA6FMMRDADc8El-4xFDUMXGbnFcfunlKbeZg9huqxDGg5poe5Dz1Nsz59GQE2_MvgA&q=A+Rythme+Ethic+Avis&sa=X&ved=2ahUKEwib5_PboZOSAxVVU6QEHQrTNJkQ0bkNegQIRxAF&cshid=1768676643833155&biw=2132&bih=1064&dpr=0.9&aic=0#lrd=0x4805e5f079b17ced:0xd6262e0deee7ceb8,3,,,,';

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
                Merci pour votre réponse concernant le renouvellement de l'accompagnement !
              </p>
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Si vous avez été satisfait(e) de nos échanges et du suivi de votre enfant, <strong>pourriez-vous prendre quelques instants pour laisser un avis Google ?</strong>
              </p>
              <p style="margin: 0 0 30px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Votre témoignage est précieux et aide d'autres familles à découvrir mes services.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${googleReviewUrl}" style="display: inline-block; background-color: #2ba1bd; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
                      ⭐ Laisser un avis Google
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Un grand merci pour votre soutien !
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

// GET: Fetch client data by token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requis' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find client by renewal token
    const { data: client, error } = await supabase
      .from('clients')
      .select('first_name, first_name_jeune, last_name_jeune, first_name_parent1, renouvellement_token_expires_at, renouvellement_date_reponse')
      .eq('renouvellement_token', token)
      .single();

    if (error || !client) {
      return NextResponse.json({ success: false, error: 'Lien invalide ou expiré' }, { status: 404 });
    }

    // Check if token is expired
    if (client.renouvellement_token_expires_at) {
      const expiresAt = new Date(client.renouvellement_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({ success: false, error: 'Ce lien a expiré' }, { status: 410 });
      }
    }

    // Check if already responded
    if (client.renouvellement_date_reponse) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà répondu à ce formulaire' }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      client: {
        first_name: client.first_name,
        first_name_jeune: client.first_name_jeune,
        last_name_jeune: client.last_name_jeune,
        first_name_parent1: client.first_name_parent1,
      },
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST: Submit renewal response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, souhaite, commentaire } = body;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requis' }, { status: 400 });
    }

    if (souhaite === undefined || souhaite === null) {
      return NextResponse.json({ success: false, error: 'Réponse requise' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Find client by token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('renouvellement_token', token)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ success: false, error: 'Lien invalide' }, { status: 404 });
    }

    // Check if token is expired
    if (client.renouvellement_token_expires_at) {
      const expiresAt = new Date(client.renouvellement_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({ success: false, error: 'Ce lien a expiré' }, { status: 410 });
      }
    }

    // Check if already responded
    if (client.renouvellement_date_reponse) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà répondu' }, { status: 410 });
    }

    // Update client with response
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        renouvellement_souhaite: souhaite,
        renouvellement_commentaire: commentaire || null,
        renouvellement_date_reponse: new Date().toISOString(),
        // Clear the token after use
        renouvellement_token: null,
        renouvellement_token_expires_at: null,
      })
      .eq('id', client.id);

    if (updateError) {
      console.error('Error updating client:', updateError);
      return NextResponse.json({ success: false, error: 'Erreur lors de l\'enregistrement' }, { status: 500 });
    }

    // Update procedure status to SIGNED (completed)
    const { data: procedureType } = await supabase
      .from('procedure_types')
      .select('id')
      .eq('code', 'SOUHAIT_RENOUVELLEMENT')
      .single();

    if (procedureType) {
      await supabase
        .from('procedures')
        .update({ status: 'SIGNED' })
        .eq('client_id', client.id)
        .eq('procedure_type_id', procedureType.id)
        .eq('status', 'DRAFT');
    }

    // Send Google review request email
    const recipientEmail = client.email_parent1 || client.email_jeune || client.email;
    const recipientName = client.first_name_parent1 || client.first_name_jeune || client.first_name;

    try {
      const emailHtml = generateGoogleReviewEmailHtml(recipientName);
      await sendBrevoEmail({
        to: recipientEmail,
        toName: recipientName,
        subject: 'A Rythme Ethic - Votre avis compte !',
        htmlContent: emailHtml,
      });
    } catch (emailError) {
      console.error('Error sending Google review email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Réponse enregistrée avec succès',
    });
  } catch (error) {
    console.error('Error submitting response:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
