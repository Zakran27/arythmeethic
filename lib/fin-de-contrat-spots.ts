// Position des cases de signature DocuSeal sur les documents de fin de contrat déposés par la famille.
// Module sans alias `@/` : testé par `node lib/fin-de-contrat-spots.check.mjs`.
import { getDocumentProxy } from 'unpdf';
import type { FdcKind } from './fin-de-contrat';

// Repère = libellé imprimé sur les modèles Urssaf (CESU) / France Travail ; la case est posée juste
// en dessous, donc elle suit le texte si le document a des lignes en plus. Repère introuvable (scan,
// autre modèle) → position relevée sur les modèles, avec une marge vers le bas.
// Ratios de page, origine en haut à gauche (convention DocuSeal).
export type Area = { page: number; x: number; y: number; w: number; h: number };
export interface Spot {
  match: (item: string, line: string) => boolean; // texte normalisé : l'élément seul / l'élément + la suite
  dx: number;
  dy: number;
  w: number;
  h: number;
  fallback: { x: number; y: number };
}

const W = 0.3;
const H = 0.09;
const employeur = (fallback: Spot['fallback'], h = H): Spot => ({
  match: (_item, line) => line.startsWith("SIGNATURE DE L'EMPLOYEUR"),
  dx: 0,
  dy: 0.01,
  w: W,
  h,
  fallback,
});
export const SPOTS: Record<FdcKind, { client: Spot; florence?: Spot }> = {
  // « SIGNATURE DU SALARIE : » à gauche, « SIGNATURE DE L'EMPLOYEUR : » à droite, même ligne
  FIN_DE_CONTRAT_SOLDE_TOUT_COMPTE: {
    florence: {
      match: (_item, line) => line.startsWith('SIGNATURE DU SALARI'),
      dx: 0,
      dy: 0.01,
      w: W,
      h: H,
      fallback: { x: 0.033, y: 0.71 },
    },
    client: employeur({ x: 0.503, y: 0.71 }),
  },
  // Case moins haute : la mention « Vous bénéficiez du maintien des garanties… » suit de près
  FIN_DE_CONTRAT_CERTIFICAT_TRAVAIL: { client: employeur({ x: 0.033, y: 0.61 }, 0.055) },
  // Attestation France Travail (dernière page, section 8) : libellé « Signature » au-dessus d'un
  // cadre décalé vers la gauche
  FIN_DE_CONTRAT_ATTESTATION_EMPLOYEUR: {
    client: {
      match: item => item === 'SIGNATURE',
      dx: -0.09,
      dy: 0.016,
      w: 0.24,
      h: 0.1,
      fallback: { x: 0.683, y: 0.56 },
    },
  },
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);

// Dernière occurrence du repère dans le document (la signature est en fin de document).
export async function locateSignatureAreas(
  pdf: Buffer,
  spots: Spot[]
): Promise<{ areas: Area[]; anchored: boolean[] }> {
  const doc = await getDocumentProxy(new Uint8Array(pdf)); // copie : pdf.js peut détacher le buffer
  const found: (Area | null)[] = spots.map(() => null);
  for (let p = doc.numPages; p >= 1 && found.some(f => !f); p--) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const items = (await page.getTextContent()).items.filter(
      (it): it is typeof it & { str: string; transform: number[] } => 'str' in it
    );
    for (let i = items.length - 1; i >= 0; i--) {
      const item = norm(items[i].str);
      if (!item) continue;
      const line = norm(
        items
          .slice(i, i + 4)
          .map(it => it.str)
          .join(' ')
      );
      spots.forEach((s, k) => {
        if (found[k] || !s.match(item, line)) return;
        const [x, y] = vp.convertToViewportPoint(items[i].transform[4], items[i].transform[5]);
        found[k] = {
          page: p,
          x: clamp(x / vp.width + s.dx, 1 - s.w),
          y: clamp(y / vp.height + s.dy, 1 - s.h),
          w: s.w,
          h: s.h,
        };
      });
    }
  }
  return {
    areas: spots.map((s, k) => found[k] ?? { page: doc.numPages, ...s.fallback, w: s.w, h: s.h }),
    anchored: found.map(Boolean),
  };
}
