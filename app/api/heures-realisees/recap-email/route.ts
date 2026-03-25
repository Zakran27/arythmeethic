import { NextRequest, NextResponse } from 'next/server';

interface RecapEntry {
  clientId: string;
  clientName: string;
  parentEmail: string;
  heures: string;
  tarifHoraire: string;
  km: string;
  baremeKm: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mois, entries }: { mois: string; entries: RecapEntry[] } = body;

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return NextResponse.json(
        { success: false, error: 'BREVO_API_KEY non configurée' },
        { status: 500 }
      );
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucune entrée fournie' }, { status: 400 });
    }

    const moisLabel = new Date(mois + '-01T00:00:00').toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });

    const results: { clientId: string; ok: boolean; error?: string }[] = [];

    for (const entry of entries) {
      if (!entry.parentEmail) {
        results.push({ clientId: entry.clientId, ok: false, error: 'Email parent manquant' });
        continue;
      }

      const montantHeures = (parseFloat(entry.heures) * parseFloat(entry.tarifHoraire)).toFixed(2);
      const montantKm = (parseFloat(entry.km) * parseFloat(entry.baremeKm)).toFixed(2);
      const total = (parseFloat(montantHeures) + parseFloat(montantKm)).toFixed(2);

      const textContent = [
        `Bonjour,`,
        ``,
        `Voici le récapitulatif des heures pour ${entry.clientName} — ${moisLabel} :`,
        ``,
        `Heures réalisées : ${entry.heures}h × ${entry.tarifHoraire} €/h = ${montantHeures} €`,
        `Frais de déplacement : ${entry.km} km × ${entry.baremeKm} €/km = ${montantKm} €`,
        ``,
        `Total : ${total} €`,
        ``,
        `Cordialement,`,
        `Florence — A Rythme Ethic`,
      ].join('\n');

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'A Rythme Ethic', email: 'florence.louazel@ARythmeEthic.onmicrosoft.com' },
          to: [{ email: entry.parentEmail }],
          subject: `Récapitulatif heures — ${entry.clientName} — ${moisLabel}`,
          textContent,
        }),
      });

      if (res.ok) {
        results.push({ clientId: entry.clientId, ok: true });
      } else {
        const errBody = await res.text();
        results.push({ clientId: entry.clientId, ok: false, error: errBody });
      }
    }

    const allOk = results.every(r => r.ok);
    const failed = results.filter(r => !r.ok);

    return NextResponse.json({
      success: allOk,
      results,
      message: failed.length > 0 ? `${failed.length} email(s) non envoyé(s)` : undefined,
    });
  } catch (error) {
    console.error('Error sending recap emails:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
