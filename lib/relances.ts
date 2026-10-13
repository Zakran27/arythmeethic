// Procédures dont les relances automatiques (crons) peuvent être stoppées / reprises depuis la fiche.
// Fichier pur : partagé par la fiche client et la route /api/procedures/[id]/relances.
export function hasAutoRelances(p: {
  status: string;
  deadline_at?: string | null;
  procedure_type?: { code: string } | null;
}): boolean {
  const code = p.procedure_type?.code ?? '';
  if (code.startsWith('CONTRACTUALISATION')) return p.status === 'SIGN_REQUESTED';
  if (code === 'FIN_DE_CONTRAT') return p.status === 'DRAFT' || p.status === 'SIGN_REQUESTED';
  if (code === 'SOUHAIT_RENOUVELLEMENT') return p.status === 'DRAFT';
  // Relance unique : seulement tant qu'elle n'est pas partie (deadline_at vidé ensuite)
  if (code === 'PREPARATION_ACCOMPAGNEMENT') return p.status === 'DRAFT' && !!p.deadline_at;
  return false;
}

// « Annuler la signature » : contrat encore en attente de signature DocuSeal
export function canCancelSignature(p: {
  status: string;
  docuseal_submission_id?: string | null;
  procedure_type?: { code: string } | null;
}): boolean {
  return (
    (p.procedure_type?.code ?? '').startsWith('CONTRACTUALISATION') &&
    p.status === 'SIGN_REQUESTED' &&
    !!p.docuseal_submission_id
  );
}
