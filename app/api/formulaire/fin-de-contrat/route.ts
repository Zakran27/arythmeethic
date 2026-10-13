import { NextRequest, NextResponse } from 'next/server';
import { getDocumentProxy } from 'unpdf';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  FDC_KINDS as REQUIRED_KINDS,
  FDC_LABELS as KIND_LABELS,
  FDC_FILENAMES as KIND_FILENAMES,
  type FdcKind as DocKind,
} from '@/lib/fin-de-contrat';
import { startFinDeContratSignatures } from '@/lib/fin-de-contrat-signatures';

// Le 3e dépôt lance les 3 signatures DocuSeal (téléchargement + création des soumissions)
export const maxDuration = 60;

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET — info procedure (state of uploaded docs) for the form page
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token requis' }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const { data: procedure } = await supabase
      .from('procedures')
      .select('id, client_id, download_token_expires_at, status, procedure_types!inner(code)')
      .eq('download_token', token)
      .eq('procedure_types.code', 'FIN_DE_CONTRAT') // token d'une autre procédure → lien invalide
      .single();
    if (!procedure) {
      return NextResponse.json({ success: false, error: 'Lien invalide' }, { status: 404 });
    }
    if (procedure.download_token_expires_at) {
      const expiresAt = new Date(procedure.download_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({ success: false, error: 'Lien expiré' }, { status: 410 });
      }
    }
    const labelToKind: Record<string, DocKind> = Object.fromEntries(
      (Object.entries(KIND_LABELS) as [DocKind, string][]).map(([k, label]) => [label, k])
    );
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title, original_filename, created_at')
      .eq('procedure_id', procedure.id)
      .eq('kind', 'SUPPORTING_DOC')
      .in('title', Object.values(KIND_LABELS));

    const uploaded: Record<DocKind, { filename: string; uploadedAt: string } | null> = {
      FIN_DE_CONTRAT_SOLDE_TOUT_COMPTE: null,
      FIN_DE_CONTRAT_ATTESTATION_EMPLOYEUR: null,
      FIN_DE_CONTRAT_CERTIFICAT_TRAVAIL: null,
    };
    for (const d of docs ?? []) {
      const k = labelToKind[d.title];
      if (k) {
        uploaded[k] = { filename: d.original_filename || 'document.pdf', uploadedAt: d.created_at };
      }
    }
    return NextResponse.json({
      success: true,
      procedureId: procedure.id,
      status: procedure.status,
      required: REQUIRED_KINDS.map(k => ({ kind: k, label: KIND_LABELS[k] })),
      uploaded,
    });
  } catch (err) {
    console.error('Error fetching fin-de-contrat info:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — upload a document
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const token = formData.get('token') as string | null;
    const kind = formData.get('kind') as DocKind | null;
    const file = formData.get('file') as File | null;
    if (!token || !kind || !file) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants' }, { status: 400 });
    }
    if (!REQUIRED_KINDS.includes(kind)) {
      return NextResponse.json(
        { success: false, error: 'Type de document inconnu' },
        { status: 400 }
      );
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Fichier trop volumineux (max 20 Mo)' },
        { status: 400 }
      );
    }
    // PDF uniquement (signature électronique) : extension, signature %PDF- et fichier lisible
    const buffer = Buffer.from(await file.arrayBuffer());
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') &&
      buffer.subarray(0, 1024).includes('%PDF-') &&
      (await getDocumentProxy(new Uint8Array(buffer)).then(
        () => true,
        () => false
      ));
    if (!isPdf) {
      return NextResponse.json(
        { success: false, error: 'Format non accepté : merci d’envoyer un fichier PDF lisible.' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: procedure } = await supabase
      .from('procedures')
      .select('id, client_id, download_token_expires_at, status, procedure_types!inner(code)')
      .eq('download_token', token)
      .eq('procedure_types.code', 'FIN_DE_CONTRAT') // token d'une autre procédure → lien invalide
      .single();
    if (!procedure) {
      return NextResponse.json({ success: false, error: 'Lien invalide' }, { status: 404 });
    }
    if (procedure.download_token_expires_at) {
      const expiresAt = new Date(procedure.download_token_expires_at);
      if (expiresAt < new Date()) {
        return NextResponse.json({ success: false, error: 'Lien expiré' }, { status: 410 });
      }
    }
    // Les 3 documents déjà reçus (signatures lancées) : plus de remplacement possible
    if (procedure.status !== 'DRAFT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Les documents ont déjà été transmis. Contactez Florence pour toute modification.',
        },
        { status: 409 }
      );
    }

    // Fetch jeune name to build a clean filename
    const { data: client } = await supabase
      .from('clients')
      .select('first_name_jeune, last_name_jeune')
      .eq('id', procedure.client_id)
      .single();
    const jeuneSlug = client
      ? slugify(`${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim())
      : '';

    const ext = 'pdf';
    const cleanBase = jeuneSlug ? `${KIND_FILENAMES[kind]}-${jeuneSlug}` : KIND_FILENAMES[kind];
    const cleanFilename = `${cleanBase}.${ext}`;
    const storagePath = `fin-de-contrat/${procedure.client_id}/${procedure.id}/${cleanBase}_${Date.now()}.${ext}`;

    // Remove previous version of the same doc-type for this procedure (matched by title)
    const { data: existing } = await supabase
      .from('documents')
      .select('id, storage_path')
      .eq('procedure_id', procedure.id)
      .eq('kind', 'SUPPORTING_DOC')
      .eq('title', KIND_LABELS[kind]);
    for (const d of existing ?? []) {
      if (d.storage_path) {
        await supabase.storage.from('client-files').remove([d.storage_path]);
      }
      await supabase.from('documents').delete().eq('id', d.id);
    }

    const { error: uploadError } = await supabase.storage
      .from('client-files')
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ success: false, error: 'Erreur upload' }, { status: 500 });
    }

    const { error: insertError } = await supabase.from('documents').insert({
      procedure_id: procedure.id,
      client_id: procedure.client_id,
      kind: 'SUPPORTING_DOC',
      title: KIND_LABELS[kind],
      storage_path: storagePath,
      original_filename: file.name,
      uploaded_by: 'CLIENT',
    });
    if (insertError) {
      console.error('Document insert error:', insertError);
      await supabase.storage.from('client-files').remove([storagePath]);
      return NextResponse.json(
        { success: false, error: 'Erreur enregistrement document' },
        { status: 500 }
      );
    }

    // Refresh procedure updated_at so the relance cooldown restarts at each upload
    await supabase
      .from('procedures')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', procedure.id);

    // Les 3 documents reçus → signatures électroniques (SIGN_REQUESTED). Passage conditionnel depuis
    // DRAFT : deux derniers dépôts simultanés ne lancent les signatures qu'une fois.
    const { data: allDocs } = await supabase
      .from('documents')
      .select('title')
      .eq('procedure_id', procedure.id)
      .eq('kind', 'SUPPORTING_DOC')
      .in('title', Object.values(KIND_LABELS));
    const uploadedTitles = new Set((allDocs ?? []).map(d => d.title));
    const allDone = REQUIRED_KINDS.every(k => uploadedTitles.has(KIND_LABELS[k]));
    if (allDone) {
      const { data: moved } = await supabase
        .from('procedures')
        .update({ status: 'SIGN_REQUESTED', updated_at: new Date().toISOString() })
        .eq('id', procedure.id)
        .eq('status', 'DRAFT')
        .select('id');
      if (moved?.length) {
        await supabase.from('procedure_status_history').insert({
          procedure_id: procedure.id,
          status: 'FORMULAIRE_REMPLI',
        });
        // Erreurs (DocuSeal, PDF illisible…) : re-tentées par le cron quotidien des signatures
        const errors = await startFinDeContratSignatures(procedure.id).catch(e => [String(e)]);
        if (errors.length) console.error('[fin-de-contrat] signatures :', procedure.id, errors);
      }
    }

    return NextResponse.json({ success: true, allDone });
  } catch (err) {
    console.error('Error uploading fin-de-contrat doc:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
