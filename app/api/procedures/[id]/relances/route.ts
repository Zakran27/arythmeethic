import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { hasAutoRelances, canCancelSignature } from '@/lib/relances';
import { cancelContractSignature } from '@/lib/signatures';

// Fiche client (admin, session exigée par middleware.ts) :
//  - stop / resume : suspend ou reprend les relances automatiques (le lien envoyé reste valable) ;
//  - cancel-signature : contrat seulement, lien DocuSeal désactivé (définitif).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action } = (await request.json()) as { action?: string };
    const supabase = createServiceRoleClient();
    const { data: proc } = await supabase
      .from('procedures')
      .select(
        'id, status, deadline_at, docuseal_submission_id, procedure_type:procedure_types(code)'
      )
      .eq('id', id)
      .single<{
        id: string;
        status: string;
        deadline_at: string | null;
        docuseal_submission_id: string | null;
        procedure_type: { code: string } | null;
      }>();
    if (!proc) {
      return NextResponse.json({ success: false, error: 'Procédure introuvable' }, { status: 404 });
    }

    if (action === 'stop' || action === 'resume') {
      if (!hasAutoRelances(proc)) {
        return NextResponse.json(
          { success: false, error: 'Cette procédure n’a pas de relance en cours' },
          { status: 400 }
        );
      }
      const { error } = await supabase
        .from('procedures')
        .update({ relances_stoppees: action === 'stop' })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'cancel-signature') {
      if (!canCancelSignature(proc)) {
        return NextResponse.json(
          { success: false, error: 'Aucune signature en attente pour ce contrat' },
          { status: 400 }
        );
      }
      const result = await cancelContractSignature(proc);
      return NextResponse.json(result, { status: result.success ? 200 : 409 });
    }

    return NextResponse.json({ success: false, error: 'Action inconnue' }, { status: 400 });
  } catch (err) {
    console.error('Error updating relances:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
