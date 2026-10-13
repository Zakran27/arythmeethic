// Statut réel des contrats DocuSeal (côté serveur uniquement). Pas de webhook : synchro par le
// cron /api/cron/signatures et à chaque clic « Télécharger le contrat signé ».
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  getSubmission,
  archiveSubmission,
  pendingSubmitters,
  type DocusealSubmission,
} from '@/lib/docuseal';

export type ContractStatus = 'SIGN_REQUESTED' | 'SIGNED' | 'REFUSED' | 'CLOSED';

const HISTORY: Record<Exclude<ContractStatus, 'SIGN_REQUESTED'>, string> = {
  SIGNED: 'SIGNATURE_EFFECTUEE',
  REFUSED: 'SIGNATURE_REFUSEE',
  CLOSED: 'SIGNATURE_ANNULEE',
};

// Tout le monde a signé → SIGNED ; un refus → REFUSED ; archivée dans DocuSeal → CLOSED.
export function submissionStatus(sub: DocusealSubmission): ContractStatus {
  if (sub.submitters.length > 0 && pendingSubmitters(sub).length === 0) return 'SIGNED';
  if (sub.submitters.some(s => s.declined_at)) return 'REFUSED';
  if (sub.archived_at) return 'CLOSED';
  return 'SIGN_REQUESTED';
}

// Reporte en base le statut DocuSeal d'une contractualisation. Idempotent : seule une procédure
// encore SIGN_REQUESTED change (update conditionnel → historique écrit une seule fois, même si
// cron et clic tombent en même temps) ; une version remplacée (CLOSED) n'est jamais ressuscitée.
// `dry` : calcule sans rien écrire. Renvoie la soumission (null si introuvable) et son statut.
export async function syncContractSignature(
  proc: { id: string; status: string; docuseal_submission_id: string | null },
  { submission, dry = false }: { submission?: DocusealSubmission | null; dry?: boolean } = {}
): Promise<{ submission: DocusealSubmission | null; status: ContractStatus | null }> {
  const sub =
    submission ??
    (proc.docuseal_submission_id ? await getSubmission(proc.docuseal_submission_id) : null);
  if (!sub) return { submission: null, status: null };
  const status = submissionStatus(sub);
  if (dry || proc.status !== 'SIGN_REQUESTED' || status === 'SIGN_REQUESTED') {
    return { submission: sub, status };
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const signedAt = sub.submitters
    .map(s => s.completed_at ?? '')
    .sort()
    .at(-1);
  const { data } = await supabase
    .from('procedures')
    .update({
      status,
      updated_at: now,
      ...(status === 'SIGNED' && { signed_at: signedAt || now }),
    })
    .eq('id', proc.id)
    .eq('status', 'SIGN_REQUESTED')
    .select('id');
  if (data?.length) {
    await supabase
      .from('procedure_status_history')
      .insert({ procedure_id: proc.id, status: HISTORY[status] });
  }
  return { submission: sub, status };
}

// Nouvelle version envoyée pour le même client + année scolaire : les versions précédentes
// passent en CLOSED pour ne garder que la dernière dans « Contrats signés ». Celles encore en
// attente sont archivées dans DocuSeal (ancien lien inutilisable) + historique SIGNATURE_ANNULEE.
// Ne jette jamais : le nouveau contrat est déjà parti.
export async function supersedePreviousContracts({
  clientId,
  procedureTypeId,
  anneeScolaire,
  keepId,
}: {
  clientId: string;
  procedureTypeId: string;
  anneeScolaire: string;
  keepId: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: previous } = await supabase
    .from('procedures')
    .select('id, status, docuseal_submission_id')
    .eq('client_id', clientId)
    .eq('procedure_type_id', procedureTypeId)
    .eq('annee_scolaire', anneeScolaire)
    .in('status', ['SIGN_REQUESTED', 'SIGNED'])
    .not('docuseal_submission_id', 'is', null)
    .neq('id', keepId);

  for (const p of previous ?? []) {
    try {
      let status = p.status as ContractStatus | null;
      if (status === 'SIGN_REQUESTED') {
        // Signée entre-temps (pas encore synchronisée) → on l'enregistre comme signée, sans l'archiver
        status = (await syncContractSignature(p).catch(() => null))?.status ?? 'SIGN_REQUESTED';
        if (status === 'REFUSED' || status === 'CLOSED') continue; // déjà terminée, rien à remplacer
      }
      if (status === 'SIGN_REQUESTED') {
        // Échec d'archivage : on ferme quand même (sinon le cron relancerait l'ancien lien en plus du nouveau)
        await archiveSubmission(p.docuseal_submission_id!).catch(e =>
          console.error('[Signatures] Archivage DocuSeal impossible', p.docuseal_submission_id, e)
        );
      }
      const from = status === 'SIGNED' ? 'SIGNED' : 'SIGN_REQUESTED';
      const { data } = await supabase
        .from('procedures')
        .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
        .eq('id', p.id)
        .eq('status', from)
        .select('id');
      // ponytail: une version SIGNÉE remplacée n'a pas d'entrée d'historique (le libellé V{n} suffit)
      if (data?.length && from === 'SIGN_REQUESTED') {
        await supabase
          .from('procedure_status_history')
          .insert({ procedure_id: p.id, status: 'SIGNATURE_ANNULEE' });
      }
    } catch (e) {
      console.error('[Signatures] Remplacement de la version précédente impossible', p.id, e);
    }
  }
}

// « Annuler la signature » (fiche client) : lien DocuSeal désactivé, contrat CLOSED + historique
// SIGNATURE_ANNULEE. Refusé si le contrat a été signé (ou refusé) entre-temps. Définitif : pour le
// bon destinataire, Florence renvoie une nouvelle version.
export async function cancelContractSignature(proc: {
  id: string;
  status: string;
  docuseal_submission_id: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  if (proc.status !== 'SIGN_REQUESTED' || !proc.docuseal_submission_id) {
    return { success: false, error: 'Aucune signature en attente pour ce contrat' };
  }
  const { status } = await syncContractSignature(proc);
  if (status && status !== 'SIGN_REQUESTED') {
    return {
      success: false,
      error: 'Le contrat n’est plus en attente de signature (statut mis à jour)',
    };
  }
  await archiveSubmission(proc.docuseal_submission_id);
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from('procedures')
    .update({ status: 'CLOSED', updated_at: new Date().toISOString() })
    .eq('id', proc.id)
    .eq('status', 'SIGN_REQUESTED')
    .select('id');
  if (data?.length) {
    await supabase
      .from('procedure_status_history')
      .insert({ procedure_id: proc.id, status: 'SIGNATURE_ANNULEE' });
  }
  return { success: true };
}
