import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId } = body;

    if (!procedureId) {
      return NextResponse.json({ error: 'procedureId is required' }, { status: 400 });
    }

    // TODO: Implement file upload workflow in V2
    // This endpoint will handle document uploads and post-processing
    return NextResponse.json(
      {
        ok: false,
        message: 'Upload workflow not yet implemented',
        procedureId,
      },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error in upload webhook:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
