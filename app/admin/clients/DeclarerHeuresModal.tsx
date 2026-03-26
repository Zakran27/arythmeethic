'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  Input,
  Select,
  Stack,
  Text,
  HStack,
  Divider,
  Badge,
  useToast,
  Box,
  Spinner,
  Center,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Client } from '@/types';
import { createClient } from '@/lib/supabase-client';

interface DeclarerHeuresModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  defaultBaremeKm?: string;
}

interface LoadedEntry {
  client: Client;
  mois: string; // YYYY-MM-01
  heures: string;
  tarifHoraire: string;
  km: string;
  baremeKm: string;
  tempsAReporter: string;
}

function getClientDisplayName(client: Client): string {
  const first = client.first_name_jeune || client.first_name || '';
  const last = client.last_name_jeune || client.last_name || '';
  return `${first} ${last}`.trim();
}

function getEmailOptions(client: Client): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  if (client.email_parent1) opts.push({ label: `Parent 1 — ${client.email_parent1}`, value: client.email_parent1 });
  if (client.email_parent2) opts.push({ label: `Parent 2 — ${client.email_parent2}`, value: client.email_parent2 });
  if (client.email_jeune) opts.push({ label: `Jeune — ${client.email_jeune}`, value: client.email_jeune });
  if (client.email) opts.push({ label: `Principal — ${client.email}`, value: client.email });
  return opts;
}

function getDefaultEmail(client: Client): string {
  return client.email_parent1 || client.email_parent2 || client.email_jeune || client.email || '';
}

