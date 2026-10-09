import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { anneeScolaire } from '@/lib/format';
import { findDraftProcedure } from '@/lib/procedures';

// Route PUBLIQUE (liste blanche /api/formulaire/ de middleware.ts) : tout passe par le token.
const fail = (error: string, status: number) =>
  NextResponse.json({ success: false, error }, { status });

const findProcedure = (token: unknown) =>
  findDraftProcedure<{ clients: { first_name_jeune: string | null } | null }>(
    token,
    'CONFIRMATION_ACCOMPAGNEMENT',
    'clients(first_name_jeune)'
  );

export async function GET(request: NextRequest) {
  const found = await findProcedure(request.nextUrl.searchParams.get('token'));
  if (!found.procedure) return fail(found.error, found.status);
  const { procedure } = found;
  return NextResponse.json({
    success: true,
    jeunePrenom: procedure.clients?.first_name_jeune || null,
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
    const found = await findProcedure(token);
    if (!found.procedure) return fail(found.error, found.status);
    const { procedure } = found;

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
