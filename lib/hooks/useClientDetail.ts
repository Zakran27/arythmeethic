'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Client, Procedure, Document } from '@/types';

export function useClientDetail(clientId: string) {
  const [client, setClient] = useState<Client | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
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

      // Fetch documents for all procedures of this client
      if (proceduresData && proceduresData.length > 0) {
        const procedureIds = proceduresData.map(p => p.id);
        const { data: documentsData, error: documentsError } = await supabase
          .from('documents')
          .select('*')
          .in('procedure_id', procedureIds)
          .order('created_at', { ascending: false });

        if (documentsError) throw documentsError;
        setDocuments(documentsData || []);
      } else {
        setDocuments([]);
      }

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

  return { client, procedures, documents, loading, error, refetch: fetchData };
}
