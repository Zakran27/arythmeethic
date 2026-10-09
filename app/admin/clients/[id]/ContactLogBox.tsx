'use client';

import {
  Badge,
  Button,
  Card,
  CardBody,
  Heading,
  HStack,
  Link,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { formatMinutes } from '@/lib/format';
import {
  ContactTimeline,
  SEUIL_TEMPS_ADMIN_MIN,
  monthKey,
  pendingReminders,
} from '@/components/admin/ContactTimeline';
import { ContactLogModal } from '@/components/admin/ContactLogModal';
import type { ContactLog } from '@/types';

const DERNIERES = 5;

// Box « Suivi des prises de contact » de la fiche (charge ses propres données).
export function ContactLogBox({ clientId }: { clientId: string }) {
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [editing, setEditing] = useState<ContactLog | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchLogs = useCallback(async () => {
    const { data } = await createClient()
      .from('contact_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('contacted_at', { ascending: false });
    setLogs(data ?? []);
  }, [clientId]);
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const pending = useMemo(() => pendingReminders(logs), [logs]);
  const ceMois = monthKey(new Date().toISOString());
  const minutesMois = logs
    .filter(l => monthKey(l.contacted_at) === ceMois)
    .reduce((s, l) => s + l.duree_minutes, 0);
  const minutesTotal = logs.reduce((s, l) => s + l.duree_minutes, 0);

  const open = (log: ContactLog | null) => {
    setEditing(log);
    onOpen();
  };

  return (
    <Card bg="white" shadow="sm">
      <CardBody>
        <Stack spacing={4}>
          <HStack justify="space-between" align="flex-start" flexWrap="wrap" spacing={2}>
            <Stack spacing={1}>
              <Heading size="sm" color="brand.500" fontFamily="heading">
                Suivi des prises de contact
              </Heading>
              <HStack spacing={2} flexWrap="wrap">
                <Text fontSize="sm" color="gray.600">
                  Temps admin : {formatMinutes(minutesMois)} ce mois · {formatMinutes(minutesTotal)}{' '}
                  au total
                </Text>
                {minutesMois > SEUIL_TEMPS_ADMIN_MIN && (
                  <Badge colorScheme="orange">&gt; {SEUIL_TEMPS_ADMIN_MIN} min ce mois</Badge>
                )}
              </HStack>
            </Stack>
            <Button size="sm" colorScheme="accent" onClick={() => open(null)}>
              + Ajouter
            </Button>
          </HStack>

          {logs.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              Aucune prise de contact enregistrée.
            </Text>
          ) : (
            <>
              <ContactTimeline
                logs={logs.slice(0, DERNIERES)}
                pending={pending}
                compact
                onEdit={open}
              />
              {logs.length > DERNIERES && (
                <Link
                  as={NextLink}
                  href={`/admin/suivi-contacts?client=${clientId}`}
                  fontSize="sm"
                  color="accent.600"
                >
                  Voir tout l&apos;historique ({logs.length})
                </Link>
              )}
            </>
          )}
        </Stack>
      </CardBody>
      <ContactLogModal
        isOpen={isOpen}
        onClose={onClose}
        onSaved={fetchLogs}
        log={editing}
        clientId={clientId}
      />
    </Card>
  );
}
