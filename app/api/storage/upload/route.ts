import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const procedureId = formData.get('procedureId') as string;
    const title = formData.get('title') as string;
    const kind = (formData.get('kind') as string) || 'SUPPORTING_DOC';
    const uploadedBy = (formData.get('uploadedBy') as string) || 'ADMIN';

    if (!file || !procedureId || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const path = `procedure/${procedureId}/${filename}`;

    // Upload to storage
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('client-files')
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      throw uploadError;
    }

    // Insert document record
    const { error: insertError } = await supabase.from('documents').insert({
      procedure_id: procedureId,
      title,
      kind,
      storage_path: path,
      uploaded_by: uploadedBy,
    });

    if (insertError) {
      console.error('Document insert error:', insertError);
      throw insertError;
    }

    // Log to audit
    await supabase.from('audit_log').insert({
      source: 'admin',
      event: 'DOC_UPLOADED',
      payload: { procedureId, title, kind, path },
    });

    return NextResponse.json({ ok: true, path });
  } catch (error) {
    console.error('Error in storage upload:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
