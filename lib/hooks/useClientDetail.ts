'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Client, Procedure, Document, ProcedureStatusHistory } from '@/types';

// Combined type for displaying procedure history with procedure info
export interface ProcedureHistoryEntry {
  id: string;
  procedure_id: string;
  procedure_label: string;
  procedure_code: string;
  status: ProcedureStatusHistory['status'];
  created_at: string;
}

export function useClientDetail(clientId: string) {
  const [client, setClient] = useState<Client | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procedureHistory, setProcedureHistory] = useState<ProcedureHistoryEntry[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // Fetch client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch procedures
      const { data: proceduresData, error: proceduresError } = await supabase
        .from('procedures')
        .select('*, procedure_type:procedure_types(*)')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (proceduresError) throw proceduresError;
      setProcedures(proceduresData || []);

      // Fetch procedure status history for all procedures of this client
      const procedureIds = (proceduresData || []).map(p => p.id);
      if (proceduresData && proceduresData.length > 0) {
        // Fetch status history
        const { data: historyData, error: historyError } = await supabase
          .from('procedure_status_history')
          .select('*')
          .in('procedure_id', procedureIds)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;

        // Combine history with procedure info
        const historyEntries: ProcedureHistoryEntry[] = (historyData || []).map(h => {
          const proc = proceduresData.find(p => p.id === h.procedure_id);
          return {
            id: h.id,
            procedure_id: h.procedure_id,
            procedure_label: proc?.procedure_type?.label || 'Procédure',
            procedure_code: proc?.procedure_type?.code || '',
            status: h.status,
            created_at: h.created_at,
          };
        });
        setProcedureHistory(historyEntries);
      } else {
        setProcedureHistory([]);
      }

      // Documents : liés au client (ajout manuel, nouveaux uploads) OU à une de ses procédures.
      // Une seule requête OR → pas de doublon quand un document a les deux liens.
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .or(
          procedureIds.length > 0
            ? `client_id.eq.${clientId},procedure_id.in.(${procedureIds.join(',')})`
            : `client_id.eq.${clientId}`
        )
        .order('created_at', { ascending: false });

      if (documentsError) throw documentsError;
      setDocuments(documentsData || []);

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId, fetchData]);

  return { client, procedures, procedureHistory, documents, loading, error, refetch: fetchData };
}
