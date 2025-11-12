import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId } = body;

    if (!procedureId) {
      return NextResponse.json({ error: 'procedureId is required' }, { status: 400 });
    }

    // TODO: Implement document request workflow in V2
    // This endpoint will generate upload tokens and send email notifications
    return NextResponse.json(
      {
        ok: false,
        message: 'Document request workflow not yet implemented',
        procedureId,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in request-docs:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
