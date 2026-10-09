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
  FormHelperText,
  Input,
  Select,
  Stack,
  HStack,
  Text,
  Checkbox,
  CheckboxGroup,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import type { Client } from '@/types';

const LABELS = { parent1: 'Parent 1', parent2: 'Parent 2', jeune: 'Jeune' } as const;
type Member = keyof typeof LABELS;

// Membres de la famille ayant un email (les routes relisent les adresses sur la fiche)
function familyWithEmail(c: Client) {
  return (Object.keys(LABELS) as Member[])
    .map(key => ({
      key,
      label: LABELS[key],
      first: c[`first_name_${key}`],
      last: c[`last_name_${key}`],
      email: c[`email_${key}`],
    }))
    .filter(m => m.email);
}
const memberLabel = (m: ReturnType<typeof familyWithEmail>[number]) =>
  `${[m.first, m.last].filter(Boolean).join(' ')} <${m.email}> (${m.label})`;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onSuccess: () => void;
}

// POST vers une route de lancement ; toast de succès / d'erreur. Renvoie true si OK.
function useLaunch() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const launch = async (url: string, body: object, successMessage: string) => {
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur lors du lancement');
      toast({
        title: 'Procédure lancée',
        description: successMessage,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      return true;
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return false;
    } finally {
      setLoading(false);
    }
  };
  return { launch, loading };
}

export function ConfirmationAccompagnementModal({
  isOpen,
  onClose,
  client,
  onSuccess,
}: ModalProps) {
  const members = familyWithEmail(client);
  const [recipient, setRecipient] = useState<Member | ''>('');
  const { launch, loading } = useLaunch();

  useEffect(() => {
    if (isOpen) setRecipient(members[0]?.key ?? ''); // parent 1 par défaut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    const ok = await launch(
      '/api/procedures/confirmation-accompagnement',
      { clientId: client.id, recipient },
      "L'email de confirmation d'accompagnement a été envoyé."
    );
    if (ok) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Confirmation accompagnement
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <Text fontSize="sm" color="brand.600">
              Un email sera envoyé avec un lien (valable 30 jours) pour confirmer ou non le souhait
              d&apos;accompagnement. Une réponse « Oui » passe la fiche en Client. La réponse
              s&apos;affiche en haut de la fiche.
            </Text>
            <FormControl isRequired>
              <FormLabel color="brand.600">Destinataire</FormLabel>
              <Select
                placeholder="Sélectionner un destinataire"
                value={recipient}
                onChange={e => setRecipient(e.target.value as Member)}
              >
                {members.map(m => (
                  <option key={m.key} value={m.key}>
                    {memberLabel(m)}
                  </option>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Annuler
          </Button>
          <Button
            colorScheme="accent"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Envoi en cours..."
            isDisabled={!recipient}
          >
            Confirmer et envoyer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export function DebutAccompagnementModal({ isOpen, onClose, client, onSuccess }: ModalProps) {
  const members = familyWithEmail(client);
  const [recipients, setRecipients] = useState<Member[]>([]);
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const { launch, loading } = useLaunch();

  useEffect(() => {
    if (!isOpen) return;
    setRecipients(members.map(m => m.key)); // tous cochés par défaut
    setDate('');
    setHeure('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSubmit = async () => {
    const ok = await launch(
      '/api/procedures/debut-accompagnement',
      {
        clientId: client.id,
        recipients,
        premierCoursDate: date || undefined,
        premierCoursHeure: (date && heure) || undefined,
      },
      `Un email a été envoyé à ${recipients.length} destinataire(s).`
    );
    if (ok) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Début accompagnement
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            <Text fontSize="sm" color="brand.600">
              Un seul email est envoyé à toutes les personnes cochées, avec la liste du matériel à
              préparer.
            </Text>
            <FormControl isRequired>
              <FormLabel color="brand.600">Destinataires</FormLabel>
              {members.length === 0 ? (
                <Text fontSize="sm" color="red.500">
                  Aucun email renseigné sur la fiche.
                </Text>
              ) : (
                <CheckboxGroup
                  colorScheme="accent"
                  value={recipients}
                  onChange={v => setRecipients(v as Member[])}
                >
                  <Stack spacing={2}>
                    {members.map(m => (
                      <Checkbox key={m.key} value={m.key}>
                        <Text fontSize="sm">{memberLabel(m)}</Text>
                      </Checkbox>
                    ))}
                  </Stack>
                </CheckboxGroup>
              )}
            </FormControl>
            <FormControl>
              <FormLabel color="brand.600">Premier cours (facultatif)</FormLabel>
              <HStack>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
                <Input
                  type="time"
                  value={heure}
                  onChange={e => setHeure(e.target.value)}
                  isDisabled={!date}
                />
              </HStack>
              <FormHelperText>
                Si renseigné, l&apos;email annonce la date du premier cours (créneau de base).
              </FormHelperText>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Annuler
          </Button>
          <Button
            colorScheme="accent"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Envoi en cours..."
            isDisabled={recipients.length === 0}
          >
            Confirmer et envoyer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
