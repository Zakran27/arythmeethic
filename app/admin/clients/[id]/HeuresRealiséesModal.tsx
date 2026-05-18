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
  Input,
  Stack,
  Grid,
  GridItem,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';

export interface HeuresInitial {
  mois: string; // 'YYYY-MM' or 'YYYY-MM-DD'
  heures: number | string;
  tarif_horaire: number | string;
  km?: number | string;
  bareme_km?: number | string;
  temps_a_reporter?: number | string;
}

interface HeuresRealiséesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
  clientTarifHoraire?: number;
  clientDistanceKm?: number;
  defaultBaremeKm?: string;
  initial?: HeuresInitial | null; // when provided, modal is in "edit" mode
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
    } else {
      setMois(defaultMois);
      setHeures('');
      setTarifHoraire(clientTarifHoraire?.toString() ?? '');
      setNbDeplacements('0');
      setBaremeKm(defaultBaremeKm);
      setTempsAReporter('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial]);

  // km calculés automatiquement depuis nb_deplacements × distance_km du client
  const kmCalcules =
    clientDistanceKm && nbDeplacements
      ? (parseFloat(nbDeplacements) * clientDistanceKm).toFixed(1)
      : null;

  const montantHeures =
    heures && tarifHoraire ? (parseFloat(heures) * parseFloat(tarifHoraire)).toFixed(2) : '-';
  const montantKm =
    kmCalcules && baremeKm ? (parseFloat(kmCalcules) * parseFloat(baremeKm)).toFixed(2) : '-';
  const total =
    heures && tarifHoraire && kmCalcules && baremeKm
      ? (
          parseFloat(heures) * parseFloat(tarifHoraire) +
          parseFloat(kmCalcules) * parseFloat(baremeKm)
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

    setIsSubmitting(true);
    try {
      const km = kmCalcules ?? '0';
      const res = await fetch('/api/heures-realisees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          mois,
          heures,
          tarifHoraire,
          km,
          baremeKm: baremeKm || '0',
          tempsAReporter: tempsAReporter || '0',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

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
      onClose();
      setMois(defaultMois);
      setHeures('');
      setTarifHoraire(clientTarifHoraire?.toString() ?? '');
      setNbDeplacements('0');
      setBaremeKm(defaultBaremeKm);
      setTempsAReporter('');
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
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

            {/* Récapitulatif */}
            <Stack spacing={1} bg="gray.50" borderRadius="md" p={3} fontSize="sm">
              <Grid templateColumns="1fr 1fr" gap={2}>
                <Text color="gray.600">Montant heures :</Text>
                <Text fontWeight="medium">
                  {montantHeures !== '-' ? `${montantHeures} €` : '-'}
                </Text>
                <Text color="gray.600">Montant km :</Text>
                <Text fontWeight="medium">{montantKm !== '-' ? `${montantKm} €` : '-'}</Text>
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
