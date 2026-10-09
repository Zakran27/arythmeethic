'use client';

import { use, useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  VStack,
  Stack,
} from '@chakra-ui/react';

export default function ConfirmationAccompagnementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [info, setInfo] = useState<{ jeunePrenom: string | null; anneeScolaire: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null); // lien invalide / expiré / déjà répondu
  const [submitError, setSubmitError] = useState<string | null>(null); // échec d'envoi : on peut réessayer
  const [submitting, setSubmitting] = useState<boolean | null>(null); // réponse en cours d'envoi
  const [answer, setAnswer] = useState<boolean | null>(null); // réponse enregistrée

  useEffect(() => {
    fetch(`/api/formulaire/confirmation-accompagnement?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => (data.success ? setInfo(data) : setError(data.error || 'Lien invalide')))
      .catch(() => setError('Erreur lors du chargement'));
  }, [token]);

  const submit = async (confirme: boolean) => {
    setSubmitting(confirme);
    setSubmitError(null);
    try {
      const res = await fetch('/api/formulaire/confirmation-accompagnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirme }),
      });
      const data = await res.json();
      if (data.success) setAnswer(confirme);
      // 410 = déjà répondu / lien expiré : plus rien à faire ; sinon les boutons restent
      else if (res.status === 410) setError(data.error);
      else setSubmitError(data.error || "Erreur lors de l'envoi, veuillez réessayer");
    } catch {
      setSubmitError("Erreur lors de l'envoi, veuillez réessayer");
    } finally {
      setSubmitting(null);
    }
  };

  const shell = (children: React.ReactNode) => (
    <Box minH="100vh" bg="sand.50" py={12} px={4}>
      <Container maxW="lg">
        <VStack spacing={6}>
          <Box textAlign="center">
            <Heading size="xl" color="brand.500" fontFamily="heading" mb={2}>
              A Rythme Ethic
            </Heading>
            <Text color="terracotta.400" fontSize="lg">
              Souhait d&apos;accompagnement
            </Text>
          </Box>
          <Box bg="white" p={8} borderRadius="xl" shadow="sm" w="100%">
            {children}
          </Box>
          <Text fontSize="sm" color="gray.500">
            Florence Louazel - A Rythme Ethic
          </Text>
        </VStack>
      </Container>
    </Box>
  );

  if (error) {
    return shell(
      <Alert status="warning" borderRadius="lg">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (!info) {
    return (
      <Box minH="100vh" bg="sand.50" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="accent.500" />
      </Box>
    );
  }

  if (answer !== null) {
    return shell(
      <VStack spacing={4} textAlign="center">
        <Heading size="lg" color="brand.500" fontFamily="heading">
          Merci pour votre réponse !
        </Heading>
        <Text color="brand.600">
          {answer
            ? "Votre souhait d'accompagnement est bien confirmé. Je reviendrai vers vous très prochainement pour organiser la suite."
            : "Votre réponse a bien été enregistrée. N'hésitez pas à me recontacter si vous changez d'avis."}
        </Text>
      </VStack>
    );
  }

  return shell(
    <VStack spacing={6} align="stretch">
      <Text color="brand.600" fontSize="lg">
        Suite à notre premier rendez-vous, souhaitez-vous confirmer l&apos;accompagnement
        {info.jeunePrenom ? (
          <>
            {' '}
            de <strong>{info.jeunePrenom}</strong>
          </>
        ) : null}{' '}
        pour l&apos;année scolaire <strong>{info.anneeScolaire}</strong> ?
      </Text>
      {submitError && (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {submitError}
        </Alert>
      )}
      <Stack direction={{ base: 'column', sm: 'row' }} spacing={4}>
        <Button
          colorScheme="accent"
          size="lg"
          h={16}
          flex={1}
          onClick={() => submit(true)}
          isLoading={submitting === true}
          isDisabled={submitting !== null}
        >
          Oui, je confirme
        </Button>
        <Button
          variant="outline"
          colorScheme="brand"
          size="lg"
          h={16}
          flex={1}
          onClick={() => submit(false)}
          isLoading={submitting === false}
          isDisabled={submitting !== null}
        >
          Non, pas pour le moment
        </Button>
      </Stack>
    </VStack>
  );
}
