'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Textarea,
  RadioGroup,
  Radio,
  Stack,
} from '@chakra-ui/react';

interface ClientData {
  first_name_jeune?: string;
  last_name_jeune?: string;
  first_name_parent1?: string;
  first_name?: string;
}

export default function RenouvellementFormPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [souhaite, setSouhaite] = useState<string>('');
  const [commentaire, setCommentaire] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Lien invalide ou expiré');
      setLoading(false);
      return;
    }

    // Fetch client data
    fetch(`/api/formulaire/renouvellement?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setClient(data.client);
        } else {
          setError(data.error || 'Lien invalide ou expiré');
        }
      })
      .catch(() => {
        setError('Erreur lors du chargement');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!souhaite) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/formulaire/renouvellement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          souhaite: souhaite === 'oui',
          commentaire,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Erreur lors de l\'envoi');
      }
    } catch {
      setError('Erreur lors de l\'envoi');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="accent.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Box minH="100vh" bg="gray.50" py={12}>
        <Container maxW="md">
          <Alert status="error" borderRadius="lg">
            <AlertIcon />
            {error}
          </Alert>
        </Container>
      </Box>
    );
  }

  if (submitted) {
    return (
      <Box minH="100vh" bg="gray.50" py={12}>
        <Container maxW="md">
          <VStack spacing={6} bg="white" p={8} borderRadius="xl" shadow="sm">
            <Box textAlign="center">
              <Text fontSize="4xl" mb={4}>✅</Text>
              <Heading size="lg" color="brand.500" fontFamily="heading" mb={4}>
                Merci pour votre réponse !
              </Heading>
              <Text color="gray.600">
                Votre réponse a bien été enregistrée. Je reviendrai vers vous très prochainement.
              </Text>
            </Box>
          </VStack>
        </Container>
      </Box>
    );
  }

  const jeuneName = client?.first_name_jeune
    ? `${client.first_name_jeune}${client.last_name_jeune ? ' ' + client.last_name_jeune : ''}`
    : 'votre enfant';

  const parentName = client?.first_name_parent1 || client?.first_name || '';

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="lg">
        <VStack spacing={6}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Heading size="xl" color="brand.500" fontFamily="heading" mb={2}>
              A Rythme Ethic
            </Heading>
            <Text color="terracotta.400" fontSize="lg">
              Souhait de renouvellement
            </Text>
          </Box>

          {/* Form Card */}
          <Box bg="white" p={8} borderRadius="xl" shadow="sm" w="100%">
            <VStack spacing={6} align="stretch">
              <Text color="brand.600" fontSize="lg">
                Bonjour {parentName},
              </Text>

              <Text color="brand.600">
                L'année scolaire touche à sa fin et je tenais à vous remercier pour la confiance
                que vous m'avez accordée pour l'accompagnement de <strong>{jeuneName}</strong>.
              </Text>

              <Box bg="cream.100" p={6} borderRadius="lg">
                <Text fontWeight="bold" color="brand.500" mb={4}>
                  Souhaitez-vous poursuivre l'accompagnement l'année prochaine ?
                </Text>

                <RadioGroup value={souhaite} onChange={setSouhaite}>
                  <Stack spacing={3}>
                    <Radio value="oui" colorScheme="green" size="lg">
                      <Text color="brand.600">Oui, je souhaite continuer</Text>
                    </Radio>
                    <Radio value="non" colorScheme="red" size="lg">
                      <Text color="brand.600">Non, je ne souhaite pas continuer</Text>
                    </Radio>
                  </Stack>
                </RadioGroup>
              </Box>

              <Box>
                <Text fontWeight="medium" color="brand.500" mb={2}>
                  Un commentaire ? (facultatif)
                </Text>
                <Textarea
                  value={commentaire}
                  onChange={e => setCommentaire(e.target.value)}
                  placeholder="Partagez vos remarques, suggestions ou besoins particuliers pour l'année prochaine..."
                  rows={4}
                  borderColor="gray.300"
                  _focus={{ borderColor: 'accent.500', boxShadow: '0 0 0 1px var(--chakra-colors-accent-500)' }}
                />
              </Box>

              <Button
                colorScheme="accent"
                size="lg"
                onClick={handleSubmit}
                isLoading={submitting}
                loadingText="Envoi en cours..."
                isDisabled={!souhaite}
              >
                Envoyer ma réponse
              </Button>
            </VStack>
          </Box>

          {/* Footer */}
          <Box textAlign="center" py={4}>
            <Text fontSize="sm" color="gray.500">
              Florence Louazel - A Rythme Ethic
            </Text>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}
