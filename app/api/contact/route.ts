import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

// Strict-ish email validation: requires local@domain.tld with TLD of 2+ chars.
// Mirrors the client-side regex in ContactModal.tsx.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function sendBrevoEmail(p: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.warn('BREVO_API_KEY not configured, skipping email');
    return { ok: false, error: 'BREVO_API_KEY non configurée' };
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { accept: 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      sender: {
        name: 'A Rythme Ethic',
        email: process.env.BREVO_SENDER_EMAIL || 'florence.louazel@arythmeethic.fr',
      },
      to: [{ email: p.to, ...(p.toName ? { name: p.toName } : {}) }],
      subject: p.subject,
      htmlContent: p.htmlContent,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error('Brevo API error:', errBody);
    return { ok: false, error: errBody };
  }
  return { ok: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientType,
      firstName,
      lastName,
      organisationName,
      email,
      phone,
      studentLevel,
      requestType,
      requestSubject,
      howDidYouHear,
      referrerName,
      message,
      demarcheVolontaire,
    } = body;

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: "L'adresse email est invalide. Vérifiez la forme : nom@domaine.fr",
        },
        { status: 400 }
      );
    }

    // Map client types to database values
    const clientTypeMapping: Record<string, { type_client: string; sub_type: string | null }> = {
      student: { type_client: 'Particulier', sub_type: 'Jeune' },
      parent: { type_client: 'Particulier', sub_type: 'Parent' },
      school: { type_client: 'École', sub_type: null },
    };

    // Map client types to French labels for email
    const clientTypeLabels: Record<string, string> = {
      student: 'Jeune / Élève',
      parent: 'Parent',
      school: 'Établissement',
    };

    // Map request types to French labels
    const requestTypeLabels: Record<string, string> = {
      accompagnement_annee: "Accompagnement sur l'année",
      accompagnement_ponctuel: 'Accompagnement ponctuel',
    };

    // Map request subjects to French labels
    const requestSubjectLabels: Record<string, string> = {
      information: "Demande d'informations",
      vacation_technique: 'Vacation dans une matière technique',
      atelier_cps: 'Atelier de compétences psycho-sociales',
    };

    // Map how did you hear to French labels
    const howDidYouHearLabels: Record<string, string> = {
      linkedin: 'LinkedIn',
      recommandation: 'Recommandation',
    };

    // Create client in Supabase
    const supabase = createServiceRoleClient();
    const { type_client, sub_type } = clientTypeMapping[clientType] || {
      type_client: 'Particulier',
      sub_type: null,
    };

    // Build the client record based on type
    const clientRecord: Record<string, unknown> = {
      type_client,
      sub_type,
      client_status: 'Prospect',
      notes: message,
    };

    if (clientType === 'student') {
      // Jeune - store in jeune fields
      clientRecord.first_name = firstName;
      clientRecord.last_name = lastName;
      clientRecord.first_name_jeune = firstName;
      clientRecord.last_name_jeune = lastName;
      clientRecord.email = email;
      clientRecord.email_jeune = email;
      clientRecord.phone_jeune = phone || null;
      clientRecord.demarche_volontaire = demarcheVolontaire === true;
    } else if (clientType === 'parent') {
      // Parent - store in parent1 fields
      clientRecord.first_name = firstName;
      clientRecord.last_name = lastName;
      clientRecord.first_name_parent1 = firstName;
      clientRecord.last_name_parent1 = lastName;
      clientRecord.email = email;
      clientRecord.email_parent1 = email;
      clientRecord.phone_parent1 = phone || null;
      clientRecord.niveau_eleve = studentLevel || null;
      clientRecord.demande_type = requestTypeLabels[requestType] || requestType || null;
      clientRecord.demarche_volontaire = demarcheVolontaire === true;
    } else if (clientType === 'school') {
      // École - store in main fields + organisation
      clientRecord.first_name = firstName;
      clientRecord.last_name = lastName;
      clientRecord.email = email;
      clientRecord.phone1 = phone || null;
      clientRecord.organisation = organisationName || null;
      clientRecord.how_did_you_hear = howDidYouHearLabels[howDidYouHear] || howDidYouHear || null;
      clientRecord.referrer_name = referrerName || null;
      // Store request subject in notes along with message
      if (requestSubject) {
        clientRecord.notes = `Objet: ${requestSubjectLabels[requestSubject] || requestSubject}\n\n${message}`;
      }
    }

    const { data: newClient, error: insertError } = await supabase
      .from('clients')
      .insert([clientRecord])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating client:', insertError);
      // Continue anyway to send the email notification
    } else {
      console.log('Client created successfully:', newClient?.id);
    }

    // Build email content based on client type
    let emailContent = `
Nouveau message depuis A Rythme Ethic

Type de client: ${clientTypeLabels[clientType] || clientType}
`;

    if (clientType === 'school') {
      emailContent += `Établissement: ${organisationName}
`;
    }

    emailContent += `Nom: ${lastName}
Prénom: ${firstName}
Email: ${email}
Téléphone: ${phone || 'Non renseigné'}
`;

    if (clientType === 'parent') {
      emailContent += `Niveau de l'élève: ${studentLevel}
Type de demande: ${requestTypeLabels[requestType] || requestType}
`;
    }

    if (clientType === 'school') {
      emailContent += `Objet de la demande: ${requestSubjectLabels[requestSubject] || requestSubject}
Comment m'a connue: ${howDidYouHearLabels[howDidYouHear] || howDidYouHear}
`;
      if (howDidYouHear === 'recommandation' && referrerName) {
        emailContent += `Recommandé par: ${referrerName}
`;
      }
    }

    emailContent += `
Message:
${message}
    `.trim();

    console.log('Contact form submission:', {
      clientType,
      firstName,
      lastName,
      organisationName,
      email,
      phone,
      studentLevel,
      requestType,
      requestSubject,
      howDidYouHear,
      referrerName,
      message,
    });

    // Notification email to Florence
    const notifTo =
      process.env.FLORENCE_NOTIF_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      'florence.louazel@arythmeethic.fr';

    const detailRows: [string, string][] = [
      ['Type de client', clientTypeLabels[clientType] || clientType || '-'],
    ];
    if (clientType === 'school' && organisationName) {
      detailRows.push(['Établissement', organisationName]);
    }
    detailRows.push(['Nom', lastName || '-']);
    detailRows.push(['Prénom', firstName || '-']);
    detailRows.push(['Email', email]);
    detailRows.push(['Téléphone', phone || 'Non renseigné']);
    if (clientType === 'parent') {
      detailRows.push(["Niveau de l'élève", studentLevel || '-']);
      detailRows.push(['Type de demande', requestTypeLabels[requestType] || requestType || '-']);
    }
    if (clientType === 'school') {
      detailRows.push(['Objet', requestSubjectLabels[requestSubject] || requestSubject || '-']);
      detailRows.push([
        "M'a connue via",
        howDidYouHearLabels[howDidYouHear] || howDidYouHear || '-',
      ]);
      if (howDidYouHear === 'recommandation' && referrerName) {
        detailRows.push(['Recommandé par', referrerName]);
      }
    }

    const escapeHtml = (s: string) =>
      s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const detailRowsHtml = detailRows
      .map(
        ([k, v]) => `
          <tr>
            <td style="padding: 10px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8; font-weight: 600; width: 40%;">${escapeHtml(k)}</td>
            <td style="padding: 10px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">${escapeHtml(String(v))}</td>
          </tr>`
      )
      .join('');

    const messageHtml = escapeHtml(message || '').replace(/\n/g, '<br/>');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica','Arial',sans-serif;background-color:#fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="padding:40px 40px 20px 40px;text-align:center;background:linear-gradient(to bottom,#f9f3ee,#efe3d7);border-radius:16px 16px 0 0;">
          <h1 style="margin:0;color:#6e3a25;font-family:'Georgia',serif;font-size:24px;font-weight:600;">Nouveau message du site</h1>
          <p style="margin:10px 0 0 0;color:#c3826e;font-size:14px;">A Rythme Ethic — Formulaire de contact</p>
        </td></tr>
        <tr><td style="padding:30px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
            ${detailRowsHtml}
          </table>
          <h3 style="margin:24px 0 8px 0;color:#6e3a25;font-size:15px;">Message :</h3>
          <div style="padding:14px 16px;background-color:#f9f3ee;border-radius:8px;color:#7b4a31;font-size:14px;line-height:1.6;white-space:pre-wrap;">${messageHtml || '<em>Aucun message</em>'}</div>
        </td></tr>
        <tr><td style="padding:20px 40px;background-color:#f9f3ee;border-radius:0 0 16px 16px;text-align:center;">
          <p style="margin:0;color:#a97761;font-size:12px;">Notification automatique envoyée depuis arythmeethic.fr</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `.trim();

    const subject =
      `Nouveau message du site — ${clientTypeLabels[clientType] || clientType} : ${firstName || ''} ${lastName || ''}`.trim();

    try {
      const result = await sendBrevoEmail({ to: notifTo, subject, htmlContent });
      if (!result.ok) {
        console.error('Notification email to Florence failed:', result.error);
      }
    } catch (notifErr) {
      console.error('Notification email to Florence threw:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Message envoyé avec succès',
      clientId: newClient?.id,
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}
