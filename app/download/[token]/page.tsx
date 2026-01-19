'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  Card,
  CardBody,
  Alert,
  AlertIcon,
  Spinner,
  Image,
  Icon,
  HStack,
  VStack,
} from '@chakra-ui/react';
import { FiDownload, FiFile } from 'react-icons/fi';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  original_filename: string;
  downloadUrl: string | null;
  created_at: string;
}

export default function DownloadPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Lien invalide');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/download?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Lien invalide ou expiré');
          setLoading(false);
          return;
        }

        setClientName(data.clientName);
        setExpiresAt(data.expiresAt);
        setDocuments(data.documents);
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement de la page');
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <Box bg="#fafafa" minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="accent.500" />
          <Text color="brand.600">Chargement...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box bg="#fafafa" minH="100vh" py={20}>
        <Container maxW="container.md">
          <VStack spacing={6}>
            <Image
              src="/logo.jpg"
              alt="A Rythme Ethic"
              maxH="80px"
              borderRadius="xl"
              boxShadow="sm"
            />
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              {error}
            </Alert>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box bg="#fafafa" minH="100vh" py={8}>
      <Container maxW="container.md">
        <Stack spacing={6}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Image
              src="/logo.jpg"
              alt="A Rythme Ethic"
              maxH="80px"
              mx="auto"
              borderRadius="xl"
              boxShadow="sm"
              mb={4}
            />
            <Heading as="h1" size="xl" color="brand.500" fontFamily="heading">
              Documents à télécharger
            </Heading>
            <Text color="brand.600" mt={2}>
              {clientName}
            </Text>
          </Box>

          {/* Info Card */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={4}>
                <Text color="gray.600">
                  Vous trouverez ci-dessous les documents mis à disposition par A Rythme Ethic.
                  Cliquez sur le bouton de téléchargement pour récupérer chaque fichier.
                </Text>
                {expiresAt && (
                  <Text fontSize="sm" color="orange.600">
                    Ce lien est valable jusqu'au <strong>{formatDate(expiresAt)}</strong>.
                  </Text>
                )}
              </Stack>
            </CardBody>
          </Card>

          {/* Documents List */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={4}>
                <Heading size="sm" color="brand.500" fontFamily="heading">
                  Documents disponibles ({documents.length})
                </Heading>

                {documents.length === 0 ? (
                  <Text color="gray.500">Aucun document disponible.</Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {documents.map((doc) => (
                      <Box
                        key={doc.id}
                        p={4}
                        border="1px solid"
                        borderColor="gray.200"
                        borderRadius="lg"
                        _hover={{ bg: 'gray.50' }}
                      >
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Icon as={FiFile} color="accent.500" boxSize={5} />
                            <Box>
                              <Text fontWeight="medium" color="brand.600">
                                {doc.title}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                {doc.original_filename}
                              </Text>
                            </Box>
                          </HStack>
                          {doc.downloadUrl ? (
                            <Button
                              as="a"
                              href={doc.downloadUrl}
                              download={doc.original_filename}
                              target="_blank"
                              rel="noopener noreferrer"
                              colorScheme="accent"
                              size="sm"
                              leftIcon={<Icon as={FiDownload} />}
                            >
                              Télécharger
                            </Button>
                          ) : (
                            <Text fontSize="sm" color="red.500">
                              Non disponible
                            </Text>
                          )}
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                )}
              </Stack>
            </CardBody>
          </Card>

          {/* Footer */}
          <Box textAlign="center" pt={4}>
            <Text fontSize="sm" color="gray.500">
              Si vous rencontrez des difficultés, contactez Florence Louazel.
            </Text>
            <Text fontSize="sm" color="gray.400" mt={1}>
              A Rythme Ethic - Cours de mathématiques
            </Text>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
