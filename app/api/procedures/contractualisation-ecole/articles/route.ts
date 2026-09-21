import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { buildContractEcoleArticles } from '@/lib/contract-ecole-articles';

/**
 * Renvoie le texte par défaut des articles du contrat pour un client donné.
 * Utilisé par la popup de contractualisation pour permettre la modification
 * article par article avant l'aperçu et l'envoi pour signature.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const anneeScolaire = searchParams.get('anneeScolaire');
    const tarifHoraireHT = searchParams.get('tarifHoraireHT');

    if (!clientId || !anneeScolaire) {
      return NextResponse.json(
        { success: false, error: 'Paramètres requis manquants' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error || !client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    const parsedTarif = tarifHoraireHT ? parseFloat(tarifHoraireHT) : NaN;
    const articles = buildContractEcoleArticles({
      client,
      anneeScolaire,
      tarifHoraireHT: Number.isFinite(parsedTarif) ? parsedTarif : undefined,
    });

    return NextResponse.json({ success: true, articles });
  } catch (err) {
    console.error('Contract articles error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
