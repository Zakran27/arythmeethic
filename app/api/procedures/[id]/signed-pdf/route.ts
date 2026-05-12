import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

const DOCUSEAL_API_URL = 'https://api.docuseal.com';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const apiKey = process.env.DOCUSEAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'DOCUSEAL_API_KEY non configurée' }, { status: 500 });
    }

    const supabase = createServiceRoleClient();
    const { data: procedure, error } = await supabase
      .from('procedures')
      .select('id, docuseal_submission_id, client_id')
      .eq('id', id)
      .single();

    if (error || !procedure) {
      return NextResponse.json({ success: false, error: 'Procédure introuvable' }, { status: 404 });
    }
    const submissionId = procedure.docuseal_submission_id;
    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'Aucune signature associée à cette procédure' },
        { status: 404 }
      );
    }

    const res = await fetch(`${DOCUSEAL_API_URL}/submissions/${submissionId}`, {
      headers: { 'X-Auth-Token': apiKey },
    });
    if (!res.ok) {
      const txt = await res.text();
      console.error('[DocuSeal] fetch submission failed', res.status, txt);
      return NextResponse.json(
        { success: false, error: 'Erreur DocuSeal' },
        { status: 502 }
      );
    }
    const submission = await res.json();

    // DocuSeal: completed when all submitters have signed. Status field == "completed".
    if (submission.status !== 'completed') {
      return NextResponse.json(
        {
          success: false,
          error: 'Le contrat n\'est pas encore signé par toutes les parties.',
          status: submission.status,
        },
        { status: 409 }
      );
    }

    // The signed document URL is in documents[0].url (or audit_log_url for the audit trail)
    const docs = submission.documents ?? [];
    if (docs.length === 0 || !docs[0].url) {
      return NextResponse.json(
        { success: false, error: 'PDF signé indisponible' },
        { status: 404 }
      );
    }

    const pdfRes = await fetch(docs[0].url);
    if (!pdfRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Téléchargement du PDF impossible' },
        { status: 502 }
      );
    }
    const buf = new Uint8Array(await pdfRes.arrayBuffer());
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contrat_signe_${id}.pdf"`,
      },
    });
  } catch (err) {
    console.error('Error downloading signed PDF:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
