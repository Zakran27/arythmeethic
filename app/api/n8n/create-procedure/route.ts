import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId } = body;

    // Validate input
    if (!procedureId) {
      return NextResponse.json({ error: 'procedureId is required' }, { status: 400 });
    }

    // TODO: Implement workflow automation in V2
    // This endpoint will trigger contract generation and e-signature workflows
    return NextResponse.json(
      {
        ok: false,
        message: 'Workflow automation not yet implemented',
        procedureId,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in create-procedure:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
