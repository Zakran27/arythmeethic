import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface RecapEntry {
  clientId: string;
  clientName: string;
  parentEmail: string;
  heures: string;
  tarifHoraire: string;
  km: string;
  baremeKm: string;
}

async function generateRecapPDF(entry: RecapEntry, moisLabel: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const montantHeures = (parseFloat(entry.heures) * parseFloat(entry.tarifHoraire)).toFixed(2);
  const montantKm = (parseFloat(entry.km) * parseFloat(entry.baremeKm)).toFixed(2);
  const total = (parseFloat(montantHeures) + parseFloat(montantKm)).toFixed(2);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Header
  page.drawText('A Rythme Ethic', { x: margin, y, size: 16, font: fontBold, color: rgb(0.4, 0.2, 0.1) });
  y -= 24;
  page.drawText(`Récapitulatif des heures — ${moisLabel}`, { x: margin, y, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
  y -= 30;

  // Divider
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.7, 0.6) });
  y -= 24;

  // Client name
  page.drawText(`Client : ${entry.clientName}`, { x: margin, y, size: 13, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  y -= 30;

  // Table rows
  const col1 = margin;
  const col2 = 280;
  const col3 = 420;
  const rowH = 22;

  const rows: [string, string, string][] = [
    ['Heures réalisées', `${entry.heures} h × ${entry.tarifHoraire} €/h`, `${montantHeures} €`],
    ['Frais de déplacement', `${entry.km} km × ${entry.baremeKm} €/km`, `${montantKm} €`],
  ];

  // Table header
  page.drawRectangle({ x: col1 - 4, y: y - 4, width: width - margin * 2 + 8, height: rowH, color: rgb(0.95, 0.9, 0.85) });
  page.drawText('Poste', { x: col1, y, size: 10, font: fontBold, color: rgb(0.3, 0.15, 0.05) });
  page.drawText('Détail', { x: col2, y, size: 10, font: fontBold, color: rgb(0.3, 0.15, 0.05) });
  page.drawText('Montant', { x: col3, y, size: 10, font: fontBold, color: rgb(0.3, 0.15, 0.05) });
  y -= rowH + 4;

  for (const [label, detail, montant] of rows) {
    page.drawText(label, { x: col1, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(detail, { x: col2, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(montant, { x: col3, y, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    y -= rowH;
  }

  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.7, 0.6) });
  y -= 20;

  // Total
  page.drawText('Total', { x: col1, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`${total} €`, { x: col3, y, size: 12, font: fontBold, color: rgb(0.4, 0.2, 0.1) });
  y -= 40;

  // Footer
  page.drawText('Cordialement,', { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 16;
  page.drawText('Florence Louazel — A Rythme Ethic', { x: margin, y, size: 10, font: fontBold, color: rgb(0.4, 0.2, 0.1) });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
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

      // Generate PDF
      let pdfBase64: string;
      try {
        const pdfBuffer = await generateRecapPDF(entry, moisLabel);
        pdfBase64 = pdfBuffer.toString('base64');
      } catch (pdfErr) {
        console.error('Error generating recap PDF:', pdfErr);
        results.push({ clientId: entry.clientId, ok: false, error: 'Erreur génération PDF' });
        continue;
      }

      const htmlContent = `
        <p>Bonjour,</p>
        <p>Veuillez trouver ci-joint le récapitulatif des heures pour <strong>${entry.clientName}</strong> — <strong>${moisLabel}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:500px;font-family:sans-serif;font-size:14px;">
          <thead>
            <tr style="background:#f5ede4;">
              <th style="padding:8px;text-align:left;border:1px solid #ddd;">Poste</th>
              <th style="padding:8px;text-align:right;border:1px solid #ddd;">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">Heures réalisées (${entry.heures}h × ${entry.tarifHoraire} €/h)</td>
              <td style="padding:8px;text-align:right;border:1px solid #ddd;">${montantHeures} €</td>
            </tr>
            <tr>
              <td style="padding:8px;border:1px solid #ddd;">Frais de déplacement (${entry.km} km × ${entry.baremeKm} €/km)</td>
              <td style="padding:8px;text-align:right;border:1px solid #ddd;">${montantKm} €</td>
            </tr>
            <tr style="font-weight:bold;background:#f5ede4;">
              <td style="padding:8px;border:1px solid #ddd;">Total</td>
              <td style="padding:8px;text-align:right;border:1px solid #ddd;">${total} €</td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:20px;">Cordialement,<br/><strong>Florence Louazel — A Rythme Ethic</strong></p>
      `;

      const emailPayload = {
        sender: { name: 'A Rythme Ethic', email: 'florence.louazel@ARythmeEthic.onmicrosoft.com' },
        to: [{ email: entry.parentEmail }],
        subject: `Récapitulatif heures — ${entry.clientName} — ${moisLabel}`,
        htmlContent,
        attachment: [
          {
            content: pdfBase64,
            name: `recap_heures_${entry.clientName.replace(/\s+/g, '_')}_${mois}.pdf`,
          },
        ],
      };

      console.log(`[Brevo] Envoi pour ${entry.clientName} → ${entry.parentEmail}`);
      console.log(`[Brevo] Expéditeur: ${emailPayload.sender.email}`);
      console.log(`[Brevo] Sujet: ${emailPayload.subject}`);

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      console.log(`[Brevo] Status HTTP: ${res.status} ${res.statusText}`);

      if (res.ok) {
        const okBody = await res.json().catch(() => ({}));
        console.log(`[Brevo] Succès:`, JSON.stringify(okBody));
        results.push({ clientId: entry.clientId, ok: true });
      } else {
        const errBody = await res.text();
        console.error(`[Brevo] Erreur pour ${entry.clientId} (${entry.clientName}):`, errBody);
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
