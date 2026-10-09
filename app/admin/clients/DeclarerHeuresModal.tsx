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
  Icon,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import type { Client, HeureRealisee } from '@/types';
import { createClient } from '@/lib/supabase-client';
import {
  computeReports,
  getClientDisplayName,
  getDefaultEmail,
  getEmailOptions,
  moisLabel,
} from '@/lib/heures-report';

interface DeclarerHeuresModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
}

interface LoadedEntry {
  client: Client;
  row: HeureRealisee;
  history: HeureRealisee[]; // tout l'historique du client (le report en dépend)
  reportIn: number; // report facturé si on envoie ce mois seul (figé ou prévisionnel)
}

interface SendResult {
  clientName: string;
  email: string;
  ok: boolean;
  error?: string;
}

// Même calcul que la route d'envoi : heures + report + annulation + km.
function calcTotal(row: HeureRealisee, reportIn: number) {
  const montantH = (row.heures + reportIn) * row.tarif_horaire;
  const montantKm = row.km * row.bareme_km;
  const montantAnnul = Number(row.heures_annulation ?? 0) * row.tarif_horaire;
  return { montantH, montantKm, total: montantH + montantKm + montantAnnul };
}

export function DeclarerHeuresModal({ isOpen, onClose, clients }: DeclarerHeuresModalProps) {
  const toast = useToast();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

  const [screen, setScreen] = useState<1 | 2 | 3>(1);
  const [dateFrom, setDateFrom] = useState(lastMonth);
  const [dateTo, setDateTo] = useState(thisMonth);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<LoadedEntry[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<SendResult[]>([]);

  const entryKey = (e: LoadedEntry) => `${e.client.id}__${e.row.mois}`;

  const handleLoad = async () => {
    if (!dateFrom || !dateTo) {
      toast({ title: 'Sélectionnez une plage de dates', status: 'warning', duration: 3000, isClosable: true });
      return;
    }
    setIsLoading(true);
    setHasLoaded(false);
    setEntries([]);
    setSelectedKeys(new Set());
    setEmails({});
    try {
      // Historique complet (y compris après la période) : le report en dépend.
      const supabase = createClient();
      const { data, error } = await supabase
        .from('heures_realisees')
        .select('*')
        .order('mois', { ascending: false });

      if (error) throw new Error(error.message);

      const rows = (data ?? []) as HeureRealisee[];
      const loaded: LoadedEntry[] = [];
      const initEmails: Record<string, string> = {};
      for (const row of rows) {
        const client = clients.find(c => c.id === row.client_id);
        const inPeriod = row.mois >= `${dateFrom}-01` && row.mois <= `${dateTo}-01`;
        if (!client || !inPeriod || row.sans_declaration) continue;
        const history = rows.filter(r => r.client_id === row.client_id);
        const e: LoadedEntry = {
          client,
          row,
          history,
          reportIn: computeReports(history, row.mois).find(l => l.mois === row.mois)!.reportIn,
        };
        loaded.push(e);
        initEmails[entryKey(e)] = getDefaultEmail(client);
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

  const toggleEntry = (key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedKeys(selectedKeys.size === entries.length ? new Set() : new Set(entries.map(entryKey)));
  };

  const selectedEntries = entries.filter(e => selectedKeys.has(entryKey(e)));

  // La route envoie dans l'ordre de la liste et fige chaque mois envoyé : on projette pareil,
  // sinon deux mois d'un même client afficheraient la même heure de report (facturée une fois).
  const sendReports: Record<string, number> = {};
  const hist: Record<string, HeureRealisee[]> = {};
  for (const e of selectedEntries) {
    const h = hist[e.client.id] ?? e.history;
    const reportIn = computeReports(h, e.row.mois).find(l => l.mois === e.row.mois)!.reportIn;
    sendReports[entryKey(e)] = reportIn;
    hist[e.client.id] = h.map(r => (r.mois === e.row.mois ? { ...r, report_in: reportIn } : r));
  }
  const reportOf = (e: LoadedEntry) => sendReports[entryKey(e)] ?? e.reportIn;

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/heures-realisees/recap-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mois: dateTo,
          entries: selectedEntries.map(e => {
            const key = entryKey(e);
            // Les montants et le report sont relus en base par la route.
            return {
              clientId: e.client.id,
              clientName: getClientDisplayName(e.client),
              parentEmail: emails[key] || getDefaultEmail(e.client),
              mois: e.row.mois,
            };
          }),
        }),
      });

      const data = await res.json();

      const results: SendResult[] = selectedEntries.map((e, i) => {
        const key = entryKey(e);
        const apiResult = data.results?.[i];
        return {
          clientName: getClientDisplayName(e.client),
          email: emails[key] || getDefaultEmail(e.client),
          ok: apiResult?.ok ?? false,
          error: apiResult?.error,
        };
      });

      setSendResults(results);
      setScreen(3);
    } catch (err) {
      toast({ title: 'Erreur', description: err instanceof Error ? err.message : 'Erreur', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setScreen(1);
    setDateFrom(lastMonth);
    setDateTo(thisMonth);
    setIsLoading(false);
    setEntries([]);
    setHasLoaded(false);
    setSelectedKeys(new Set());
    setEmails({});
    setSendResults([]);
    onClose();
  };

  const allSelected = entries.length > 0 && selectedKeys.size === entries.length;
  const someSelected = selectedKeys.size > 0 && !allSelected;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Récapitulatif des heures
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody overflowY="auto">

          {/* ── ÉCRAN 1 : Recherche + sélection ── */}
          {screen === 1 && (
            <Stack spacing={4}>
              <HStack align="flex-end" spacing={3}>
                <FormControl flex={1}>
                  <FormLabel fontSize="sm">Du</FormLabel>
                  <Input type="month" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setHasLoaded(false); setEntries([]); }} />
                </FormControl>
                <FormControl flex={1}>
                  <FormLabel fontSize="sm">Au</FormLabel>
                  <Input type="month" value={dateTo} onChange={e => { setDateTo(e.target.value); setHasLoaded(false); setEntries([]); }} />
                </FormControl>
                <Button colorScheme="brand" onClick={handleLoad} isLoading={isLoading} loadingText="Chargement..." flexShrink={0}>
                  Rechercher
                </Button>
              </HStack>

              {isLoading && <Center py={8}><Spinner color="brand.500" size="lg" /></Center>}

              {hasLoaded && !isLoading && entries.length > 0 && (
                <>
                  <Divider />
                  <HStack justify="space-between">
                    <Text fontWeight="medium" color="gray.700" fontSize="sm">
                      {entries.length} déclaration(s) trouvée(s)
                    </Text>
                    <Checkbox isChecked={allSelected} isIndeterminate={someSelected} onChange={toggleAll} colorScheme="brand" fontSize="sm">
                      Tout sélectionner
                    </Checkbox>
                  </HStack>

                  <Stack spacing={2}>
                    {entries.map(entry => {
                      const key = entryKey(entry);
                      const isChecked = selectedKeys.has(key);
                      const reportIn = reportOf(entry);
                      const { montantH, montantKm, total } = calcTotal(entry.row, reportIn);

                      return (
                        <HStack
                          key={key}
                          p={3}
                          bg={isChecked ? 'brand.50' : 'gray.50'}
                          borderRadius="md"
                          border="1px solid"
                          borderColor={isChecked ? 'brand.200' : 'gray.200'}
                          cursor="pointer"
                          onClick={() => toggleEntry(key)}
                          align="flex-start"
                          spacing={3}
                        >
                          <Checkbox isChecked={isChecked} onChange={() => toggleEntry(key)} onClick={e => e.stopPropagation()} colorScheme="brand" mt={0.5} />
                          <Stack spacing={0.5} flex={1}>
                            <HStack justify="space-between">
                              <HStack spacing={2}>
                                <Text fontWeight="medium" fontSize="sm">{getClientDisplayName(entry.client)}</Text>
                                {entry.client.sub_type && <Badge colorScheme="purple" fontSize="xs">{entry.client.sub_type}</Badge>}
                                <Badge colorScheme="gray" fontSize="xs">{moisLabel(entry.row.mois)}</Badge>
                                {entry.row.recap_email_sent_at && <Badge colorScheme="green" fontSize="xs">Déjà envoyé</Badge>}
                              </HStack>
                              <Text fontSize="sm" fontWeight="bold" color="brand.600">{total.toFixed(2)} €</Text>
                            </HStack>
                            <Text fontSize="xs" color="gray.500">
                              {entry.row.heures} h{reportIn > 0 && ` + ${reportIn} h report`} × {entry.row.tarif_horaire} €/h = {montantH.toFixed(2)} €
                              {entry.row.km > 0 && ` · ${entry.row.km} km × ${entry.row.bareme_km} €/km = ${montantKm.toFixed(2)} €`}
                              {Number(entry.row.heures_annulation) > 0 && ` · Annulation : ${entry.row.heures_annulation} h`}
                              {Number(entry.row.temps_a_reporter) > 0 && ` · Reporter : ${entry.row.temps_a_reporter} h`}
                            </Text>
                          </Stack>
                        </HStack>
                      );
                    })}
                  </Stack>
                </>
              )}
            </Stack>
          )}

          {/* ── ÉCRAN 2 : Récapitulatif avant envoi ── */}
          {screen === 2 && (
            <Stack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Vérifiez les informations ci-dessous avant d'envoyer les récapitulatifs.
              </Text>
              <Divider />
              <Stack spacing={3}>
                {selectedEntries.map(entry => {
                  const key = entryKey(entry);
                  const reportIn = reportOf(entry);
                  const { montantH, montantKm, total } = calcTotal(entry.row, reportIn);
                  const emailOptions = getEmailOptions(entry.client);

                  return (
                    <Box key={key} p={4} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                      <HStack justify="space-between" mb={2}>
                        <HStack spacing={2}>
                          <Text fontWeight="semibold" fontSize="sm">{getClientDisplayName(entry.client)}</Text>
                          {entry.client.sub_type && <Badge colorScheme="purple" fontSize="xs">{entry.client.sub_type}</Badge>}
                          <Badge colorScheme="gray" fontSize="xs">{moisLabel(entry.row.mois)}</Badge>
                        </HStack>
                        <Text fontWeight="bold" color="brand.600">{total.toFixed(2)} €</Text>
                      </HStack>

                      <Stack spacing={0.5} mb={3}>
                        <Text fontSize="xs" color="gray.500">
                          Heures : {entry.row.heures} h{reportIn > 0 && ` + ${reportIn} h reportées`} × {entry.row.tarif_horaire} €/h = {montantH.toFixed(2)} €
                        </Text>
                        {entry.row.km > 0 && (
                          <Text fontSize="xs" color="gray.500">
                            Déplacement : {entry.row.km} km × {entry.row.bareme_km} €/km = {montantKm.toFixed(2)} €
                          </Text>
                        )}
                        {Number(entry.row.heures_annulation) > 0 && (
                          <Text fontSize="xs" color="gray.500">
                            Annulation : {entry.row.heures_annulation} h × {entry.row.tarif_horaire} €/h
                          </Text>
                        )}
                        {Number(entry.row.temps_a_reporter) > 0 && (
                          <Text fontSize="xs" color="orange.500">Temps à reporter : {entry.row.temps_a_reporter} h</Text>
                        )}
                      </Stack>

                      <FormControl>
                        <FormLabel fontSize="xs" color="gray.500" mb={1}>Destinataire</FormLabel>
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
                    </Box>
                  );
                })}
              </Stack>
            </Stack>
          )}

          {/* ── ÉCRAN 3 : Statut d'envoi ── */}
          {screen === 3 && (
            <Stack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                Résultat de l'envoi pour chaque client :
              </Text>
              <Divider />
              <Stack spacing={2}>
                {sendResults.map((r, i) => (
                  <HStack key={i} p={3} bg={r.ok ? 'green.50' : 'red.50'} borderRadius="md" border="1px solid" borderColor={r.ok ? 'green.200' : 'red.200'} spacing={3}>
                    <Icon as={r.ok ? FiCheckCircle : FiXCircle} color={r.ok ? 'green.500' : 'red.500'} boxSize={5} flexShrink={0} />
                    <Stack spacing={0} flex={1}>
                      <Text fontWeight="medium" fontSize="sm">{r.clientName}</Text>
                      <Text fontSize="xs" color="gray.500">{r.email}</Text>
                      {!r.ok && r.error && (
                        <Text fontSize="xs" color="red.500" mt={0.5}>{r.error}</Text>
                      )}
                    </Stack>
                    <Badge colorScheme={r.ok ? 'green' : 'red'} flexShrink={0}>
                      {r.ok ? 'Envoyé' : 'Échec'}
                    </Badge>
                  </HStack>
                ))}
              </Stack>
              {sendResults.every(r => r.ok) && (
                <Text fontSize="sm" color="green.600" fontWeight="medium" textAlign="center">
                  ✓ Tous les récapitulatifs ont été envoyés avec succès.
                </Text>
              )}
              {sendResults.some(r => !r.ok) && (
                <Text fontSize="sm" color="orange.600" fontWeight="medium" textAlign="center">
                  Certains emails n'ont pas pu être envoyés. Vérifiez les adresses email.
                </Text>
              )}
            </Stack>
          )}

        </ModalBody>

        <ModalFooter gap={3}>
          {screen === 1 && (
            <>
              <Button variant="ghost" onClick={handleClose}>Annuler</Button>
              <Button
                colorScheme="brand"
                onClick={() => setScreen(2)}
                isDisabled={selectedKeys.size === 0}
              >
                Continuer ({selectedKeys.size} sélectionné{selectedKeys.size > 1 ? 's' : ''})
              </Button>
            </>
          )}
          {screen === 2 && (
            <>
              <Button variant="ghost" onClick={() => setScreen(1)}>Retour</Button>
              <Button
                colorScheme="accent"
                onClick={handleSend}
                isLoading={isSending}
                loadingText="Envoi en cours..."
                leftIcon={<Icon as={FiClock} />}
              >
                Envoyer les récapitulatifs
              </Button>
            </>
          )}
          {screen === 3 && (
            <Button colorScheme="brand" onClick={handleClose}>Terminer</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
