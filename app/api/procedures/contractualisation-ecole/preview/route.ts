import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { generateContractPDF } from '@/lib/pdf-contract-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, anneeScolaire, tarifHoraireHT } = body;
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
    const { buffer } = await generateContractPDF({
      client,
      anneeScolaire,
      tarifHoraireHT: tarifHoraireHT ? parseFloat(tarifHoraireHT) : undefined,
    });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="apercu_contrat.pdf"',
      },
    });
  } catch (err) {
    console.error('Preview PDF error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
