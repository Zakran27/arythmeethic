import type { Client, HeureRealisee } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Compteur de report des heures (déclaration mensuelle CESU).
//
// Règle : chaque mois ajoute son « temps à reporter » au compteur ; dès que le
// compteur atteint 1 h, les heures entières sont facturées sur un mois déclaré
// (report_in) et le reste (< 1 h) est conservé. Le 1er RDV n'est pas facturé
// son mois : il entre dans le compteur et part avec le prochain mois déclaré
// qui facture du report (la mention « Premier rendez-vous » l'accompagne).
//
// report_in NULL = prévisionnel (recalculé ici) ; un nombre = figé (récap envoyé,
// « Mettre à jour le compteur » ou saisie manuelle) et n'est JAMAIS recalculé.
//
// Fichier pur (aucun import runtime) : partagé par la fiche, les modales et la
// route d'envoi du récap. Auto-test : `node lib/heures-report.check.mjs`.
// ─────────────────────────────────────────────────────────────────────────────

export type ReportRow = Pick<HeureRealisee, 'mois'> &
  Partial<
    Pick<
      HeureRealisee,
      | 'heures'
      | 'heures_annulation'
      | 'temps_a_reporter'
      | 'report_in'
      | 'premier_rdv_heures'
      | 'premier_rdv_date'
      | 'sans_declaration'
    >
  >;

export interface ReportLine {
  mois: string;
  reportIn: number; // heures de report facturées ce mois
  auto: boolean; // true = prévisionnel (pas encore figé)
  soldeApres: number; // compteur à reporter après ce mois (< 0 possible après une saisie manuelle)
  premiersRdv: { date: string; heures: number }[]; // 1ers RDV des mois précédents, mentionnés dans ce récap
}

// Centièmes d'heure : évite la dérive des flottants (0.1 + 0.2 + 0.7 < 1).
const c = (x: unknown) => Math.round(Number(x ?? 0) * 100);

// `forceMois` = mois qu'on s'apprête à envoyer/figer : il absorbe le report même sans heures.
export function computeReports(rows: ReportRow[], forceMois?: string): ReportLine[] {
  const r = [...rows].sort((a, b) => a.mois.localeCompare(b.mois));
  // Un mois « pas de déclaration » n'absorbe jamais de report (sauf valeur déjà figée).
  const declared = r.map(
    x =>
      x.report_in != null ||
      (!x.sans_declaration && (x.mois === forceMois || c(x.heures) + c(x.heures_annulation) > 0))
  );
  const ri = r.map(x => (x.report_in == null ? null : c(x.report_in)));
  // Solde après chaque mois ; le 1er RDV n'entre dans le compteur qu'APRÈS son mois.
  const soldes = () => {
    let s = 0;
    return r.map((x, i) => {
      s += c(x.temps_a_reporter) - (ri[i] ?? 0);
      const out = s;
      s += c(x.premier_rdv_heures);
      return out;
    });
  };
  // Plafond = plus petit solde des mois suivants (figés compris) : un mois envoyé
  // dans le désordre ne refacture jamais ce qu'un mois postérieur a déjà pris.
  // ponytail: O(n²), n = nombre de mois d'un client (< 50).
  r.forEach((_, i) => {
    if (ri[i] != null) return;
    ri[i] = declared[i] ? Math.max(0, Math.floor(Math.min(...soldes().slice(i)) / 100) * 100) : 0;
  });
  const s = soldes();
  let pending: { date: string; heures: number }[] = [];
  return r.map((x, i) => {
    // La mention part avec le mois qui facture réellement du report (pas un mois à +0 h).
    const bills = declared[i] && (ri[i] ?? 0) > 0;
    const premiersRdv = bills ? pending : [];
    if (bills) pending = [];
    if (c(x.premier_rdv_heures) > 0)
      pending.push({ date: x.premier_rdv_date ?? x.mois, heures: Number(x.premier_rdv_heures) });
    return {
      mois: x.mois,
      reportIn: (ri[i] ?? 0) / 100,
      auto: x.report_in == null,
      soldeApres: (s[i] + c(x.premier_rdv_heures)) / 100,
      premiersRdv,
    };
  });
}

// ── Helpers partagés par les écrans de déclaration ──

// 'YYYY-MM' ou 'YYYY-MM-DD' → 'YYYY-MM-01'
export function normalizeMois(mois: string): string {
  const [y, m] = String(mois).split('-');
  return `${y}-${m}-01`;
}

export function moisLabel(moisIso: string): string {
  return new Date(moisIso + 'T00:00:00').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

// 1.5 → « 1,5 h »
export function formatHeures(h: number): string {
  return `${h.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h`;
}

export function getClientDisplayName(c: Client): string {
  const first = c.first_name_jeune || c.first_name || '';
  const last = c.last_name_jeune || c.last_name || '';
  return `${first} ${last}`.trim();
}

export function getEmailOptions(c: Client): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  if (c.email_parent1)
    opts.push({ label: `Parent 1 — ${c.email_parent1}`, value: c.email_parent1 });
  if (c.email_parent2)
    opts.push({ label: `Parent 2 — ${c.email_parent2}`, value: c.email_parent2 });
  if (c.email_jeune) opts.push({ label: `Jeune — ${c.email_jeune}`, value: c.email_jeune });
  if (c.email) opts.push({ label: `Principal — ${c.email}`, value: c.email });
  return opts;
}

export function getDefaultEmail(c: Client): string {
  return c.email_parent1 || c.email_parent2 || c.email_jeune || c.email || '';
}
