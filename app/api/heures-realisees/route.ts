import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, mois, heures, tarifHoraire, km, baremeKm } = body;

    if (
      !clientId ||
      !mois ||
      heures == null ||
      tarifHoraire == null ||
      km == null ||
      baremeKm == null
    ) {
      return NextResponse.json(
        { success: false, error: 'Paramètres requis manquants' },
        { status: 400 }
      );
    }

    // Normalize mois to first day of month (YYYY-MM-01)
    const [year, month] = String(mois).split('-');
    const moisNormalized = `${year}-${month}-01`;

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('heures_realisees')
      .upsert(
        {
          client_id: clientId,
          mois: moisNormalized,
          heures: parseFloat(heures),
          tarif_horaire: parseFloat(tarifHoraire),
          km: parseFloat(km),
          bareme_km: parseFloat(baremeKm),
        },
        { onConflict: 'client_id,mois' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving heures realisees:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in heures-realisees route:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
