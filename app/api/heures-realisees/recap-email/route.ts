import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createServiceRoleClient } from '@/lib/supabase-server';

interface RecapEntryInput {
  clientId: string;
  clientName: string;
  parentEmail: string;
  mois: string; // 'YYYY-MM' or 'YYYY-MM-DD'
  heures: string;
  tarifHoraire: string;
  km: string;
  baremeKm: string;
}

interface RecapData {
  clientName: string;
  moisLabel: string;
  moisIso: string; // 'YYYY-MM-DD' first day of month
  heuresMois: number;
  tarifHoraire: number;
  km: number;
  baremeKm: number;
  reportIn: number; // heures de report intégrées dans ce mois
  montantHeures: number; // (heures + report) × tarif
  montantKm: number;
  total: number;
}

function normalizeMois(mois: string): string {
  // Accepts 'YYYY-MM' or 'YYYY-MM-DD', returns 'YYYY-MM-01'
  const [y, m] = String(mois).split('-');
  return `${y}-${m}-01`;
}

function moisLabelFr(moisIso: string): string {
  return new Date(moisIso + 'T00:00:00').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

async function generateRecapPDF(d: RecapData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 460]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const totalHeuresFacturees = d.heuresMois + d.reportIn;
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  page.drawText('A Rythme Ethic', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.1),
  });
  y -= 24;
  page.drawText(`Récapitulatif des heures - ${d.moisLabel}`, {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 30;

  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.7, 0.6),
  });
  y -= 24;

  page.drawText(`Client : ${d.clientName}`, {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= 30;

  const col1 = margin;
  const col2 = 260;
  const col3 = 440;
  const rowH = 22;

  const rows: [string, string, string][] = [
    [
      'Heures réalisées',
      `${d.heuresMois} h × ${d.tarifHoraire.toFixed(2)} €/h`,
      `${(d.heuresMois * d.tarifHoraire).toFixed(2)} €`,
    ],
  ];
  if (d.reportIn > 0) {
    rows.push([
      'Heures reportées (mois précédent)',
      `${d.reportIn} h × ${d.tarifHoraire.toFixed(2)} €/h`,
      `${(d.reportIn * d.tarifHoraire).toFixed(2)} €`,
    ]);
  }
  rows.push([
    'Frais de déplacement',
    `${d.km} km × ${d.baremeKm.toFixed(3)} €/km`,
    `${d.montantKm.toFixed(2)} €`,
  ]);

  page.drawRectangle({
    x: col1 - 4,
    y: y - 4,
    width: width - margin * 2 + 8,
    height: rowH,
    color: rgb(0.95, 0.9, 0.85),
  });
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
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.7, 0.6),
  });
  y -= 20;

  page.drawText('Total', { x: col1, y, size: 12, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`${d.total.toFixed(2)} €`, {
    x: col3,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.1),
  });
  y -= 30;

  if (d.reportIn > 0) {
    page.drawText(
      `Total heures facturées ce mois : ${totalHeuresFacturees} h (${d.heuresMois} h réalisées + ${d.reportIn} h reportées)`,
      { x: margin, y, size: 9, font, color: rgb(0.45, 0.45, 0.45) }
    );
    y -= 24;
  }

  page.drawText('Cordialement,', { x: margin, y, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 16;
  page.drawText('Florence Louazel - A Rythme Ethic', {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.4, 0.2, 0.1),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function buildEmailHtml(d: RecapData): string {
  const reportRow =
    d.reportIn > 0
      ? `<tr>
                <td style="padding: 12px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">
                  + Heures reportées du mois précédent (${d.reportIn} h × ${d.tarifHoraire.toFixed(2)} €/h)
                </td>
                <td style="padding: 12px 16px; text-align: right; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">
                  ${(d.reportIn * d.tarifHoraire).toFixed(2)} €
                </td>
              </tr>`
      : '';

  return `
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
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(to bottom, #f9f3ee, #efe3d7); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #6e3a25; font-family: 'Georgia', serif; font-size: 28px; font-weight: 600;">A Rythme Ethic</h1>
              <p style="margin: 10px 0 0 0; color: #c3826e; font-size: 16px;">Accompagnement humain et bienveillant</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">Bonjour,</p>
              <p style="margin: 0 0 24px 0; color: #7b4a31; font-size: 16px; line-height: 1.6;">
                Veuillez trouver ci-joint le récapitulatif des heures pour <strong>${d.clientName}</strong> - <strong>${d.moisLabel}</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 15px;">
                <thead>
                  <tr style="background: linear-gradient(to bottom, #f9f3ee, #efe3d7);">
                    <th style="padding: 12px 16px; text-align: left; color: #6e3a25; font-weight: 600; border-bottom: 2px solid #e2cbb8;">Poste</th>
                    <th style="padding: 12px 16px; text-align: right; color: #6e3a25; font-weight: 600; border-bottom: 2px solid #e2cbb8;">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 12px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">Heures réalisées (${d.heuresMois} h × ${d.tarifHoraire.toFixed(2)} €/h)</td>
                    <td style="padding: 12px 16px; text-align: right; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">${(d.heuresMois * d.tarifHoraire).toFixed(2)} €</td>
                  </tr>
                  ${reportRow}
                  <tr>
                    <td style="padding: 12px 16px; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">Frais de déplacement (${d.km} km × ${d.baremeKm.toFixed(3)} €/km)</td>
                    <td style="padding: 12px 16px; text-align: right; color: #7b4a31; border-bottom: 1px solid #f0e4d8;">${d.montantKm.toFixed(2)} €</td>
                  </tr>
                  <tr style="background-color: #f9f3ee;">
                    <td style="padding: 14px 16px; color: #6e3a25; font-weight: 700;">Total</td>
                    <td style="padding: 14px 16px; text-align: right; color: #6e3a25; font-weight: 700;">${d.total.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
              <p style="margin: 28px 0 0 0; color: #a97761; font-size: 14px; line-height: 1.6;">
                Le récapitulatif complet est également disponible en pièce jointe (PDF).
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; background-color: #f9f3ee; border-radius: 0 0 16px 16px; text-align: center;">
              <a href="https://arythmeethic.fr" style="text-decoration:none;color:inherit;display:block;">
                <p style="margin: 0; color: #6e3a25; font-size: 14px; font-weight: 600;">Florence Louazel</p>
                <p style="margin: 5px 0 0 0; color: #a97761; font-size: 13px;">A Rythme Ethic</p>
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries: RecapEntryInput[] = body.entries || [];

    const brevoApiKey = process.env.BREVO_API_KEY;
    if (!brevoApiKey) {
      return NextResponse.json(
        { success: false, error: 'BREVO_API_KEY non configurée' },
        { status: 500 }
      );
    }

    if (!entries.length) {
      return NextResponse.json({ success: false, error: 'Aucune entrée fournie' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const results: { clientId: string; mois: string; ok: boolean; error?: string }[] = [];

    for (const entry of entries) {
      const moisIso = normalizeMois(entry.mois);

      if (!entry.parentEmail) {
        results.push({
          clientId: entry.clientId,
          mois: moisIso,
          ok: false,
          error: 'Email parent manquant',
        });
        continue;
      }

      // Fetch this client's full history up to and including the target month, to compute the
      // running carry-over balance.
      const { data: history, error: histErr } = await supabase
        .from('heures_realisees')
        .select('mois, temps_a_reporter, report_in')
        .eq('client_id', entry.clientId)
        .lte('mois', moisIso);

      if (histErr) {
        console.error('Error fetching heures history:', histErr);
        results.push({
          clientId: entry.clientId,
          mois: moisIso,
          ok: false,
          error: 'Erreur lecture historique',
        });
        continue;
      }

      // balance = sum(temps_a_reporter for mois <= N) - sum(report_in for mois < N)
      // The current month's report_in is what we're about to compute.
      let sumReporter = 0;
      let sumPriorReportIn = 0;
      for (const row of history ?? []) {
        const reporter = Number(row.temps_a_reporter ?? 0);
        const reportInPrev = Number(row.report_in ?? 0);
        sumReporter += reporter;
        if (String(row.mois) !== moisIso) {
          sumPriorReportIn += reportInPrev;
        }
      }
      const balance = sumReporter - sumPriorReportIn;
      const reportIn = balance >= 1 ? Math.floor(balance) : 0;

      const heuresMois = parseFloat(entry.heures) || 0;
      const tarifHoraire = parseFloat(entry.tarifHoraire) || 0;
      const km = parseFloat(entry.km) || 0;
      const baremeKm = parseFloat(entry.baremeKm) || 0;
      const montantHeures = (heuresMois + reportIn) * tarifHoraire;
      const montantKm = km * baremeKm;
      const total = montantHeures + montantKm;

      const recap: RecapData = {
        clientName: entry.clientName,
        moisLabel: moisLabelFr(moisIso),
        moisIso,
        heuresMois,
        tarifHoraire,
        km,
        baremeKm,
        reportIn,
        montantHeures,
        montantKm,
        total,
      };

      let pdfBase64: string;
      try {
        const pdfBuffer = await generateRecapPDF(recap);
        pdfBase64 = pdfBuffer.toString('base64');
      } catch (pdfErr) {
        console.error('Error generating recap PDF:', pdfErr);
        results.push({
          clientId: entry.clientId,
          mois: moisIso,
          ok: false,
          error: 'Erreur génération PDF',
        });
        continue;
      }

      const htmlContent = buildEmailHtml(recap);

      const moisShort = moisIso.slice(0, 7);
      const emailPayload = {
        sender: {
          name: 'A Rythme Ethic',
          email: process.env.BREVO_SENDER_EMAIL || 'florence.louazel@arythmeethic.fr',
        },
        to: [{ email: entry.parentEmail }],
        subject: `Récapitulatif heures - ${entry.clientName} - ${recap.moisLabel}`,
        htmlContent,
        attachment: [
          {
            content: pdfBase64,
            name: `recap_heures_${entry.clientName.replace(/\s+/g, '_')}_${moisShort}.pdf`,
          },
        ],
      };

      console.log(
        `[Brevo] Envoi pour ${entry.clientName} (${recap.moisLabel}) → ${entry.parentEmail}`
      );

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[Brevo] Erreur pour ${entry.clientId} (${entry.clientName}):`, errBody);
        results.push({ clientId: entry.clientId, mois: moisIso, ok: false, error: errBody });
        continue;
      }

      const okBody = await res.json().catch(() => ({}));
      console.log(`[Brevo] Succès:`, JSON.stringify(okBody));

      // Persist the recap state on the heures_realisees row for this month.
      const { error: updateErr } = await supabase
        .from('heures_realisees')
        .update({
          recap_email_sent_at: new Date().toISOString(),
          recap_email_to: entry.parentEmail,
          report_in: reportIn,
        })
        .eq('client_id', entry.clientId)
        .eq('mois', moisIso);

      if (updateErr) {
        console.error('Error updating heures_realisees recap status:', updateErr);
        // Email was sent — surface as success but log the persistence failure.
      }

      results.push({ clientId: entry.clientId, mois: moisIso, ok: true });
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
