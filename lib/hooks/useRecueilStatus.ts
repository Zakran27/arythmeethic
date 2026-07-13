'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

export type RecueilFormStatus = 'rempli' | 'attente';

/**
 * Statut du formulaire "Recueil des informations" par client :
 * - pas d'entrée dans la map : la procédure n'a jamais été lancée → aucun indicateur
 * - 'attente' : procédure lancée (mail envoyé) mais formulaire pas encore rempli
 * - 'rempli' : le formulaire a été rempli (FORMULAIRE_REMPLI dans l'historique)
 * On se base sur la procédure RECUEIL_INFORMATIONS la plus récente de chaque client.
 */
export function useRecueilStatus() {
  const [statusByClient, setStatusByClient] = useState<Record<string, RecueilFormStatus>>({});

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const supabase = createClient();

        const { data: procedureType } = await supabase
          .from('procedure_types')
          .select('id')
          .eq('code', 'RECUEIL_INFORMATIONS')
          .single();

        if (!procedureType) return;

        const { data: procedures } = await supabase
          .from('procedures')
          .select('id, client_id, created_at')
          .eq('procedure_type_id', procedureType.id)
          .order('created_at', { ascending: false });

        if (!procedures || procedures.length === 0) return;

        // Procédure recueil la plus récente par client (liste triée desc → premier vu = plus récent)
        const latestByClient = new Map<string, string>();
        for (const proc of procedures) {
          if (!latestByClient.has(proc.client_id)) {
            latestByClient.set(proc.client_id, proc.id);
          }
        }

        const { data: history } = await supabase
          .from('procedure_status_history')
          .select('procedure_id')
          .eq('status', 'FORMULAIRE_REMPLI')
          .in('procedure_id', Array.from(latestByClient.values()));

        const filledProcedureIds = new Set((history || []).map(h => h.procedure_id));

        const map: Record<string, RecueilFormStatus> = {};
        latestByClient.forEach((procedureId, clientId) => {
          map[clientId] = filledProcedureIds.has(procedureId) ? 'rempli' : 'attente';
        });
        setStatusByClient(map);
      } catch {
        // Indicateur non bloquant : en cas d'erreur, la liste s'affiche sans badge
      }
    };

    fetchStatus();
  }, []);

  return { statusByClient };
}
