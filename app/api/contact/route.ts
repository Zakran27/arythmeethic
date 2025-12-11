import { NextRequest, NextResponse } from 'next/server';

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
    } = body;

    // Map client types to French labels
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

    // TODO: Implement actual email sending
    // For now, we'll use a simple fetch to a hypothetical email service
    // You can integrate with SendGrid, Resend, or n8n webhook

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

    // Simulate sending to Florence's email
    // In production, integrate with your email service or n8n
    const emailTo = 'Florence.LOUAZEL@arythmeethic.onmicrosoft.com';

    // If using n8n, you could POST to a webhook:
    // const n8nWebhook = process.env.N8N_WEBHOOK_CONTACT;
    // if (n8nWebhook) {
    //   await fetch(n8nWebhook, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ to: emailTo, subject: 'Nouveau contact A Rythme Ethic', content: emailContent }),
    //   });
    // }

    return NextResponse.json({
      success: true,
      message: 'Message envoyé avec succès',
    });
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}
