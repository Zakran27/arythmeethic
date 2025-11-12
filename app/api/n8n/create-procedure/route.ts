import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';
import { fetcher } from '@/lib/fetcher';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { procedureId, mode = 'full', contractVars } = body;

    // Validate input
    if (!procedureId) {
      return NextResponse.json({ error: 'procedureId is required' }, { status: 400 });
    }

    // Log to audit
    const supabase = createServiceRoleClient();
    await supabase.from('audit_log').insert({
      source: 'admin',
      event: 'PROC_CREATE_TRIGGERED',
      payload: { procedureId, mode },
    });

    // Call n8n webhook
    if (!serverEnv.N8N_WEBHOOK_CREATE_PROCEDURE) {
      return NextResponse.json({ error: 'n8n webhook not configured' }, { status: 501 });
    }
    const res = await fetcher(serverEnv.N8N_WEBHOOK_CREATE_PROCEDURE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ procedureId, mode, contractVars }),
    });

    const data = await res.json();

    // Update procedure status based on mode
    if (res.ok && data.ok) {
      const updates: any = {};
      if (mode === 'pdf_only') {
        updates.status = 'PDF_GENERATED';
      } else if (mode === 'yousign_only') {
        updates.status = 'SIGN_REQUESTED';
        if (data.yousign_procedure_id) {
          updates.yousign_procedure_id = data.yousign_procedure_id;
        }
        if (data.yousign_file_id) {
          updates.yousign_file_id = data.yousign_file_id;
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('procedures')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', procedureId);
      }
    }

    return NextResponse.json(data, { status: res.status });
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
