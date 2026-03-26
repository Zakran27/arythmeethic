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

interface SavedEntry {
  client: Client;
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

export function DeclarerHeuresModal({
  isOpen,
  onClose,
  clients,
  defaultBaremeKm = '0.636',
}: DeclarerHeuresModalProps) {
  const toast = useToast();

  const now = new Date();
  const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [step, setStep] = useState<1 | 2>(1);
  const [mois, setMois] = useState(defaultMois);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedEntries, setLoadedEntries] = useState<SavedEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Record<string, string>>({});

  const handleLoad = async () => {
    if (!mois) {
      toast({
        title: 'Mois requis',
        description: 'Veuillez sélectionner un mois.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    setHasLoaded(false);
    setLoadedEntries([]);
    setSelectedClientIds(new Set());

    try {
      const supabase = createClient();
      const moisDate = `${mois}-01`;
      const { data, error } = await supabase
        .from('heures_realisees')
        .select('*')
        .gte('mois', moisDate)
        .lte('mois', moisDate)
        .order('client_id');

      if (error) throw new Error(error.message);

      const entries: SavedEntry[] = [];
      for (const row of data ?? []) {
        const client = clients.find(c => c.id === row.client_id);
        if (!client) continue;
        entries.push({
          client,
          heures: row.heures?.toString() ?? '0',
          tarifHoraire: row.tarif_horaire?.toString() ?? '0',
          km: row.km?.toString() ?? '0',
          baremeKm: row.bareme_km?.toString() ?? defaultBaremeKm,
          tempsAReporter: row.temps_a_reporter?.toString() ?? '0',
        });
      }

      setLoadedEntries(entries);
      setHasLoaded(true);

      if (entries.length === 0) {
        toast({
          title: 'Aucune heure trouvée',
          description: `Aucune déclaration pour ${new Date(moisDate).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}.`,
          status: 'info',
          duration: 4000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Erreur de chargement',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleClient = (id: string) => {
    setSelectedClientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClientIds.size === loadedEntries.length) {
      setSelectedClientIds(new Set());
    } else {
      setSelectedClientIds(new Set(loadedEntries.map(e => e.client.id)));
    }
  };

  const goToStep2 = () => {
    if (selectedClientIds.size === 0) {
      toast({
        title: 'Aucun client sélectionné',
        description: 'Veuillez sélectionner au moins un client pour le récap email.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const initEmails: Record<string, string> = {};
    for (const id of selectedClientIds) {
      const entry = loadedEntries.find(e => e.client.id === id);
      if (entry) initEmails[id] = getDefaultEmail(entry.client);
    }
    setSelectedEmails(initEmails);
    setStep(2);
  };

  const handleSendEmail = async () => {
    const entriesToSend = loadedEntries.filter(e => selectedClientIds.has(e.client.id));

    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/heures-realisees/recap-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois,
          entries: entriesToSend.map(e => ({
            clientId: e.client.id,
            clientName: getClientDisplayName(e.client),
            parentEmail: selectedEmails[e.client.id] || getDefaultEmail(e.client),
            heures: e.heures,
            tarifHoraire: e.tarifHoraire,
            km: e.km,
            baremeKm: e.baremeKm,
          })),
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast({
          title: 'Erreur envoi email',
          description: data.message || data.error || 'Une erreur est survenue.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const failed = data.results?.filter((r: { ok: boolean }) => !r.ok) ?? [];

      if (failed.length === 0) {
        toast({
          title: 'Emails envoyés',
          description: `Récapitulatif envoyé à ${entriesToSend.length} destinataire(s).`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast({
          title: `${failed.length} email(s) non envoyé(s)`,
          description: data.message || 'Vérifiez les adresses email.',
          status: 'warning',
          duration: 6000,
          isClosable: true,
        });
      }
    } catch (err) {
      toast({
        title: 'Erreur envoi email',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setMois(defaultMois);
    setIsLoading(false);
    setLoadedEntries([]);
    setHasLoaded(false);
    setSelectedClientIds(new Set());
    setSelectedEmails({});
    onClose();
  };

  const allSelected = loadedEntries.length > 0 && selectedClientIds.size === loadedEntries.length;
  const someSelected = selectedClientIds.size > 0 && !allSelected;

  const selectedEntries = loadedEntries.filter(e => selectedClientIds.has(e.client.id));

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Récapitulatif des heures —{' '}
          {step === 1 ? 'Étape 1 : Sélection du mois' : 'Étape 2 : Confirmation email'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody overflowY="auto">
          {/* ===== STEP 1: MOIS + HEURES DÉCLARÉES ===== */}
          {step === 1 && (
            <Stack spacing={4}>
              <HStack align="flex-end" spacing={3}>
                <FormControl isRequired flex={1}>
                  <FormLabel>Mois concerné</FormLabel>
                  <Input
                    type="month"
                    value={mois}
                    onChange={e => {
                      setMois(e.target.value);
                      setHasLoaded(false);
                      setLoadedEntries([]);
                      setSelectedClientIds(new Set());
                    }}
                  />
                </FormControl>
                <Button
                  colorScheme="brand"
                  onClick={handleLoad}
                  isLoading={isLoading}
                  loadingText="Chargement..."
                  flexShrink={0}
                >
                  Charger
                </Button>
              </HStack>

              {isLoading && (
                <Center py={6}>
                  <Spinner color="brand.500" size="lg" />
                </Center>
              )}

              {hasLoaded && !isLoading && (
                <>
                  <Divider />

                  {loadedEntries.length === 0 ? (
                    <Text color="gray.500" fontSize="sm" textAlign="center" py={4}>
                      Aucune heure déclarée pour ce mois.
                    </Text>
                  ) : (
                    <Stack spacing={2}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontWeight="medium" color="gray.700">
                          {loadedEntries.length} client(s) avec des heures déclarées
                        </Text>
                        <Checkbox
                          isChecked={allSelected}
                          isIndeterminate={someSelected}
                          onChange={toggleAll}
                          colorScheme="brand"
                          fontWeight="medium"
                          fontSize="sm"
                        >
                          Tout sélectionner
                        </Checkbox>
                      </HStack>

                      {loadedEntries.map(entry => {
                        const { client } = entry;
                        const montantHeures =
                          entry.heures && entry.tarifHoraire
                            ? (parseFloat(entry.heures) * parseFloat(entry.tarifHoraire)).toFixed(2)
                            : null;
                        const montantKm =
                          entry.km && entry.baremeKm
                            ? (parseFloat(entry.km) * parseFloat(entry.baremeKm)).toFixed(2)
                            : null;
                        const total =
                          montantHeures !== null && montantKm !== null
                            ? (parseFloat(montantHeures) + parseFloat(montantKm)).toFixed(2)
                            : montantHeures ?? null;

                        const isChecked = selectedClientIds.has(client.id);

                        return (
                          <HStack
                            key={client.id}
                            p={3}
                            bg={isChecked ? 'brand.50' : 'gray.50'}
                            borderRadius="md"
                            border="1px solid"
                            borderColor={isChecked ? 'brand.200' : 'gray.200'}
                            cursor="pointer"
                            onClick={() => toggleClient(client.id)}
                            align="flex-start"
                          >
                            <Checkbox
                              isChecked={isChecked}
                              onChange={() => toggleClient(client.id)}
                              onClick={e => e.stopPropagation()}
                              colorScheme="brand"
                              mt={0.5}
                            />
                            <Stack spacing={0} flex={1}>
                              <HStack justify="space-between">
                                <Text fontWeight="medium" fontSize="sm">
                                  {getClientDisplayName(client)}
                                  {client.sub_type && (
                                    <Badge ml={2} colorScheme="purple" fontWeight="normal" fontSize="xs">
                                      {client.sub_type}
                                    </Badge>
                                  )}
                                </Text>
                                {total && (
                                  <Text fontSize="sm" fontWeight="bold" color="brand.600">
                                    {total} €
                                  </Text>
                                )}
                              </HStack>
                              <HStack spacing={3} mt={1} flexWrap="wrap">
                                <Text fontSize="xs" color="gray.500">
                                  {entry.heures} h × {entry.tarifHoraire} €/h
                                  {montantHeures ? ` = ${montantHeures} €` : ''}
                                </Text>
                                {parseFloat(entry.km) > 0 && (
                                  <Text fontSize="xs" color="gray.500">
                                    · {entry.km} km × {entry.baremeKm} €/km
                                    {montantKm ? ` = ${montantKm} €` : ''}
                                  </Text>
                                )}
                                {parseFloat(entry.tempsAReporter) > 0 && (
                                  <Text fontSize="xs" color="orange.500">
                                    · Reporter : {entry.tempsAReporter} h
                                  </Text>
                                )}
                              </HStack>
                            </Stack>
                          </HStack>
                        );
                      })}
                    </Stack>
                  )}
                </>
              )}
            </Stack>
          )}

          {/* ===== STEP 2: CONFIRMATION EMAIL ===== */}
          {step === 2 && (
            <Stack spacing={4}>
              <Text color="brand.600" fontWeight="medium">
                Envoi du récapitulatif pour{' '}
                {new Date(`${mois}-01`).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
                {' '}— {selectedEntries.length} client(s) sélectionné(s)
              </Text>

              <Divider />

              <Stack spacing={3}>
                {selectedEntries.map(e => {
                  const montantHeures =
                    e.heures && e.tarifHoraire
                      ? (parseFloat(e.heures) * parseFloat(e.tarifHoraire)).toFixed(2)
                      : '0.00';
                  const montantKm =
                    e.km && e.baremeKm
                      ? (parseFloat(e.km) * parseFloat(e.baremeKm)).toFixed(2)
                      : '0.00';
                  const total = (parseFloat(montantHeures) + parseFloat(montantKm)).toFixed(2);
                  const emailOptions = getEmailOptions(e.client);

                  return (
                    <Box
                      key={e.client.id}
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <HStack justify="space-between" mb={2}>
                        <Text fontWeight="medium" fontSize="sm">
                          {getClientDisplayName(e.client)}
                          {e.client.sub_type && (
                            <Badge ml={2} colorScheme="purple" fontWeight="normal" fontSize="xs">
                              {e.client.sub_type}
                            </Badge>
                          )}
                        </Text>
                        <Text fontSize="sm" color="brand.600" fontWeight="bold">
                          {total} €
                        </Text>
                      </HStack>
                      <FormControl>
                        <FormLabel fontSize="xs" color="gray.500" mb={1}>
                          Envoyer à
                        </FormLabel>
                        {emailOptions.length > 0 ? (
                          <Select
                            size="sm"
                            value={selectedEmails[e.client.id] || ''}
                            onChange={ev =>
                              setSelectedEmails(prev => ({ ...prev, [e.client.id]: ev.target.value }))
                            }
                          >
                            {emailOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Text fontSize="xs" color="red.400">
                            Aucune adresse email renseignée
                          </Text>
                        )}
                      </FormControl>
                    </Box>
                  );
                })}
              </Stack>

              <Divider />

              <Button
                colorScheme="accent"
                onClick={handleSendEmail}
                isLoading={isSendingEmail}
                loadingText="Envoi en cours..."
              >
                Envoyer récapitulatif par email
              </Button>
            </Stack>
          )}
        </ModalBody>

        <ModalFooter gap={3}>
          {step === 1 && (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                colorScheme="brand"
                onClick={goToStep2}
                isDisabled={selectedClientIds.size === 0}
              >
                Envoyer par email ({selectedClientIds.size} sélectionné{selectedClientIds.size > 1 ? 's' : ''})
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button colorScheme="brand" onClick={handleClose}>
                Fermer
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
