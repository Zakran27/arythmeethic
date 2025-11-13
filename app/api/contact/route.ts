import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientType, name, email, phone, message } = body;

    // Map client types to French labels
    const clientTypeLabels: Record<string, string> = {
      student: 'Jeune / Élève',
      parent: 'Parent',
      school: 'École / Centre de formation',
    };

    // Construct email content
    const emailContent = `
Nouveau message depuis A Rythme Ethic

Type de client: ${clientTypeLabels[clientType] || clientType}
Nom: ${name}
Email: ${email}
Téléphone: ${phone || 'Non renseigné'}

Message:
${message}
    `.trim();

    // TODO: Implement actual email sending
    // For now, we'll use a simple fetch to a hypothetical email service
    // You can integrate with SendGrid, Resend, or n8n webhook
    
    console.log('Contact form submission:', {
      clientType,
      name,
      email,
      phone,
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
