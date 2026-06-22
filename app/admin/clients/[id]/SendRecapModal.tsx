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
  FormControl,
  FormLabel,
  Select,
  Stack,
  Text,
  Box,
  Badge,
  HStack,
  Radio,
  RadioGroup,
  Divider,
  useToast,
  Icon,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Client } from '@/types';

export interface HeureRow {
  id: string;
  mois: string; // 'YYYY-MM-DD'
  heures: number;
  tarif_horaire: number;
  km: number;
  bareme_km: number;
  temps_a_reporter?: number;
  heures_annulation?: number;
  report_in?: number;
  recap_email_sent_at?: string | null;
  recap_email_to?: string | null;
}

interface SendRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  heures: HeureRow[];
  onSuccess: () => void;
}

function moisLabel(moisIso: string): string {
  return new Date(moisIso + 'T00:00:00').toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}

function getClientDisplayName(c: Client): string {
  const first = c.first_name_jeune || c.first_name || '';
  const last = c.last_name_jeune || c.last_name || '';
  return `${first} ${last}`.trim();
}

function getEmailOptions(c: Client): { label: string; value: string }[] {
  const opts: { label: string; value: string }[] = [];
  if (c.email_parent1)
    opts.push({ label: `Parent 1 — ${c.email_parent1}`, value: c.email_parent1 });
  if (c.email_parent2)
    opts.push({ label: `Parent 2 — ${c.email_parent2}`, value: c.email_parent2 });
  if (c.email_jeune) opts.push({ label: `Jeune — ${c.email_jeune}`, value: c.email_jeune });
  if (c.email) opts.push({ label: `Principal — ${c.email}`, value: c.email });
  return opts;
}

function getDefaultEmail(c: Client): string {
  return c.email_parent1 || c.email_parent2 || c.email_jeune || c.email || '';
}

