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
import type { Client, HeureRealisee } from '@/types';
import { createClient } from '@/lib/supabase-client';
import {
  computeReports,
  formatHeures,
  getClientDisplayName,
  getDefaultEmail,
  getEmailOptions,
  moisLabel,
} from '@/lib/heures-report';

interface SendRecapModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  heures: HeureRealisee[];
  initialMois?: string; // présélection (bouton « Renvoyer » du tableau)
  onSuccess: () => void;
}

// Report de ce mois s'il était envoyé maintenant (figé → valeur enregistrée, sinon prévisionnel).
const sent = (h: HeureRealisee) => (h.recap_email_sent_at ? 1 : 0);
const lineFor = (heures: HeureRealisee[], mois: string) =>
  computeReports(heures, mois).find(l => l.mois === mois)!;

export function SendRecapModal({
  isOpen,
  onClose,
  client,
  heures,
  initialMois,
  onSuccess,
}: SendRecapModalProps) {
  const toast = useToast();
  const emailOptions = useMemo(() => getEmailOptions(client), [client]);
  // Mois non envoyés d'abord (du plus ancien), puis les envoyés (du plus récent) pour un renvoi.
  const months = useMemo(
    () =>
      heures
        .filter(h => !h.sans_declaration)
        .sort(
          (a, b) =>
            sent(a) - sent(b) ||
            (sent(a) ? b.mois.localeCompare(a.mois) : a.mois.localeCompare(b.mois))
        ),
    [heures]
  );

  const [selectedMois, setSelectedMois] = useState<string>('');
  const [destinataire, setDestinataire] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  // Seulement à l'ouverture : le rafraîchissement après envoi ne doit pas effacer le résultat.
  useEffect(() => {
    if (!isOpen) return;
    setSelectedMois(initialMois ?? months[0]?.mois ?? '');
    setDestinataire(getDefaultEmail(client));
    setResult(null);
    setIsSending(false);
  }, [isOpen]);

  const selectedEntry = months.find(h => h.mois === selectedMois);
  const isResend = !!selectedEntry?.recap_email_sent_at;
  const lines = useMemo(
    () => (selectedMois ? computeReports(heures, selectedMois) : []),
    [heures, selectedMois]
  );
  const line = lines.find(l => l.mois === selectedMois);
  // Mois antérieurs non envoyés qui retiennent du report : il ne sera pas facturé ici.
  const reportRetenu = lines.filter(l => l.mois < selectedMois && l.auto && l.reportIn > 0);

  const totalsForSelected = useMemo(() => {
    if (!selectedEntry || !line) return null;
    const montantHeures = selectedEntry.heures * selectedEntry.tarif_horaire;
    const montantReport = line.reportIn * selectedEntry.tarif_horaire;
    const montantKm = selectedEntry.km * selectedEntry.bareme_km;
    const montantAnnulation =
      Number(selectedEntry.heures_annulation ?? 0) * selectedEntry.tarif_horaire;
    return {
      montantHeures,
      montantReport,
      montantKm,
      montantAnnulation,
      total: montantHeures + montantReport + montantKm + montantAnnulation,
    };
  }, [selectedEntry, line]);

  const handleSend = async () => {
    if (!selectedEntry || !destinataire) return;
    setIsSending(true);
    setResult(null);
    try {
      // Les montants et le report sont relus en base par la route.
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
          title: isResend ? 'Récapitulatif renvoyé' : 'Récapitulatif envoyé',
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

  // Fige le report prévu de ce mois, sans envoyer d'e-mail.
  const handleFreeze = async () => {
    if (!selectedEntry || !line) return;
    setIsSending(true);
    const { error } = await createClient()
      .from('heures_realisees')
      .update({ report_in: line.reportIn })
      .eq('id', selectedEntry.id);
    setIsSending(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, status: 'error', isClosable: true });
      return;
    }
    toast({
      title: 'Compteur mis à jour',
      description: `Report de ${formatHeures(line.reportIn)} figé sur ${moisLabel(selectedEntry.mois)} (aucun e-mail envoyé).`,
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
    onSuccess();
    onClose();
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
          {months.length === 0 ? (
            <Box textAlign="center" py={6}>
              <Text color="gray.600" fontSize="sm">
                Aucune déclaration à envoyer.
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
                    {months.map(h => {
                      const report = lineFor(heures, h.mois).reportIn;
                      const total =
                        (h.heures + report) * h.tarif_horaire +
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
                            <HStack spacing={2} ml={2} flexWrap="wrap">
                              <Text fontWeight="medium" fontSize="sm" textTransform="capitalize">
                                {moisLabel(h.mois)}
                              </Text>
                              <Badge colorScheme="gray" fontSize="xs">
                                {h.heures} h
                              </Badge>
                              {report > 0 && (
                                <Badge colorScheme="orange" fontSize="xs">
                                  +{report} h report
                                </Badge>
                              )}
                              <Text fontSize="xs" color="gray.500">
                                · Total {total.toFixed(2)} €
                              </Text>
                              {h.recap_email_sent_at && (
                                <Badge colorScheme="green" fontSize="xs">
                                  Envoyé le{' '}
                                  {new Date(h.recap_email_sent_at).toLocaleDateString('fr-FR')}
                                </Badge>
                              )}
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

              {selectedEntry && line && totalsForSelected && (
                <Box p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                  <Text fontSize="xs" color="gray.500" mb={1}>
                    Aperçu — {moisLabel(selectedEntry.mois)}
                  </Text>
                  <Stack spacing={0.5} fontSize="xs" color="gray.600">
                    <Text>
                      Heures : {selectedEntry.heures} h × {selectedEntry.tarif_horaire.toFixed(2)}{' '}
                      €/h = {totalsForSelected.montantHeures.toFixed(2)} €
                    </Text>
                    {line.reportIn > 0 && (
                      <Text>
                        Heures reportées : {line.reportIn} h ×{' '}
                        {selectedEntry.tarif_horaire.toFixed(2)} €/h ={' '}
                        {totalsForSelected.montantReport.toFixed(2)} €{line.auto ? '' : ' (figé)'}
                      </Text>
                    )}
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
                    {line.premiersRdv.map(p => (
                      <Text key={p.date}>
                        Mention : premier rendez-vous réalisé le{' '}
                        {new Date(p.date + 'T00:00:00').toLocaleDateString('fr-FR')} (
                        {formatHeures(p.heures)})
                      </Text>
                    ))}
                    <Text fontWeight="medium" color="brand.600" mt={1}>
                      Total brut : {totalsForSelected.total.toFixed(2)} €
                    </Text>
                    <Text color={line.soldeApres < 0 ? 'red.500' : 'gray.500'}>
                      Compteur à reporter après ce mois : {formatHeures(line.soldeApres)}
                    </Text>
                    {reportRetenu.map(l => (
                      <Text key={l.mois} fontSize="2xs" color="orange.600">
                        {moisLabel(l.mois)} (non envoyé) retient +{formatHeures(l.reportIn)} de
                        report : envoyez-le (ou mettez à jour son compteur s&apos;il a été déclaré
                        avec ce report), sinon Modifier ce mois et saisir 0 dans « Heures reportées
                        facturées » pour libérer ce report.
                      </Text>
                    ))}
                    {isResend && (
                      <Text fontSize="2xs" color="orange.600" mt={1}>
                        Déjà envoyé : le renvoi reprend le report figé de ce mois (pas de recalcul).
                      </Text>
                    )}
                  </Stack>
                </Box>
              )}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter gap={3} flexWrap="wrap">
          {result ? (
            <Button colorScheme="brand" onClick={handleClose}>
              Terminer
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              {selectedEntry && selectedEntry.report_in == null && (
                <Button
                  variant="outline"
                  colorScheme="brand"
                  onClick={handleFreeze}
                  isLoading={isSending}
                  whiteSpace="normal"
                  h="auto"
                  py={2}
                  title="Fige le report de ce mois dans le compteur, sans envoyer d'e-mail"
                >
                  Mettre à jour le compteur (sans e-mail)
                </Button>
              )}
              <Button
                colorScheme="accent"
                onClick={handleSend}
                isLoading={isSending}
                isDisabled={!selectedEntry || !destinataire || emailOptions.length === 0}
              >
                {isResend ? 'Renvoyer' : 'Envoyer'}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
