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
import { useState } from 'react';

interface HeuresRealiséesModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

export function HeuresRealiséesModal({ isOpen, onClose, clientId, onSuccess }: HeuresRealiséesModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to current month
  const now = new Date();
  const defaultMois = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [mois, setMois] = useState(defaultMois);
  const [heures, setHeures] = useState('');
  const [tarifHoraire, setTarifHoraire] = useState('');
  const [km, setKm] = useState('0');
  const [baremeKm, setBaremeKm] = useState('0.636');

  const montantHeures = heures && tarifHoraire ? (parseFloat(heures) * parseFloat(tarifHoraire)).toFixed(2) : '—';
  const montantKm = km && baremeKm ? (parseFloat(km) * parseFloat(baremeKm)).toFixed(2) : '—';
  const total =
    heures && tarifHoraire && km && baremeKm
      ? (parseFloat(heures) * parseFloat(tarifHoraire) + parseFloat(km) * parseFloat(baremeKm)).toFixed(2)
      : '—';

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
      const res = await fetch('/api/heures-realisees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          mois,
          heures,
          tarifHoraire,
          km: km || '0',
          baremeKm: baremeKm || '0',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      toast({
        title: 'Heures enregistrées',
        description: 'Les heures réalisées ont été sauvegardées.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onSuccess();
      onClose();
      // Reset
      setMois(defaultMois);
      setHeures('');
      setTarifHoraire('');
      setKm('0');
      setBaremeKm('0.636');
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
          Déclarer les heures réalisées
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
                  <FormLabel>Kilomètres réalisés</FormLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="Ex : 45"
                    value={km}
                    onChange={e => setKm(e.target.value)}
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
            </Grid>

            {/* Récapitulatif */}
            <Stack spacing={1} bg="gray.50" borderRadius="md" p={3} fontSize="sm">
              <Grid templateColumns="1fr 1fr" gap={2}>
                <Text color="gray.600">Montant heures :</Text>
                <Text fontWeight="medium">{montantHeures !== '—' ? `${montantHeures} €` : '—'}</Text>
                <Text color="gray.600">Montant km :</Text>
                <Text fontWeight="medium">{montantKm !== '—' ? `${montantKm} €` : '—'}</Text>
                <Text color="gray.600" fontWeight="bold">Total :</Text>
                <Text fontWeight="bold" color="brand.500">{total !== '—' ? `${total} €` : '—'}</Text>
              </Grid>
            </Stack>
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            colorScheme="accent"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Enregistrer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
