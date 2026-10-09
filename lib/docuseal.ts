// Client de l'API DocuSeal (côté serveur uniquement : clé DOCUSEAL_API_KEY).
const API_URL = 'https://api.docuseal.com';

export interface DocusealSubmitter {
  role: string;
  email: string;
  name: string;
  slug: string;
  completed_at: string | null;
  declined_at: string | null;
  opened_at: string | null;
}

export interface DocusealSubmission {
  id: number;
  archived_at: string | null;
  submitters: DocusealSubmitter[];
  documents?: { name: string; url: string }[];
}

export interface DocusealSigner {
  role: string;
  email: string;
  name: string;
  fields: { page: number; x: number; y: number; w: number; h: number };
}

function headers() {
  const apiKey = process.env.DOCUSEAL_API_KEY;
  if (!apiKey) throw new Error('DOCUSEAL_API_KEY non configurée');
  return { 'X-Auth-Token': apiKey, 'Content-Type': 'application/json' };
}

// Contrats générés en A4 par pdf-lib (lib/pdf-contract-*-generator.ts)
const PAGE_W = 595;
const PAGE_H = 842;
const FIELD_W = 0.25; // ~150px
const FIELD_H = 0.09; // ~75px

// Coordonnées pdf-lib (origine en bas à gauche) → ratios DocuSeal (origine en haut à gauche)
export function toDocusealCoords(x: number, y: number) {
  return { x: x / PAGE_W, y: 1 - y / PAGE_H - FIELD_H, w: FIELD_W, h: FIELD_H };
}

// Lien de signature d'un signataire (GET /submissions ne renvoie pas embed_src, seulement le slug)
export function signingLink(slug: string): string {
  return `https://docuseal.com/s/${slug}`;
}

// Signataires qui n'ont pas encore signé (completed_at, plus fiable que `status`)
export function pendingSubmitters(sub: DocusealSubmission): DocusealSubmitter[] {
  return sub.submitters.filter(s => !s.completed_at);
}

// Crée la soumission (contrat + annexes éventuelles). DocuSeal envoie aussi son propre email (send_email).
export async function createSubmission(params: {
  pdfBuffer: Buffer;
  filename: string;
  annexes?: { buffer: Buffer; name: string }[];
  signers: DocusealSigner[];
}): Promise<{
  submissionId: string;
  signers: { role: string; email: string; name: string; embedSrc: string }[];
}> {
  const body = {
    send_email: true,
    order: 'random',
    // Annexes fusionnées dans un seul PDF (contrat École) ; absent = comportement par défaut
    merge_documents: params.annexes ? true : undefined,
    submitters: params.signers.map(s => ({ role: s.role, email: s.email, name: s.name })),
    documents: [
      {
        name: params.filename,
        file: params.pdfBuffer.toString('base64'),
        fields: params.signers.map(s => ({
          name: `signature_${s.role.toLowerCase()}`,
          role: s.role,
          type: 'signature',
          required: true,
          areas: [s.fields],
        })),
      },
      ...(params.annexes ?? []).map(a => ({
        name: a.name,
        file: a.buffer.toString('base64'),
        fields: [],
      })),
    ],
  };

  const res = await fetch(`${API_URL}/submissions/pdf`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('[DocuSeal] Erreur création:', res.status, err);
    throw new Error(`DocuSeal error: ${err}`);
  }
  const data = await res.json();
  const submissionId = Array.isArray(data)
    ? (data[0]?.submission_id ?? data[0]?.id)
    : (data.submission_id ?? data.id);
  console.log('[DocuSeal] Soumission créée:', submissionId);

  return {
    submissionId: String(submissionId),
    signers: (data.submitters ?? []).map(
      (s: { role: string; email: string; name: string; embed_src: string }) => ({
        role: s.role,
        email: s.email,
        name: s.name,
        embedSrc: s.embed_src,
      })
    ),
  };
}

// null si la soumission n'existe pas (404) ; jette sur toute autre erreur.
export async function getSubmission(id: string): Promise<DocusealSubmission | null> {
  const res = await fetch(`${API_URL}/submissions/${encodeURIComponent(id)}`, {
    headers: headers(),
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`DocuSeal GET ${id}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Archive la soumission (le lien de signature n'est plus proposé). 404 = déjà supprimée, ignoré.
export async function archiveSubmission(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/submissions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`DocuSeal DELETE ${id}: ${res.status} ${await res.text()}`);
  }
}
