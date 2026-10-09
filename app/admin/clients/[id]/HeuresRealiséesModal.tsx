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
  HStack,
  Text,
  FormHelperText,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { computeReports, formatHeures } from '@/lib/heures-report';
import type { HeureRealisee } from '@/types';

const pad = (n: number) => String(n).padStart(2, '0');
const todayLocal = () => {
  const d = new Date(); // date locale (toISOString serait en UTC)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

interface HeuresRealiséesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
  clientTarifHoraire?: number;
  clientDistanceKm?: number;
  defaultBaremeKm?: string;
  initial?: HeureRealisee | null; // when provided, modal is in "edit" mode
  heuresRows: HeureRealisee[]; // tout l'historique du client, pour l'aperçu du report
}

export function HeuresRealiséesModal({
  isOpen,
  onClose,
  clientId,
  onSuccess,
  clientTarifHoraire,
  clientDistanceKm,
  defaultBaremeKm = '0.636',
  initial,
  heuresRows,
}: HeuresRealiséesModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const now = new Date();
  const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isEditing = !!initial;

  const [mois, setMois] = useState(defaultMois);
  const [heures, setHeures] = useState('');
  const [tarifHoraire, setTarifHoraire] = useState(clientTarifHoraire?.toString() ?? '');
  const [nbDeplacements, setNbDeplacements] = useState('0');
  const [baremeKm, setBaremeKm] = useState(defaultBaremeKm);
  const [tempsAReporter, setTempsAReporter] = useState('');
  const [casAnnulation, setCasAnnulation] = useState(false);
  const [heuresAnnulation, setHeuresAnnulation] = useState('');
  const [reportIn, setReportIn] = useState(''); // '' = automatique (prévisionnel)
  const [premierRdv, setPremierRdv] = useState(false);
  const [premierRdvDate, setPremierRdvDate] = useState('');
  const [premierRdvHeures, setPremierRdvHeures] = useState('');

  // When opening in edit mode, pre-fill from existing entry.
  useEffect(() => {
    if (!isOpen) return;
    if (initial) {
      const moisStr = String(initial.mois).slice(0, 7); // 'YYYY-MM'
      setMois(moisStr);
      setHeures(String(initial.heures ?? ''));
      setTarifHoraire(String(initial.tarif_horaire ?? clientTarifHoraire ?? ''));
      const kmValue = Number(initial.km ?? 0);
      if (clientDistanceKm && clientDistanceKm > 0) {
        // Reverse-derive number of trips from total km
        const trips = kmValue / clientDistanceKm;
        setNbDeplacements(Number.isFinite(trips) ? String(Math.round(trips * 100) / 100) : '0');
      } else {
        setNbDeplacements('0');
      }
      setBaremeKm(String(initial.bareme_km ?? defaultBaremeKm));
      setTempsAReporter(initial.temps_a_reporter != null ? String(initial.temps_a_reporter) : '');
      const annul = Number(initial.heures_annulation ?? 0);
      setCasAnnulation(annul > 0);
      setHeuresAnnulation(annul > 0 ? String(annul) : '');
      setReportIn(initial.report_in != null ? String(initial.report_in) : '');
      const rdvH = Number(initial.premier_rdv_heures ?? 0);
      setPremierRdv(rdvH > 0);
      setPremierRdvDate(initial.premier_rdv_date ?? todayLocal());
      setPremierRdvHeures(rdvH > 0 ? String(rdvH) : '');
    } else {
      setMois(defaultMois);
      setHeures('');
      setTarifHoraire(clientTarifHoraire?.toString() ?? '');
      setNbDeplacements('0');
      setBaremeKm(defaultBaremeKm);
      setTempsAReporter('');
      setCasAnnulation(false);
      setHeuresAnnulation('');
      setReportIn('');
      setPremierRdv(false);
      setPremierRdvDate(todayLocal());
      setPremierRdvHeures('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  // km calculés automatiquement depuis nb_deplacements × distance_km du client
  const kmCalcules =
    clientDistanceKm && nbDeplacements
      ? (parseFloat(nbDeplacements) * clientDistanceKm).toFixed(1)
      : null;

  // Aperçu du report : cette déclaration remplace la ligne du mois dans l'historique.
  const moisIso = `${mois}-01`;
  const existing = heuresRows.find(h => h.mois === moisIso);
  const formRow = {
    mois: moisIso,
    heures: parseFloat(heures) || 0,
    heures_annulation: casAnnulation ? parseFloat(heuresAnnulation) || 0 : 0,
    temps_a_reporter: parseFloat(tempsAReporter) || 0,
    premier_rdv_heures: premierRdv ? parseFloat(premierRdvHeures) || 0 : 0,
    premier_rdv_date: premierRdv ? premierRdvDate || null : null,
    sans_declaration: existing?.sans_declaration,
  };
  const others = heuresRows.filter(h => h.mois !== moisIso);
  const lineFor = (report_in: number | null) =>
    computeReports([...others, { ...formRow, report_in }]).find(l => l.mois === moisIso)!;
  const autoLine = lineFor(null);
  // Un mois envoyé n'est jamais recalculé : champ vidé = on garde la valeur envoyée.
  const isSent = !!initial?.recap_email_sent_at;
  const reportInValue =
    reportIn === ''
      ? isSent
        ? (initial?.report_in ?? 0)
        : null
      : Math.max(0, parseFloat(reportIn) || 0);
  // En création, l'upsert ne touche pas au report déjà figé d'un mois existant.
  const line = lineFor(isEditing ? reportInValue : (existing?.report_in ?? null));
  const prevu = `${formatHeures(autoLine.reportIn)} prévue${autoLine.reportIn >= 2 ? 's' : ''}`;

  const montantHeures =
    heures && tarifHoraire
      ? ((parseFloat(heures) + line.reportIn) * parseFloat(tarifHoraire)).toFixed(2)
      : '-';
  const montantKm =
    kmCalcules && baremeKm ? (parseFloat(kmCalcules) * parseFloat(baremeKm)).toFixed(2) : '-';
  const montantAnnulation =
    casAnnulation && heuresAnnulation && tarifHoraire
      ? (parseFloat(heuresAnnulation) * parseFloat(tarifHoraire)).toFixed(2)
      : '-';
  const total =
    heures && tarifHoraire && kmCalcules && baremeKm
      ? (
          (parseFloat(heures) + line.reportIn) * parseFloat(tarifHoraire) +
          parseFloat(kmCalcules) * parseFloat(baremeKm) +
          (casAnnulation && heuresAnnulation
            ? parseFloat(heuresAnnulation) * parseFloat(tarifHoraire)
            : 0)
        ).toFixed(2)
      : '-';

  const handleSubmit = async () => {
    if (!mois || !heures || !tarifHoraire) {
      toast({
        title: 'Champs requis',
        description: 'Veuillez renseigner le mois, les heures et le tarif horaire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    if (premierRdv && (!premierRdvDate || !(parseFloat(premierRdvHeures) > 0))) {
      toast({
        title: 'Premier rendez-vous',
        description: 'Veuillez renseigner la date et la durée du premier rendez-vous.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        client_id: clientId,
        mois: moisIso,
        heures: parseFloat(heures),
        tarif_horaire: parseFloat(tarifHoraire),
        km: parseFloat(kmCalcules ?? '0'),
        bareme_km: parseFloat(baremeKm) || 0,
        temps_a_reporter: formRow.temps_a_reporter,
        heures_annulation: formRow.heures_annulation,
        premier_rdv_heures: formRow.premier_rdv_heures,
        premier_rdv_date: formRow.premier_rdv_date,
      };
      // report_in seulement en édition : en création, un upsert sur un mois existant ne doit
      // pas remettre à « prévisionnel » un report déjà figé.
      if (isEditing) payload.report_in = reportInValue;
      const { error } = await createClient()
        .from('heures_realisees')
        .upsert(payload, { onConflict: 'client_id,mois' });
      if (error) throw new Error(error.message);

      toast({
        title: isEditing ? 'Heures modifiées' : 'Heures enregistrées',
        description: isEditing
          ? 'La déclaration a été mise à jour.'
          : 'Les heures réalisées ont été sauvegardées.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onSuccess();
      onClose(); // le formulaire est réinitialisé à la prochaine ouverture
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          {isEditing ? 'Modifier la déclaration' : 'Déclarer les heures réalisées'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl isRequired>
              <FormLabel>Mois</FormLabel>
              <Input
                type="month"
                value={mois}
                onChange={e => setMois(e.target.value)}
                isReadOnly={isEditing}
                bg={isEditing ? 'gray.50' : undefined}
              />
            </FormControl>

            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Heures réalisées</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Ex : 12"
                    value={heures}
                    onChange={e => setHeures(e.target.value)}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Tarif horaire net (€/h)</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Ex : 25.50"
                    value={tarifHoraire}
                    onChange={e => setTarifHoraire(e.target.value)}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Nombre de déplacements</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Ex : 8"
                    value={nbDeplacements}
                    onChange={e => setNbDeplacements(e.target.value)}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>
                    Km calculés{clientDistanceKm ? ` (${clientDistanceKm} km/dépl.)` : ''}
                  </FormLabel>
                  <Input
                    value={kmCalcules !== null ? `${kmCalcules} km` : '- (distance non renseignée)'}
                    isReadOnly
                    bg="gray.50"
                    color={kmCalcules !== null ? 'inherit' : 'gray.400'}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Barème km (€/km)</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.001"
                    placeholder="Ex : 0.636"
                    value={baremeKm}
                    onChange={e => setBaremeKm(e.target.value)}
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl>
                  <FormLabel>Temps à reporter (h)</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder="Ex : 0.5"
                    value={tempsAReporter}
                    onChange={e => setTempsAReporter(e.target.value)}
                  />
                </FormControl>
              </GridItem>
            </Grid>

            {isEditing && (
              <FormControl>
                <FormLabel>Heures reportées facturées ce mois (compteur)</FormLabel>
                <HStack>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder={isSent ? formatHeures(initial?.report_in ?? 0) : `Auto : ${prevu}`}
                    value={reportIn}
                    onChange={e => setReportIn(e.target.value)}
                  />
                  {!isSent && (
                    <Button size="sm" variant="outline" onClick={() => setReportIn('')}>
                      Auto
                    </Button>
                  )}
                </HStack>
                <FormHelperText>
                  {isSent ? '' : `Vide = calcul automatique (${prevu}). `}Une valeur saisie est
                  figée : elle corrige le solde du compteur, qui se recalcule pour les mois
                  suivants.
                </FormHelperText>
                {isSent && (
                  <Text fontSize="xs" color="orange.600" mt={1}>
                    Mois déjà envoyé : son report reste figé (pas de calcul automatique) et modifier
                    ce compteur ne renvoie pas l&apos;e-mail.
                  </Text>
                )}
              </FormControl>
            )}

            <Checkbox
              isChecked={casAnnulation}
              onChange={e => {
                setCasAnnulation(e.target.checked);
                if (!e.target.checked) setHeuresAnnulation('');
              }}
            >
              Cas d&apos;annulation ce mois-ci
            </Checkbox>
            {casAnnulation && (
              <FormControl>
                <FormLabel>Heures à facturer en cas d&apos;annulation</FormLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="Ex : 2"
                  value={heuresAnnulation}
                  onChange={e => setHeuresAnnulation(e.target.value)}
                />
              </FormControl>
            )}

            <Checkbox
              isChecked={premierRdv}
              onChange={e => {
                setPremierRdv(e.target.checked);
                if (!e.target.checked) setPremierRdvHeures('');
              }}
            >
              Premier rendez-vous ce mois-ci
            </Checkbox>
            {premierRdv && (
              <FormControl>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <FormLabel>Date du rendez-vous</FormLabel>
                    <Input
                      type="date"
                      value={premierRdvDate}
                      onChange={e => setPremierRdvDate(e.target.value)}
                    />
                  </GridItem>
                  <GridItem>
                    <FormLabel>Durée (h)</FormLabel>
                    <Input
                      type="number"
                      min="0"
                      step="0.25"
                      placeholder="Ex : 1.5"
                      value={premierRdvHeures}
                      onChange={e => setPremierRdvHeures(e.target.value)}
                    />
                  </GridItem>
                </Grid>
                <FormHelperText>
                  Ne pas inclure cette durée dans « Heures réalisées » : non facturé ce mois-ci,
                  ajouté au compteur de report, puis facturé (heures entières) avec le prochain mois
                  qui facture du report, avec la mention « Premier rendez-vous réalisé le … » dans
                  le récapitulatif.
                </FormHelperText>
              </FormControl>
            )}

            {/* Récapitulatif */}
            <Stack spacing={1} bg="gray.50" borderRadius="md" p={3} fontSize="sm">
              <Grid templateColumns="1fr 1fr" gap={2}>
                <Text color="gray.600">Report intégré ce mois :</Text>
                <Text fontWeight="medium" fontStyle={line.auto ? 'italic' : undefined}>
                  +{formatHeures(line.reportIn)}
                  {line.auto ? ' (prévisionnel)' : ''}
                </Text>
                <Text color="gray.600">Compteur après ce mois :</Text>
                <Text fontWeight="medium" color={line.soldeApres < 0 ? 'red.500' : undefined}>
                  {formatHeures(line.soldeApres)}
                </Text>
                <Text color="gray.600">Montant heures :</Text>
                <Text fontWeight="medium">
                  {montantHeures !== '-' ? `${montantHeures} €` : '-'}
                </Text>
                <Text color="gray.600">Montant km :</Text>
                <Text fontWeight="medium">{montantKm !== '-' ? `${montantKm} €` : '-'}</Text>
                {casAnnulation && (
                  <>
                    <Text color="gray.600">Montant annulation :</Text>
                    <Text fontWeight="medium">
                      {montantAnnulation !== '-' ? `${montantAnnulation} €` : '-'}
                    </Text>
                  </>
                )}
                <Text color="gray.600" fontWeight="bold">
                  Total :
                </Text>
                <Text fontWeight="bold" color="brand.500">
                  {total !== '-' ? `${total} €` : '-'}
                </Text>
              </Grid>
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button colorScheme="accent" onClick={handleSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Mettre à jour' : 'Enregistrer'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