export function SendRecapModal({
  isOpen,
  onClose,
  client,
  heures,
  onSuccess,
}: SendRecapModalProps) {
  const toast = useToast();
  const emailOptions = useMemo(() => getEmailOptions(client), [client]);
  const unsent = useMemo(
    () =>
      heures
        .filter(h => !h.recap_email_sent_at)
        .slice()
        .sort((a, b) => (a.mois < b.mois ? -1 : a.mois > b.mois ? 1 : 0)),
    [heures]
  );

  const [selectedMois, setSelectedMois] = useState<string>('');
  const [destinataire, setDestinataire] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedMois(unsent[0]?.mois ?? '');
    setDestinataire(getDefaultEmail(client));
    setResult(null);
    setIsSending(false);
  }, [isOpen, unsent, client]);

  const selectedEntry = unsent.find(h => h.mois === selectedMois);

  const totalsForSelected = useMemo(() => {
    if (!selectedEntry) return null;
    const montantHeures = selectedEntry.heures * selectedEntry.tarif_horaire;
    const montantKm = selectedEntry.km * selectedEntry.bareme_km;
    const montantAnnulation =
      Number(selectedEntry.heures_annulation ?? 0) * selectedEntry.tarif_horaire;
    return {
      montantHeures,
      montantKm,
      montantAnnulation,
      total: montantHeures + montantKm + montantAnnulation,
    };
  }, [selectedEntry]);

  const handleSend = async () => {
    if (!selectedEntry || !destinataire) return;
    setIsSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/heures-realisees/recap-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entries: [
            {
              clientId: client.id,
              clientName: getClientDisplayName(client),
              parentEmail: destinataire,
              mois: selectedEntry.mois,
              heures: String(selectedEntry.heures),
              tarifHoraire: String(selectedEntry.tarif_horaire),
              km: String(selectedEntry.km),
              baremeKm: String(selectedEntry.bareme_km),
              heuresAnnulation: String(selectedEntry.heures_annulation ?? 0),
            },
          ],
        }),
      });
      const data = await res.json();
      const apiResult = data.results?.[0];
      const ok = apiResult?.ok === true;
      setResult({
        ok,
        error: ok ? undefined : apiResult?.error || data?.error || 'Erreur inconnue',
      });
      if (ok) {
        toast({
          title: 'Récapitulatif envoyé',
          description: `Email envoyé à ${destinataire}`,
          status: 'success',
          duration: 4000,
          isClosable: true,
        });
        onSuccess();
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Erreur réseau' });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Envoyer la déclaration mensuelle
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody overflowY="auto">
          {unsent.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Text color="gray.600" fontSize="sm">
                Toutes les déclarations ont déjà été envoyées sur la période affichée.
              </Text>
            </Box>
          ) : result ? (
            <Stack spacing={3}>
              <HStack
                p={3}
                bg={result.ok ? 'green.50' : 'red.50'}
                borderRadius="md"
                border="1px solid"
                borderColor={result.ok ? 'green.200' : 'red.200'}
                spacing={3}
              >
                <Icon
                  as={result.ok ? FiCheckCircle : FiXCircle}
                  color={result.ok ? 'green.500' : 'red.500'}
                  boxSize={5}
                />
                <Stack spacing={0} flex={1}>
                  <Text fontWeight="medium" fontSize="sm">
                    {result.ok ? 'Récapitulatif envoyé avec succès' : "Échec de l'envoi"}
                  </Text>
                  {!result.ok && result.error && (
                    <Text fontSize="xs" color="red.600">
                      {result.error}
                    </Text>
                  )}
                </Stack>
              </HStack>
            </Stack>
          ) : (
            <Stack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">Mois à envoyer</FormLabel>
                <RadioGroup value={selectedMois} onChange={setSelectedMois}>
                  <Stack spacing={2}>
                    {unsent.map(h => {
                      const total =
                        h.heures * h.tarif_horaire +
                        h.km * h.bareme_km +
                        Number(h.heures_annulation ?? 0) * h.tarif_horaire;
                      return (
                        <Box
                          key={h.id}
                          p={3}
                          bg={selectedMois === h.mois ? 'brand.50' : 'gray.50'}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={selectedMois === h.mois ? 'brand.200' : 'gray.200'}
                        >
                          <Radio value={h.mois} colorScheme="brand">
                            <HStack spacing={2} ml={2}>
                              <Text fontWeight="medium" fontSize="sm" textTransform="capitalize">
                                {moisLabel(h.mois)}
                              </Text>
                              <Badge colorScheme="gray" fontSize="xs">
                                {h.heures} h
                              </Badge>
                              <Text fontSize="xs" color="gray.500">
                                · Total {total.toFixed(2)} €
                              </Text>
                              {h.temps_a_reporter ? (
                                <Badge colorScheme="orange" fontSize="xs">
                                  +{h.temps_a_reporter}h à reporter
                                </Badge>
                              ) : null}
                            </HStack>
                          </Radio>
                        </Box>
                      );
                    })}
                  </Stack>
                </RadioGroup>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel fontSize="sm">Destinataire</FormLabel>
                {emailOptions.length > 0 ? (
                  <Select value={destinataire} onChange={e => setDestinataire(e.target.value)}>
                    {emailOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Text fontSize="sm" color="red.500">
                    Aucune adresse email renseignée pour ce client.
                  </Text>
                )}
              </FormControl>

              {selectedEntry && totalsForSelected && (
                <Box p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    Aperçu — {moisLabel(selectedEntry.mois)}
                  </Text>
                  <Stack spacing={0.5} fontSize="xs" color="gray.600">
                    <Text>
                      Heures : {selectedEntry.heures} h × {selectedEntry.tarif_horaire.toFixed(2)}{' '}
                      €/h = {totalsForSelected.montantHeures.toFixed(2)} €
                    </Text>
                    {selectedEntry.km > 0 && (
                      <Text>
                        Déplacement : {selectedEntry.km} km × {selectedEntry.bareme_km.toFixed(3)}{' '}
                        €/km = {totalsForSelected.montantKm.toFixed(2)} €
                      </Text>
                    )}
                    {Number(selectedEntry.heures_annulation ?? 0) > 0 && (
                      <Text>
                        Annulation : {selectedEntry.heures_annulation} h ×{' '}
                        {selectedEntry.tarif_horaire.toFixed(2)} €/h ={' '}
                        {totalsForSelected.montantAnnulation.toFixed(2)} €
                      </Text>
                    )}
                    <Text fontWeight="medium" color="brand.600" mt={1}>
                      Total brut : {totalsForSelected.total.toFixed(2)} €
                    </Text>
                    <Text fontSize="2xs" color="orange.600" mt={1}>
                      Si le cumul de temps à reporter atteint 1h ou plus, les heures correspondantes
                      seront ajoutées automatiquement à la facturation.
                    </Text>
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter gap={3}>
          {result ? (
            <Button colorScheme="brand" onClick={handleClose}>
              Terminer
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                colorScheme="accent"
                onClick={handleSend}
                isLoading={isSending}
                isDisabled={!selectedEntry || !destinataire || emailOptions.length === 0}
              >
                Envoyer
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
