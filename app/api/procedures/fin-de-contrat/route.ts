import { NextRequest, NextResponse } from 'next/server';
import { launchFinDeContratProcedure } from '@/lib/fin-de-contrat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, recipientEmail, recipientFirstName, recipientLastName } = body;
    if (!clientId || !recipientEmail || !recipientFirstName) {
      return NextResponse.json(
        { success: false, error: 'Paramètres requis manquants' },
        { status: 400 }
      );
    }
    const recipientName = `${recipientFirstName} ${recipientLastName || ''}`.trim();
    const result = await launchFinDeContratProcedure({
      clientId,
      recipientEmail,
      recipientName,
    });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      success: true,
      procedureId: result.procedureId,
      message: 'Procédure de fin de contrat lancée',
    });
  } catch (err) {
    console.error('Error launching fin-de-contrat:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
