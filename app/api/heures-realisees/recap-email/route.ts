import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { getEmailTemplateOverride } from '@/lib/email-templates-server';
import { renderEmailShell, substituteVars, DEFAULT_TEMPLATE_CONTENT } from '@/lib/email-templates';
import { computeReports, formatHeures, moisLabel, normalizeMois } from '@/lib/heures-report';
import type { HeureRealisee } from '@/types';

// Les montants sont relus en base (jamais pris dans le payload).
interface RecapEntryInput {
  clientId: string;
  clientName: string;
  parentEmail: string;
  mois: string; // 'YYYY-MM' or 'YYYY-MM-DD'
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
  heuresAnnulation: number;
  montantAnnulation: number;
  total: number;
  premiersRdv: { date: string; heures: number }[]; // 1ers RDV facturés via le report de ce mois
}

// « Premier rendez-vous réalisé le 03/09/2026 (1,5 h) : heures intégrées au report. »
function premiersRdvLines(d: RecapData): string[] {
  return d.premiersRdv.map(
    p =>
      `Premier rendez-vous réalisé le ${new Date(p.date + 'T00:00:00').toLocaleDateString('fr-FR')} (${formatHeures(p.heures)}) : heures intégrées au report.`
  );
}

async function generateRecapPDF(d: RecapData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 460 + 16 * d.premiersRdv.length]);
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
      'Heures reportées (cumul)',
      `${d.reportIn} h × ${d.tarifHoraire.toFixed(2)} €/h`,
      `${(d.reportIn * d.tarifHoraire).toFixed(2)} €`,
    ]);
  }
  if (d.heuresAnnulation > 0) {
    rows.push([
      "Heures d'annulation facturées",
      `${d.heuresAnnulation} h × ${d.tarifHoraire.toFixed(2)} €/h`,
      `${(d.heuresAnnulation * d.tarifHoraire).toFixed(2)} €`,
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

  for (const line of premiersRdvLines(d)) {
    page.drawText(line, { x: margin, y, size: 9, font, color: rgb(0.45, 0.45, 0.45) });
    y -= 16;
  }
  if (d.premiersRdv.length) y -= 8;

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

// Tableau des montants (rendu HTML) — exposé comme variable {{montantsTable}}
// pour le template personnalisable du récap.
function buildMontantsTable(d: RecapData): string {
  const row = (label: string, montant: string) =>
    `<tr><td style="padding:12px 16px;color:#7b4a31;border-bottom:1px solid #f0e4d8;">${label}</td><td style="padding:12px 16px;text-align:right;color:#7b4a31;border-bottom:1px solid #f0e4d8;">${montant}</td></tr>`;
  let rows = row(
    `Heures réalisées (${d.heuresMois} h × ${d.tarifHoraire.toFixed(2)} €/h)`,
    `${(d.heuresMois * d.tarifHoraire).toFixed(2)} €`
  );
  if (d.reportIn > 0) {
    rows += row(
      `Heures reportées, cumul (${d.reportIn} h × ${d.tarifHoraire.toFixed(2)} €/h)`,
      `${(d.reportIn * d.tarifHoraire).toFixed(2)} €`
    );
  }
  if (d.heuresAnnulation > 0) {
    rows += row(
      `Heures d'annulation facturées (${d.heuresAnnulation} h × ${d.tarifHoraire.toFixed(2)} €/h)`,
      `${(d.heuresAnnulation * d.tarifHoraire).toFixed(2)} €`
    );
  }
  rows += row(
    `Frais de déplacement (${d.km} km × ${d.baremeKm.toFixed(3)} €/km)`,
    `${d.montantKm.toFixed(2)} €`
  );
  const rdv = premiersRdvLines(d)
    .map(l => `<p style="margin-top:16px;color:#a97761;font-size:14px;line-height:1.6;">${l}</p>`)
    .join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px;margin:8px 0;"><tbody>${rows}<tr style="background-color:#f9f3ee;"><td style="padding:14px 16px;color:#6e3a25;font-weight:700;">Total</td><td style="padding:14px 16px;text-align:right;color:#6e3a25;font-weight:700;">${d.total.toFixed(2)} €</td></tr></tbody></table>${rdv}`;
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

      // Tout l'historique du client : le report dépend aussi des mois postérieurs déjà envoyés.
      const { data: history, error: histErr } = await supabase
        .from('heures_realisees')
        .select('*')
        .eq('client_id', entry.clientId);
      const rows = (history ?? []) as HeureRealisee[];
      const row = rows.find(r => r.mois === moisIso);

      if (histErr || !row || row.sans_declaration) {
        if (histErr) console.error('Error fetching heures history:', histErr);
        results.push({
          clientId: entry.clientId,
          mois: moisIso,
          ok: false,
          error: histErr
            ? 'Erreur lecture historique'
            : !row
              ? 'Aucune heure déclarée pour ce mois'
              : 'Mois marqué « pas de déclaration »',
        });
        continue;
      }

      // Report figé (renvoi, compteur validé) réutilisé tel quel ; sinon calculé pour ce mois.
      const line = computeReports(rows, moisIso).find(l => l.mois === moisIso)!;
      const reportIn = line.reportIn;
      const heuresMois = Number(row.heures) || 0;
      const tarifHoraire = Number(row.tarif_horaire) || 0;
      const km = Number(row.km) || 0;
      const baremeKm = Number(row.bareme_km) || 0;
      const heuresAnnulation = Number(row.heures_annulation) || 0;
      const montantHeures = (heuresMois + reportIn) * tarifHoraire;
      const montantKm = km * baremeKm;
      const montantAnnulation = heuresAnnulation * tarifHoraire;
      const total = montantHeures + montantKm + montantAnnulation;

      const recap: RecapData = {
        clientName: entry.clientName,
        moisLabel: moisLabel(moisIso),
        moisIso,
        heuresMois,
        tarifHoraire,
        km,
        baremeKm,
        reportIn,
        montantHeures,
        montantKm,
        heuresAnnulation,
        montantAnnulation,
        total,
        premiersRdv: line.premiersRdv,
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

      const vars = { clientName: entry.clientName, moisLabel: recap.moisLabel };
      const def = DEFAULT_TEMPLATE_CONTENT['recap-heures'];
      const template = (await getEmailTemplateOverride('recap-heures', vars)) ?? {
        subject: substituteVars(def.subject, vars),
        html: substituteVars(def.html, vars),
      };
      // Corps (personnalisé ou par défaut) entouré de l'habillage de marque + blocs calculés
      // (tableau des montants, 1er RDV, note PJ) injectés automatiquement.
      const dynamicBlock = `${buildMontantsTable(recap)}<p style="margin-top:28px;color:#a97761;font-size:14px;line-height:1.6;">Le récapitulatif complet est également disponible en pièce jointe (PDF).</p>`;
      const htmlContent = renderEmailShell(template.html, dynamicBlock);
      const emailSubject = template.subject;

      const moisShort = moisIso.slice(0, 7);
      const emailPayload = {
        sender: {
          name: 'A Rythme Ethic',
          email: process.env.BREVO_SENDER_EMAIL || 'florence.louazel@arythmeethic.fr',
        },
        to: [{ email: entry.parentEmail }],
        subject: emailSubject,
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
          report_in: reportIn, // figé : un renvoi réutilisera cette valeur
        })
        .eq('id', row.id);

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
