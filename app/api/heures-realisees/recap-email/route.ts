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
  page.drawText(`Récapitulatif des heures - ${moisLabel}`, { x: margin, y, size: 12, font, color: rgb(0.3, 0.3, 0.3) });
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
  page.drawText('Florence Louazel - A Rythme Ethic', { x: margin, y, size: 10, font: fontBold, color: rgb(0.4, 0.2, 0.1) });

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
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif; background-color: #fafafa;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(to bottom, #f9f3ee, #efe3d7); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #6e3a25; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600;">A Rythme Ethic</h1>
              <p style="margin: 10px 0 0 0; color: #c3826e; font-size: 16px;">Accompagnement humain et bienveillant</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">Bonjour,</p>
              <p style="margin: 0 0 24px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Veuillez trouver ci-joint le récapitulatif des heures pour <strong>${entry.clientName}</strong> - <strong>${moisLabel}</strong>.
              </p>
              <!-- Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 15px;">
                <thead>
                  <tr style="background: linear-gradient(to bottom, #f9f3ee, #efe3d7);">
                    <th style="padding: 12px 16px; text-align: left; color: #6e3a25; font-weight: 600; border-bottom: 2px solid #e2cbb8;">Poste</th>
                    <th style="padding: 12px 16px; text-align: right; color: #6e3a25; font-weight: 600; border-bottom: 2px solid #e2cbb8;">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">Heures réalisées (${entry.heures} h × ${entry.tarifHoraire} €/h)</td>
                    <td style="padding: 12px 16px; text-align: right; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">${montantHeures} €</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">Frais de déplacement (${entry.km} km × ${entry.baremeKm} €/km)</td>
                    <td style="padding: 12px 16px; text-align: right; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">${montantKm} €</td>
                  </tr>
                  <tr style="background-color: #f9f3ee;">
                    <td style="padding: 14px 16px; color: #6e3a25; font-weight: 700;">Total</td>
                    <td style="padding: 14px 16px; text-align: right; color: #6e3a25; font-weight: 700;">${total} €</td>
                  </tr>
                </tbody>
              </table>
              <p style="margin: 28px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Le récapitulatif complet est également disponible en pièce jointe (PDF).
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f3ee; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #6e3a25; font-size: 14px; font-weight: 600;">Florence Louazel</p>
              <p style="margin: 5px 0 0 0; color: #a97761; font-size: 13px;">A Rythme Ethic</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

      const emailPayload = {
        sender: { name: 'A Rythme Ethic', email: process.env.BREVO_SENDER_EMAIL || 'noreply@arythmeethic.fr' },
        to: [{ email: entry.parentEmail }],
        subject: `Récapitulatif heures - ${entry.clientName} - ${moisLabel}`,
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
