import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { generateContractPDF } from '@/lib/pdf-contract-generator';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const clientId = formData.get('clientId') as string | null;
    const anneeScolaire = formData.get('anneeScolaire') as string | null;
    const tarifHoraireHT = formData.get('tarifHoraireHT') as string | null;
    const annexes = formData.getAll('annexes') as File[];

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

    // Merge annexes (if any) into a single PDF for preview
    let finalBytes: Uint8Array;
    if (annexes.length === 0) {
      finalBytes = new Uint8Array(buffer);
    } else {
      const merged = await PDFDocument.load(buffer);
      for (const f of annexes) {
        if (!f || typeof (f as File).arrayBuffer !== 'function') continue;
        try {
          const ab = await (f as File).arrayBuffer();
          const annex = await PDFDocument.load(ab);
          const pages = await merged.copyPages(annex, annex.getPageIndices());
          pages.forEach(p => merged.addPage(p));
        } catch (e) {
          console.warn('Annexe ignorée (PDF invalide ?):', (f as File).name, e);
        }
      }
      finalBytes = await merged.save();
    }

    return new NextResponse(finalBytes as BodyInit, {
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
