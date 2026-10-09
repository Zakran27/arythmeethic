'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useClients } from '@/lib/hooks/useClients';
import { formatMinutes } from '@/lib/format';
import { moisLabel } from '@/lib/heures-report';
import { getDisplayName } from '@/app/admin/clients/ClientsTable';
import {
  CANAUX,
  ContactTimeline,
  SEUIL_TEMPS_ADMIN_MIN,
  monthKey,
  pendingReminders,
} from '@/components/admin/ContactTimeline';
import { ContactLogModal } from '@/components/admin/ContactLogModal';
import type { ContactLog } from '@/types';

export default function SuiviContactsPage() {
  const { clients } = useClients();
  const [logs, setLogs] = useState<ContactLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [mois, setMois] = useState(monthKey(new Date().toISOString())); // '' = toutes périodes
  const [clientFilter, setClientFilter] = useState('');
  const [canalFilter, setCanalFilter] = useState('');
  const [aRecontacter, setARecontacter] = useState(false);
  const [editing, setEditing] = useState<ContactLog | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const fetchLogs = useCallback(async () => {
    // ponytail: tout l'historique en une requête (quelques centaines de lignes), filtré en mémoire.
    const { data } = await createClient()
      .from('contact_logs')
      .select('*')
      .order('contacted_at', { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
    // « Voir tout l'historique » depuis une fiche : ?client=<id>, toutes périodes
    const c = new URLSearchParams(window.location.search).get('client');
    if (c) {
      setClientFilter(c);
      setMois('');
    }
  }, [fetchLogs]);

  const names = useMemo(
    () =>
      Object.fromEntries(
        clients.map(c => [
          c.id,
          getDisplayName(c) + (c.client_status === 'Archivé' ? ' (archivé)' : ''),
        ])
      ),
    [clients]
  );
  const clientOptions = useMemo(
    () =>
      clients
        .map(c => ({ id: c.id, label: names[c.id] }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [clients, names]
  );

  const pending = useMemo(() => pendingReminders(logs), [logs]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const enRetard = logs.filter(
    l => pending.has(l.id) && new Date(l.a_recontacter_le!) < today
  ).length;

  // « À recontacter » ignore la période : un rappel ancien reste à traiter.
  const filtered = logs.filter(
    l =>
      (!clientFilter || l.client_id === clientFilter) &&
      (!canalFilter || l.canal === canalFilter) &&
      (aRecontacter ? pending.has(l.id) : !mois || monthKey(l.contacted_at) === mois)
  );

  const sumBy = (key: (l: ContactLog) => string) => {
    const m = new Map<string, number>();
    for (const l of filtered) m.set(key(l), (m.get(key(l)) ?? 0) + l.duree_minutes);
    return [...m.entries()];
  };
  const parClient = sumBy(l => l.client_id).sort((a, b) => b[1] - a[1]);
  const parMois = sumBy(l => monthKey(l.contacted_at)).sort((a, b) => b[0].localeCompare(a[0]));
  // Seuil mensuel : affiché seulement quand un mois précis est sélectionné.
  const moisUnique = !aRecontacter && mois;

  const open = (log: ContactLog | null) => {
    setEditing(log);
    onOpen();
  };

  return (
    <Stack spacing={6}>
      <Stack
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        spacing={3}
      >
        <Box>
          <Heading color="brand.500" fontFamily="heading">
            Suivi des prises de contact
          </Heading>
          {pending.size > 0 && (
            <HStack spacing={2} mt={2}>
              <Badge colorScheme="orange">{pending.size} à recontacter</Badge>
              {enRetard > 0 && <Badge colorScheme="red">{enRetard} en retard</Badge>}
            </HStack>
          )}
        </Box>
        <Button colorScheme="accent" onClick={() => open(null)}>
          + Nouvelle prise de contact
        </Button>
      </Stack>

      <Card bg="white" shadow="sm">
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={4} alignItems="end">
            <FormControl>
              <FormLabel fontSize="sm">Mois</FormLabel>
              <Input
                type="month"
                value={mois}
                onChange={e => setMois(e.target.value)}
                isDisabled={aRecontacter}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Contact</FormLabel>
              <Select
                placeholder="Tous les contacts"
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
              >
                {clientOptions.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Canal</FormLabel>
              <Select
                placeholder="Tous les canaux"
                value={canalFilter}
                onChange={e => setCanalFilter(e.target.value)}
              >
                {CANAUX.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </FormControl>
            <Stack spacing={1}>
              <Checkbox
                isChecked={aRecontacter}
                onChange={e => setARecontacter(e.target.checked)}
                colorScheme="accent"
              >
                À recontacter uniquement
              </Checkbox>
              {mois && !aRecontacter && (
                <Button size="xs" variant="link" w="fit-content" onClick={() => setMois('')}>
                  Voir toutes les périodes
                </Button>
              )}
            </Stack>
          </SimpleGrid>
        </CardBody>
      </Card>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : (
        <>
          {/* Totaux masqués en « À recontacter » : ils ne porteraient que sur les rappels */}
          {!aRecontacter && (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={2}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Temps passé par contact
                    </Heading>
                    {parClient.length === 0 && (
                      <Text fontSize="sm" color="gray.500">
                        -
                      </Text>
                    )}
                    {parClient.map(([id, min]) => (
                      <HStack key={id} justify="space-between" fontSize="sm">
                        <Link as={NextLink} href={`/admin/clients/${id}`} color="accent.600">
                          {names[id] ?? 'Contact'}
                        </Link>
                        <HStack spacing={2}>
                          {moisUnique && min > SEUIL_TEMPS_ADMIN_MIN && (
                            <Badge colorScheme="orange">&gt; {SEUIL_TEMPS_ADMIN_MIN} min</Badge>
                          )}
                          <Text fontWeight="600">{formatMinutes(min)}</Text>
                        </HStack>
                      </HStack>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={2}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Temps passé par mois
                    </Heading>
                    {parMois.length === 0 && (
                      <Text fontSize="sm" color="gray.500">
                        -
                      </Text>
                    )}
                    {parMois.map(([m, min]) => (
                      <HStack key={m} justify="space-between" fontSize="sm">
                        <Text textTransform="capitalize">{moisLabel(`${m}-01`)}</Text>
                        <Text fontWeight="600">{formatMinutes(min)}</Text>
                      </HStack>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            </SimpleGrid>
          )}

          {filtered.length === 0 ? (
            <Box textAlign="center" py={10} bg="white" borderRadius="md">
              <Text color="gray.500">Aucune prise de contact pour ces filtres</Text>
            </Box>
          ) : (
            <ContactTimeline logs={filtered} pending={pending} clientNames={names} onEdit={open} />
          )}
        </>
      )}

      <ContactLogModal
        isOpen={isOpen}
        onClose={onClose}
        onSaved={fetchLogs}
        log={editing}
        clientOptions={clientOptions}
      />
    </Stack>
  );
}
