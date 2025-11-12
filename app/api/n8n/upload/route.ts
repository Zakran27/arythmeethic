import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';
import { fetcher } from '@/lib/fetcher';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId, title, kind, fileUrl, uploadedBy = 'ADMIN' } = body;

    if (!procedureId || !title || !kind) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log to audit
    const supabase = createServiceRoleClient();
    await supabase.from('audit_log').insert({
      source: uploadedBy.toLowerCase(),
      event: 'DOC_UPLOADED',
      payload: { procedureId, title, kind },
    });

    // Call n8n webhook (optional post-processing)
    if (!serverEnv.N8N_WEBHOOK_UPLOAD) {
      return NextResponse.json({ ok: true, message: 'Upload logged (webhook not configured)' });
    }
    const res = await fetcher(serverEnv.N8N_WEBHOOK_UPLOAD, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procedureId, title, kind, fileUrl, uploadedBy }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
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
