import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';
import { fetcher } from '@/lib/fetcher';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId, required = [] } = body;

    if (!procedureId) {
      return NextResponse.json({ error: 'procedureId is required' }, { status: 400 });
    }

    // Generate upload token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update procedure with token
    const supabase = createServiceRoleClient();
    await supabase
      .from('procedures')
      .update({
        upload_token: token,
        upload_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', procedureId);

    // Log to audit
    await supabase.from('audit_log').insert({
      source: 'admin',
      event: 'DOCS_REQUESTED',
      payload: { procedureId, required },
    });

    // Call n8n webhook (for email notification, etc.)
    const uploadUrl = `${serverEnv.NEXT_PUBLIC_SITE_URL}/deposit/${token}`;

    if (serverEnv.N8N_WEBHOOK_REQUEST_DOCS) {
      await fetcher(serverEnv.N8N_WEBHOOK_REQUEST_DOCS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedureId, required, uploadUrl }),
      });
    }

    return NextResponse.json({
      ok: true,
      uploadUrl,
      expiresAt: expiresAt.toISOString(),
    });
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
