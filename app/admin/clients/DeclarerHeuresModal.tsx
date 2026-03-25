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
  Stack,
  Grid,
  GridItem,
  Text,
  HStack,
  Divider,
  Badge,
  useToast,
  Box,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Client } from '@/types';

interface DeclarerHeuresModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  defaultBaremeKm?: string;
}

interface EntryForm {
  heures: string;
  nbDeplacements: string;
  tarifHoraire: string;
  tempsAReporter: string;
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

function getParentEmail(client: Client): string {
  return client.email_parent1 || client.email || '';
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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mois, setMois] = useState(defaultMois);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [baremeKm, setBaremeKm] = useState(defaultBaremeKm);
  const [entries, setEntries] = useState<Record<string, EntryForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);

  const particulierClients = clients.filter(
    c => c.type_client === 'Particulier' && c.client_status === 'Client'
  );

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

  const goToStep2 = () => {
    if (selectedClientIds.size === 0) {
      toast({
        title: 'Aucun client sélectionné',
        description: 'Veuillez sélectionner au moins un client.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const newEntries: Record<string, EntryForm> = {};
    for (const id of selectedClientIds) {
      const client = clients.find(c => c.id === id);
      newEntries[id] = {
        heures: '',
        nbDeplacements: '0',
        tarifHoraire: client?.tarif_horaire?.toString() ?? '',
        tempsAReporter: '',
      };
    }
    setEntries(newEntries);
    setStep(2);
  };

  const updateEntry = (clientId: string, field: keyof EntryForm, value: string) => {
    setEntries(prev => ({
      ...prev,
      [clientId]: { ...prev[clientId], [field]: value },
    }));
  };

  const handleSaveAll = async () => {
    for (const id of selectedClientIds) {
      const entry = entries[id];
      if (!entry.heures || !entry.tarifHoraire) {
        const client = clients.find(c => c.id === id);
        toast({
          title: 'Champs requis manquants',
          description: `Veuillez renseigner les heures et le tarif pour ${getClientDisplayName(client!)}`,
          status: 'warning',
          duration: 4000,
          isClosable: true,
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const results: SavedEntry[] = [];
      for (const id of selectedClientIds) {
        const client = clients.find(c => c.id === id)!;
        const entry = entries[id];
        const km =
          client.distance_km && entry.nbDeplacements
            ? (parseFloat(entry.nbDeplacements) * client.distance_km).toFixed(1)
            : '0';

        const res = await fetch('/api/heures-realisees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: id,
            mois,
            heures: entry.heures,
            tarifHoraire: entry.tarifHoraire,
            km,
            baremeKm: baremeKm || '0',
            tempsAReporter: entry.tempsAReporter || '0',
          }),
        });

        const data = await res.json();
        if (!data.success) throw new Error(`${getClientDisplayName(client)}: ${data.error}`);
        results.push({ client, ...entry, km, baremeKm });
      }

      setSavedEntries(results);
      setStep(3);

      toast({
        title: 'Heures enregistrées',
        description: `${results.length} déclaration(s) sauvegardée(s).`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/heures-realisees/recap-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois,
          entries: savedEntries.map(e => ({
            clientId: e.client.id,
            clientName: getClientDisplayName(e.client),
            parentEmail: getParentEmail(e.client),
            heures: e.heures,
            tarifHoraire: e.tarifHoraire,
            km: e.km,
            baremeKm: e.baremeKm,
          })),
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Emails envoyés',
        description: `Récapitulatif envoyé à ${savedEntries.length} parent(s).`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
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
    setSelectedClientIds(new Set());
    setBaremeKm(defaultBaremeKm);
    setEntries({});
    setSavedEntries([]);
    onClose();
  };

  const selectedClients = Array.from(selectedClientIds)
    .map(id => clients.find(c => c.id === id))
    .filter(Boolean) as Client[];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Déclarer les heures —{' '}
          {step === 1 ? 'Étape 1 : Sélection' : step === 2 ? 'Étape 2 : Saisie' : 'Étape 3 : Confirmation'}
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody overflowY="auto">
          {/* ===== STEP 1: SELECT CLIENTS ===== */}
          {step === 1 && (
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Mois concerné</FormLabel>
                <Input type="month" value={mois} onChange={e => setMois(e.target.value)} />
              </FormControl>

              <Divider />

              <Text fontWeight="medium" color="gray.700">
                Clients actifs — Particulier
              </Text>

              {particulierClients.length === 0 ? (
                <Text color="gray.500" fontSize="sm">
                  Aucun client Particulier actif trouvé.
                </Text>
              ) : (
                <Stack spacing={2}>
                  {particulierClients.map(client => (
                    <HStack
                      key={client.id}
                      p={3}
                      bg={selectedClientIds.has(client.id) ? 'brand.50' : 'gray.50'}
                      borderRadius="md"
                      border="1px solid"
                      borderColor={selectedClientIds.has(client.id) ? 'brand.200' : 'gray.200'}
                      cursor="pointer"
                      onClick={() => toggleClient(client.id)}
                    >
                      <Checkbox
                        isChecked={selectedClientIds.has(client.id)}
                        onChange={() => toggleClient(client.id)}
                        onClick={e => e.stopPropagation()}
                        colorScheme="brand"
                      />
                      <Stack spacing={0} flex={1}>
                        <Text fontWeight="medium" fontSize="sm">
                          {getClientDisplayName(client)}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {client.sub_type && (
                            <Badge size="sm" colorScheme="purple" mr={2}>
                              {client.sub_type}
                            </Badge>
                          )}
                          {client.tarif_horaire ? `${client.tarif_horaire} €/h` : 'Tarif non renseigné'}
                          {client.distance_km ? ` · ${client.distance_km} km` : ''}
                        </Text>
                      </Stack>
                    </HStack>
                  ))}
                </Stack>
              )}
            </Stack>
          )}

          {/* ===== STEP 2: FILL HOURS ===== */}
          {step === 2 && (
            <Stack spacing={5}>
              <HStack>
                <FormControl maxW="200px">
                  <FormLabel>Barème km (€/km)</FormLabel>
                  <Input
                    type="number"
                    step="0.001"
                    value={baremeKm}
                    onChange={e => setBaremeKm(e.target.value)}
                  />
                </FormControl>
              </HStack>

              <Divider />

              {selectedClients.map(client => {
                const entry = entries[client.id] || {
                  heures: '',
                  nbDeplacements: '0',
                  tarifHoraire: '',
                  tempsAReporter: '',
                };
                const km =
                  client.distance_km && entry.nbDeplacements
                    ? (parseFloat(entry.nbDeplacements || '0') * client.distance_km).toFixed(1)
                    : null;
                const montantHeures =
                  entry.heures && entry.tarifHoraire
                    ? (parseFloat(entry.heures) * parseFloat(entry.tarifHoraire)).toFixed(2)
                    : null;
                const montantKm =
                  km && baremeKm ? (parseFloat(km) * parseFloat(baremeKm)).toFixed(2) : null;
                const total =
                  montantHeures && montantKm
                    ? (parseFloat(montantHeures) + parseFloat(montantKm)).toFixed(2)
                    : null;

                return (
                  <Box key={client.id} p={4} border="1px solid" borderColor="gray.200" borderRadius="md">
                    <Text fontWeight="bold" mb={3} color="brand.600">
                      {getClientDisplayName(client)}
                      {client.sub_type && (
                        <Badge ml={2} colorScheme="purple" fontWeight="normal">
                          {client.sub_type}
                        </Badge>
                      )}
                    </Text>
                    <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                      <GridItem>
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Heures réalisées</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            size="sm"
                            placeholder="Ex : 12"
                            value={entry.heures}
                            onChange={e => updateEntry(client.id, 'heures', e.target.value)}
                          />
                        </FormControl>
                      </GridItem>
                      <GridItem>
                        <FormControl isRequired>
                          <FormLabel fontSize="sm">Tarif horaire net (€/h)</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            size="sm"
                            placeholder="Ex : 25.50"
                            value={entry.tarifHoraire}
                            onChange={e => updateEntry(client.id, 'tarifHoraire', e.target.value)}
                          />
                        </FormControl>
                      </GridItem>
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">Nb de déplacements</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            size="sm"
                            placeholder="Ex : 8"
                            value={entry.nbDeplacements}
                            onChange={e => updateEntry(client.id, 'nbDeplacements', e.target.value)}
                          />
                        </FormControl>
                      </GridItem>
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">
                            Km calculés{client.distance_km ? ` (${client.distance_km} km/dépl.)` : ''}
                          </FormLabel>
                          <Input
                            size="sm"
                            value={km !== null ? `${km} km` : '— (distance non renseignée)'}
                            isReadOnly
                            bg="gray.50"
                            color={km !== null ? 'inherit' : 'gray.400'}
                          />
                        </FormControl>
                      </GridItem>
                      <GridItem>
                        <FormControl>
                          <FormLabel fontSize="sm">Temps à reporter (h)</FormLabel>
                          <Input
                            type="number"
                            min="0"
                            step="0.25"
                            size="sm"
                            placeholder="Ex : 0.5"
                            value={entry.tempsAReporter}
                            onChange={e => updateEntry(client.id, 'tempsAReporter', e.target.value)}
                          />
                        </FormControl>
                      </GridItem>
                      <GridItem>
                        <Box p={2} bg="gray.50" borderRadius="md" mt={6} fontSize="sm">
                          <Text color="gray.600">
                            Heures : {montantHeures ? `${montantHeures} €` : '—'}
                          </Text>
                          <Text color="gray.600">
                            Km : {montantKm ? `${montantKm} €` : '—'}
                          </Text>
                          <Text fontWeight="bold" color="brand.600">
                            Total : {total ? `${total} €` : '—'}
                          </Text>
                        </Box>
                      </GridItem>
                    </Grid>
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* ===== STEP 3: CONFIRMATION ===== */}
          {step === 3 && (
            <Stack spacing={4}>
              <Text color="green.600" fontWeight="medium">
                ✓ {savedEntries.length} déclaration(s) enregistrée(s) pour{' '}
                {new Date(mois + '-01').toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>

              <Divider />

              <Stack spacing={2}>
                {savedEntries.map(e => {
                  const montantHeures = (parseFloat(e.heures) * parseFloat(e.tarifHoraire)).toFixed(2);
                  const montantKm = (parseFloat(e.km) * parseFloat(e.baremeKm)).toFixed(2);
                  const total = (parseFloat(montantHeures) + parseFloat(montantKm)).toFixed(2);
                  return (
                    <HStack key={e.client.id} justify="space-between" p={2} bg="gray.50" borderRadius="md">
                      <Text fontWeight="medium" fontSize="sm">
                        {getClientDisplayName(e.client)}
                      </Text>
                      <Text fontSize="sm" color="brand.600" fontWeight="bold">
                        {total} €
                      </Text>
                    </HStack>
                  );
                })}
              </Stack>

              <Divider />

              <Text fontSize="sm" color="gray.600">
                Envoyer un récapitulatif par email aux parents des clients sélectionnés.
              </Text>
              <Button
                colorScheme="accent"
                onClick={handleSendEmail}
                isLoading={isSendingEmail}
                loadingText="Envoi en cours..."
              >
                Envoyer récap email aux parents
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
              <Button colorScheme="brand" onClick={goToStep2} isDisabled={selectedClientIds.size === 0}>
                Suivant ({selectedClientIds.size} sélectionné{selectedClientIds.size > 1 ? 's' : ''})
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="ghost" onClick={() => setStep(1)}>
                Retour
              </Button>
              <Button colorScheme="accent" onClick={handleSaveAll} isLoading={isSubmitting}>
                Enregistrer tout
              </Button>
            </>
          )}
          {step === 3 && (
            <Button colorScheme="brand" onClick={handleClose}>
              Fermer
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
