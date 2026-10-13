'use client';

import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  Card,
  CardBody,
  HStack,
  Icon,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Input,
  Progress,
  Image,
  Badge,
} from '@chakra-ui/react';
import { FiCheckCircle, FiUpload, FiFile } from 'react-icons/fi';
import { use, useEffect, useState } from 'react';

interface UploadedInfo {
  filename: string;
  uploadedAt: string;
}

type Uploaded = Record<string, UploadedInfo | null>;

interface RequiredDoc {
  kind: string;
  label: string;
}

interface Info {
  required: RequiredDoc[];
  uploaded: Uploaded;
  status: string;
}

export default function FinDeContratFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingKind, setUploadingKind] = useState<string | null>(null);
  const toast = useToast();

  const fetchInfo = async () => {
    try {
      const res = await fetch(`/api/formulaire/fin-de-contrat?token=${token}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Lien invalide');
        return;
      }
      setInfo({ required: data.required, uploaded: data.uploaded, status: data.status });
    } catch (e) {
      setError('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, [token]);

  const handleUpload = async (kind: string, file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Fichier trop volumineux (max 20 Mo)', status: 'error', duration: 3000 });
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast({ title: 'Format non accepté : PDF uniquement', status: 'error', duration: 4000 });
      return;
    }
    setUploadingKind(kind);
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('kind', kind);
      formData.append('file', file);
      const res = await fetch('/api/formulaire/fin-de-contrat', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Erreur lors de l’envoi');
      toast({ title: 'Document envoyé', status: 'success', duration: 2000 });
      fetchInfo();
    } catch (e) {
      toast({
        title: 'Erreur',
        description: e instanceof Error ? e.message : String(e),
        status: 'error',
        duration: 5000,
      });
    } finally {
      setUploadingKind(null);
    }
  };

  const totalDone = info ? info.required.filter(r => info.uploaded[r.kind]).length : 0;
  const totalReq = info?.required.length || 3;
  const allDone = info && totalDone === totalReq;
  // Les 3 documents transmis : signatures lancées, plus de remplacement possible
  const locked = !!info && info.status !== 'DRAFT';

  if (loading) {
    return (
      <Box textAlign="center" py={20}>
        <Spinner size="xl" color="accent.500" />
        <Text mt={4} color="brand.600">
          Chargement du formulaire...
        </Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxW="container.md" py={20}>
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          <Box>
            <AlertTitle>Lien invalide</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Box>
        </Alert>
      </Container>
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
              Transmission des documents
            </Heading>
            <Text color="brand.600" mt={2}>
              Merci de déposer ci-dessous les 3 documents de fin de contrat
            </Text>
          </Box>

          {info && (
            <>
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={3}>
                    <Alert status="warning" borderRadius="lg" alignItems="flex-start">
                      <AlertIcon />
                      <Box>
                        <AlertTitle>Ne signez pas ces documents</AlertTitle>
                        <AlertDescription>
                          Inutile de les signer avant de les envoyer : une fois les 3 documents
                          déposés, vous recevrez par email un lien pour les signer électroniquement.
                        </AlertDescription>
                      </Box>
                    </Alert>
                    <Text color="brand.600" lineHeight="1.7">
                      Les 3 documents sont obligatoires. Vous pouvez les envoyer un par un. Format
                      accepté : PDF uniquement (max 20 Mo par fichier).
                    </Text>
                    <Box pt={2}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm" fontWeight="600" color="brand.600">
                          {totalDone} / {totalReq} documents déposés
                        </Text>
                        {allDone && (
                          <HStack spacing={1}>
                            <Icon as={FiCheckCircle} color="green.500" />
                            <Text fontSize="sm" color="green.600" fontWeight="600">
                              Tout est reçu !
                            </Text>
                          </HStack>
                        )}
                      </HStack>
                      <Progress
                        value={(totalDone / totalReq) * 100}
                        size="sm"
                        colorScheme="cyan"
                        borderRadius="full"
                      />
                    </Box>
                  </Stack>
                </CardBody>
              </Card>

              {info.required.map(doc => {
                const up = info.uploaded[doc.kind];
                const isUploading = uploadingKind === doc.kind;
                const inputId = `file-${doc.kind}`;
                return (
                  <Card key={doc.kind} bg="white" shadow="sm">
                    <CardBody>
                      <Stack spacing={3}>
                        <HStack justify="space-between" flexWrap="wrap">
                          <HStack spacing={2}>
                            <Heading size="sm" color="brand.500" fontFamily="heading">
                              {doc.label}
                            </Heading>
                            {!up && (
                              <Badge colorScheme="orange" fontSize="0.65rem">
                                Obligatoire
                              </Badge>
                            )}
                          </HStack>
                          {up && (
                            <Text fontSize="xs" color="gray.500">
                              Reçu le{' '}
                              {new Date(up.uploadedAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Text>
                          )}
                        </HStack>

                        {!up ? (
                          <Box
                            as="label"
                            htmlFor={inputId}
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            justifyContent="center"
                            p={6}
                            border="2px dashed"
                            borderColor="gray.300"
                            borderRadius="lg"
                            cursor={isUploading ? 'wait' : 'pointer'}
                            opacity={isUploading ? 0.6 : 1}
                            _hover={{ borderColor: 'accent.500', bg: 'gray.50' }}
                            transition="all 0.2s"
                          >
                            {isUploading ? (
                              <>
                                <Spinner color="accent.500" mb={2} />
                                <Text color="gray.500" fontSize="sm">
                                  Envoi en cours...
                                </Text>
                              </>
                            ) : (
                              <>
                                <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
                                <Text color="gray.500" fontSize="sm">
                                  Cliquez pour sélectionner un fichier
                                </Text>
                              </>
                            )}
                            <Input
                              id={inputId}
                              type="file"
                              accept=".pdf,application/pdf"
                              display="none"
                              disabled={isUploading}
                              onChange={e => {
                                if (e.target.files && e.target.files[0]) {
                                  handleUpload(doc.kind, e.target.files[0]);
                                  e.target.value = '';
                                }
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            p={3}
                            bg="green.50"
                            border="1px solid"
                            borderColor="green.200"
                            borderRadius="lg"
                            flexWrap="wrap"
                            gap={2}
                          >
                            <Box display="flex" alignItems="center" gap={2}>
                              <Icon as={FiFile} color="green.500" />
                              <Text fontSize="sm" color="green.700" noOfLines={1}>
                                {up.filename}
                              </Text>
                            </Box>
                            {!locked && (
                              <Button
                                as="label"
                                htmlFor={inputId}
                                size="sm"
                                variant="ghost"
                                colorScheme="cyan"
                                cursor="pointer"
                                isLoading={isUploading}
                              >
                                Remplacer
                                <Input
                                  id={inputId}
                                  type="file"
                                  display="none"
                                  accept=".pdf,application/pdf"
                                  onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleUpload(doc.kind, e.target.files[0]);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </Button>
                            )}
                          </Box>
                        )}
                      </Stack>
                    </CardBody>
                  </Card>
                );
              })}

              {allDone && (
                <Alert status="success" borderRadius="lg">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Merci !</AlertTitle>
                    <AlertDescription>
                      Florence a bien reçu vos 3 documents. Vous allez recevoir par email les liens
                      pour les signer électroniquement : l’attestation employeur et le certificat de
                      travail tout de suite, le reçu pour solde de tout compte dès que Florence
                      l’aura signé.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
            </>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
