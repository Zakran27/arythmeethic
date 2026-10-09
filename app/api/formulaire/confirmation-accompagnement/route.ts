import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { anneeScolaire } from '@/lib/format';

// Route PUBLIQUE (liste blanche /api/formulaire/ de middleware.ts) : tout passe par le token.
type Supabase = ReturnType<typeof createServiceRoleClient>;

const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

// Procédure DRAFT valide pour ce token, sinon la réponse d'erreur à renvoyer telle quelle.
async function findProcedure(supabase: Supabase, token: unknown) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) {
    return fail('Lien invalide', 404);
  }
  const { data: procedure } = await supabase
    .from('procedures')
    .select(
      'id, client_id, status, created_at, download_token_expires_at, procedure_types(code), clients(first_name_jeune)'
    )
    .eq('download_token', token)
    .maybeSingle();
  // Le token doit appartenir à CETTE procédure (pas à une fin de contrat, etc.)
  const type = procedure?.procedure_types as unknown as { code: string } | null;
  if (!procedure || type?.code !== 'CONFIRMATION_ACCOMPAGNEMENT') {
    return fail('Lien invalide', 404);
  }
  if (procedure.status === 'SIGNED') {
    return fail('Votre réponse a déjà été enregistrée. Merci !', 410);
  }
  if (
    procedure.status !== 'DRAFT' ||
    (procedure.download_token_expires_at &&
      new Date(procedure.download_token_expires_at) < new Date())
  ) {
    return fail("Ce lien n'est plus valide. Contactez-moi si besoin.", 410);
  }
  return procedure;
}

export async function GET(request: NextRequest) {
  const supabase = createServiceRoleClient();
  const procedure = await findProcedure(supabase, request.nextUrl.searchParams.get('token'));
  if (procedure instanceof NextResponse) return procedure;
  const client = procedure.clients as unknown as { first_name_jeune: string | null } | null;
  return NextResponse.json({
    success: true,
    jeunePrenom: client?.first_name_jeune || null,
    anneeScolaire: anneeScolaire(new Date(procedure.created_at)),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, confirme } = await request.json();
    if (typeof confirme !== 'boolean') {
      return fail('Réponse invalide', 400);
    }
    const supabase = createServiceRoleClient();
    const procedure = await findProcedure(supabase, token);
    if (procedure instanceof NextResponse) return procedure;

    // Clôture conditionnelle = un seul traitement même en cas de double clic (le lien devient invalide)
    const { data: claimed } = await supabase
      .from('procedures')
      .update({ status: 'SIGNED', updated_at: new Date().toISOString() })
      .eq('id', procedure.id)
      .eq('status', 'DRAFT')
      .select('id');
    if (!claimed?.length) {
      return fail('Votre réponse a déjà été enregistrée. Merci !', 410);
    }

    // « Oui » : la fiche passe en Client (décision de Thomas, 6 oct.)
    const { error } = await supabase
      .from('clients')
      .update({
        accompagnement_confirme: confirme,
        accompagnement_confirme_at: new Date().toISOString(),
        ...(confirme ? { client_status: 'Client' } : {}),
      })
      .eq('id', procedure.client_id);
    if (error) {
      console.error('Error saving confirmation-accompagnement:', error);
      // Rouvre le lien pour que la famille puisse réessayer
      await supabase.from('procedures').update({ status: 'DRAFT' }).eq('id', procedure.id);
      return fail('Erreur serveur', 500);
    }
    await supabase
      .from('procedure_status_history')
      .insert({ procedure_id: procedure.id, status: 'FORMULAIRE_REMPLI' });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in confirmation-accompagnement form:', err);
    return fail('Erreur serveur', 500);
  }
}