function moisLabel(mois: string): string {
  return new Date(mois + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export function DeclarerHeuresModal({
  isOpen,
  onClose,
  clients,
  defaultBaremeKm = '0.636',
}: DeclarerHeuresModalProps) {
  const toast = useToast();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const [dateFrom, setDateFrom] = useState(lastMonth);
  const [dateTo, setDateTo] = useState(thisMonth);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<LoadedEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);

  const handleLoad = async () => {
    if (!dateFrom || !dateTo) {
      toast({ title: 'Sélectionnez une plage de dates', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setIsLoading(true);
    setHasLoaded(false);
    setEntries([]);
    setSelectedIds(new Set());
    setEmails({});
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('heures_realisees')
        .select('*')
        .gte('mois', `${dateFrom}-01`)
        .lte('mois', `${dateTo}-01`)
        .order('mois', { ascending: false });

      if (error) throw new Error(error.message);

      const loaded: LoadedEntry[] = [];
      const initEmails: Record<string, string> = {};

      for (const row of data ?? []) {
        const client = clients.find(c => c.id === row.client_id);
        if (!client) continue;
        const key = `${row.client_id}__${row.mois}`;
        loaded.push({
          client,
          mois: row.mois,
          heures: row.heures?.toString() ?? '0',
          tarifHoraire: row.tarif_horaire?.toString() ?? '0',
          km: row.km?.toString() ?? '0',
          baremeKm: row.bareme_km?.toString() ?? defaultBaremeKm,
          tempsAReporter: row.temps_a_reporter?.toString() ?? '0',
        });
        if (!initEmails[key]) initEmails[key] = getDefaultEmail(client);
      }

      setEntries(loaded);
      setEmails(initEmails);
      setHasLoaded(true);

      if (loaded.length === 0) {
        toast({ title: 'Aucune heure trouvée', description: 'Aucune déclaration sur cette période.', status: 'info', duration: 4000, isClosable: true });
      }
    } catch (err) {
      toast({ title: 'Erreur de chargement', description: err instanceof Error ? err.message : 'Erreur', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsLoading(false);
    }
  };

  const entryKey = (e: LoadedEntry) => `${e.client.id}__${e.mois}`;

  const toggleEntry = (key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(entryKey)));
    }
  };

  const handleSend = async () => {
    const toSend = entries.filter(e => selectedIds.has(entryKey(e)));
    if (toSend.length === 0) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/heures-realisees/recap-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: dateTo,
          entries: toSend.map(e => {
            const key = entryKey(e);
            return {
              clientId: e.client.id,
              clientName: getClientDisplayName(e.client),
              parentEmail: emails[key] || getDefaultEmail(e.client),
              heures: e.heures,
              tarifHoraire: e.tarifHoraire,
              km: e.km,
              baremeKm: e.baremeKm,
              mois: e.mois,
            };
          }),
        }),
      });

      const data = await res.json();
      const failed = data.results?.filter((r: { ok: boolean }) => !r.ok) ?? [];

      if (!data.success && data.error) {
        toast({ title: 'Erreur', description: data.error, status: 'error', duration: 5000, isClosable: true });
      } else if (failed.length > 0) {
        toast({ title: `${failed.length} email(s) non envoyé(s)`, description: 'Vérifiez les adresses email.', status: 'warning', duration: 5000, isClosable: true });
      } else {
        toast({ title: 'Récapitulatif envoyé', description: `${toSend.length} email(s) envoyé(s) avec succès.`, status: 'success', duration: 4000, isClosable: true });
      }
      handleClose();
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setDateFrom(lastMonth);
    setDateTo(thisMonth);
    setIsLoading(false);
    setEntries([]);
    setHasLoaded(false);
    setSelectedIds(new Set());
    setEmails({});
    onClose();
  };

  const allSelected = entries.length > 0 && selectedIds.size === entries.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Récapitulatif des heures
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody overflowY="auto">
          <Stack spacing={4}>
            {/* Plage de dates */}
            <HStack align="flex-end" spacing={3}>
              <FormControl flex={1}>
                <FormLabel fontSize="sm">Du</FormLabel>
                <Input
                  type="month"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setHasLoaded(false); setEntries([]); }}
                />
              </FormControl>
              <FormControl flex={1}>
                <FormLabel fontSize="sm">Au</FormLabel>
                <Input
                  type="month"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); setHasLoaded(false); setEntries([]); }}
                />
              </FormControl>
              <Button
                colorScheme="brand"
                onClick={handleLoad}
                isLoading={isLoading}
                loadingText="Chargement..."
                flexShrink={0}
                mb={0}
              >
                Rechercher
              </Button>
            </HStack>

            {/* Résultats */}
            {isLoading && (
              <Center py={8}>
                <Spinner color="brand.500" size="lg" />
              </Center>
            )}

            {hasLoaded && !isLoading && entries.length > 0 && (
              <>
                <Divider />
                <HStack justify="space-between">
                  <Text fontWeight="medium" color="gray.700" fontSize="sm">
                    {entries.length} déclaration(s) trouvée(s)
                  </Text>
                  <Checkbox
                    isChecked={allSelected}
                    isIndeterminate={someSelected}
                    onChange={toggleAll}
                    colorScheme="brand"
                    fontSize="sm"
                  >
                    Tout sélectionner
                  </Checkbox>
                </HStack>

                <Stack spacing={3}>
                  {entries.map(entry => {
                    const key = entryKey(entry);
                    const isChecked = selectedIds.has(key);
                    const montantH = (parseFloat(entry.heures) * parseFloat(entry.tarifHoraire)).toFixed(2);
                    const montantKm = (parseFloat(entry.km) * parseFloat(entry.baremeKm)).toFixed(2);
                    const total = (parseFloat(montantH) + parseFloat(montantKm)).toFixed(2);
                    const emailOptions = getEmailOptions(entry.client);

                    return (
                      <Box
                        key={key}
                        p={3}
                        bg={isChecked ? 'brand.50' : 'gray.50'}
                        borderRadius="md"
                        border="1px solid"
                        borderColor={isChecked ? 'brand.200' : 'gray.200'}
                        cursor="pointer"
                        onClick={() => toggleEntry(key)}
                      >
                        <HStack align="flex-start" spacing={3}>
                          <Checkbox
                            isChecked={isChecked}
                            onChange={() => toggleEntry(key)}
                            onClick={e => e.stopPropagation()}
                            colorScheme="brand"
                            mt={1}
                          />
                          <Stack spacing={1} flex={1}>
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontWeight="medium" fontSize="sm">
                                  {getClientDisplayName(entry.client)}
                                </Text>
                                {entry.client.sub_type && (
                                  <Badge colorScheme="purple" fontSize="xs">{entry.client.sub_type}</Badge>
                                )}
                                <Badge colorScheme="gray" fontSize="xs">{moisLabel(entry.mois)}</Badge>
                              </HStack>
                              <Text fontSize="sm" fontWeight="bold" color="brand.600">{total} €</Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.500">
                              {entry.heures} h × {entry.tarifHoraire} €/h = {montantH} €
                              {parseFloat(entry.km) > 0 && ` · ${entry.km} km × ${entry.baremeKm} €/km = ${montantKm} €`}
                              {parseFloat(entry.tempsAReporter) > 0 && ` · Reporter : ${entry.tempsAReporter} h`}
                            </Text>

                            {isChecked && (
                              <FormControl onClick={e => e.stopPropagation()} mt={1}>
                                <FormLabel fontSize="xs" color="gray.500" mb={1}>Envoyer à</FormLabel>
                                {emailOptions.length > 0 ? (
                                  <Select
                                    size="sm"
                                    value={emails[key] || ''}
                                    onChange={ev => setEmails(prev => ({ ...prev, [key]: ev.target.value }))}
                                  >
                                    {emailOptions.map(opt => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </Select>
                                ) : (
                                  <Text fontSize="xs" color="red.400">Aucune adresse email renseignée</Text>
                                )}
                              </FormControl>
                            )}
                          </Stack>
                        </HStack>
                      </Box>
                    );
                  })}
                </Stack>
              </>
            )}
          </Stack>
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={handleClose}>
            Annuler
          </Button>
          <Button
            colorScheme="accent"
            onClick={handleSend}
            isLoading={isSending}
            loadingText="Envoi en cours..."
            isDisabled={selectedIds.size === 0}
          >
            Envoyer le récapitulatif{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
