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
} from '@chakra-ui/react';
import { FiCheckCircle, FiUpload, FiFile } from 'react-icons/fi';
import { use, useEffect, useState } from 'react';
import { Nav } from '@/components/Nav';

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
      setInfo({ required: data.required, uploaded: data.uploaded });
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
      if (!data.success) throw new Error(data.error);
      toast({ title: 'Document envoyé', status: 'success', duration: 2000 });
      fetchInfo();
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), status: 'error', duration: 3000 });
    } finally {
      setUploadingKind(null);
    }
  };

  const totalDone = info ? info.required.filter(r => info.uploaded[r.kind]).length : 0;
  const totalReq = info?.required.length || 3;
  const allDone = info && totalDone === totalReq;

  return (
    <>
      <Nav />
      <Box bg="#faf6f2" minH="100vh" py={{ base: 8, md: 16 }}>
        <Container maxW="container.md">
          <Stack spacing={8}>
            <Box textAlign="center">
              <Text
                fontSize="xs"
                fontWeight="700"
                color="accent.500"
                textTransform="uppercase"
                letterSpacing="widest"
                mb={3}
              >
                Fin de contrat
              </Text>
              <Heading
                as="h1"
                fontSize={{ base: '2xl', md: '3xl' }}
                color="brand.500"
                fontFamily="heading"
              >
                Transmission des documents
              </Heading>
            </Box>

            {loading ? (
              <Box textAlign="center" py={10}>
                <Spinner size="xl" color="accent.500" />
              </Box>
            ) : error ? (
              <Alert status="error" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>Lien invalide</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
              </Alert>
            ) : info ? (
              <>
                <Card bg="white">
                  <CardBody>
                    <Stack spacing={3}>
                      <Text color="brand.600" lineHeight="1.7">
                        Merci de bien vouloir déposer ci-dessous les <strong>3 documents</strong> de fin
                        de contrat signés. Vous pouvez les envoyer un par un.
                      </Text>
                      <Text fontSize="sm" color="gray.600">
                        Format accepté : PDF, JPG, PNG, DOCX (max 20 Mo par fichier).
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
                          colorScheme="brand"
                          borderRadius="full"
                        />
                      </Box>
                    </Stack>
                  </CardBody>
                </Card>

                <Stack spacing={4}>
                  {info.required.map(doc => {
                    const up = info.uploaded[doc.kind];
                    const isUploading = uploadingKind === doc.kind;
                    return (
                      <Card key={doc.kind} bg="white" borderLeft="4px" borderColor={up ? 'green.500' : 'sand.300'}>
                        <CardBody>
                          <Stack spacing={3}>
                            <HStack justify="space-between" flexWrap="wrap">
                              <HStack spacing={2}>
                                <Icon as={up ? FiCheckCircle : FiFile} color={up ? 'green.500' : 'brand.500'} />
                                <Text fontWeight="600" color="brand.600">
                                  {doc.label}
                                </Text>
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
                            {up ? (
                              <HStack
                                bg="green.50"
                                p={3}
                                borderRadius="md"
                                justify="space-between"
                                flexWrap="wrap"
                              >
                                <Text fontSize="sm" color="green.700" noOfLines={1}>
                                  {up.filename}
                                </Text>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  as="label"
                                  htmlFor={`file-${doc.kind}`}
                                  cursor="pointer"
                                  isLoading={isUploading}
                                >
                                  Remplacer
                                  <Input
                                    id={`file-${doc.kind}`}
                                    type="file"
                                    display="none"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={e => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleUpload(doc.kind, e.target.files[0]);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </Button>
                              </HStack>
                            ) : (
                              <Box>
                                <Button
                                  as="label"
                                  htmlFor={`file-${doc.kind}`}
                                  leftIcon={<FiUpload />}
                                  colorScheme="accent"
                                  variant="outline"
                                  cursor="pointer"
                                  isLoading={isUploading}
                                  loadingText="Envoi..."
                                  w={{ base: 'full', md: 'auto' }}
                                >
                                  Déposer le document
                                  <Input
                                    id={`file-${doc.kind}`}
                                    type="file"
                                    display="none"
                                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                    onChange={e => {
                                      if (e.target.files && e.target.files[0]) {
                                        handleUpload(doc.kind, e.target.files[0]);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </Button>
                              </Box>
                            )}
                          </Stack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </Stack>

                {allDone && (
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle>Merci !</AlertTitle>
                      <AlertDescription>
                        Florence a bien reçu vos 3 documents. Elle reviendra vers vous après les avoir signés.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}
              </>
            ) : null}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
