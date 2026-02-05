'use client';

import {
  Heading,
  Stack,
  Card,
  CardBody,
  Grid,
  GridItem,
  Text,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  HStack,
  Box,
  useDisclosure,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
  FormControl,
  FormLabel,
  Select,
  Icon,
  IconButton,
  Input,
  VStack,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useRef } from 'react';
import { FiChevronLeft, FiChevronRight, FiUpload, FiFile, FiX, FiTrash2 } from 'react-icons/fi';
import { createClient } from '@/lib/supabase-client';
import { useClientDetail } from '@/lib/hooks/useClientDetail';
import { statusLabels } from '@/types';
import { EditClientModal } from './EditClientModal';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { client, procedures, procedureHistory, documents, loading, error, refetch } = useClientDetail(clientId);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose
  } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const cancelDocRef = useRef<HTMLButtonElement>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ id: string; storage_path?: string | null; title?: string } | null>(null);
  const {
    isOpen: isDeleteDocOpen,
    onOpen: onDeleteDocOpen,
    onClose: onDeleteDocClose
  } = useDisclosure();
  const {
    isOpen: isRecueilOpen,
    onOpen: onRecueilOpen,
    onClose: onRecueilClose
  } = useDisclosure();
  const {
    isOpen: isRdv1Open,
    onOpen: onRdv1Open,
    onClose: onRdv1Close
  } = useDisclosure();
  const {
    isOpen: isRenouvellementOpen,
    onOpen: onRenouvellementOpen,
    onClose: onRenouvellementClose
  } = useDisclosure();
  const {
    isOpen: isCvCasierOpen,
    onOpen: onCvCasierOpen,
    onClose: onCvCasierClose
  } = useDisclosure();
  const {
    isOpen: isContractualisationOpen,
    onOpen: onContractualisationOpen,
    onClose: onContractualisationClose
  } = useDisclosure();
  const [isLaunchingProcedure, setIsLaunchingProcedure] = useState(false);
  const [selectedRecueilEmail, setSelectedRecueilEmail] = useState('');
  const [selectedContractualisationSigner, setSelectedContractualisationSigner] = useState('');
  const [selectedCvCasierEmail, setSelectedCvCasierEmail] = useState('');
  const [cvCasierFiles, setCvCasierFiles] = useState<File[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [docsPage, setDocsPage] = useState(1);
  const ITEMS_PER_PAGE = 25;
  const toast = useToast();

  // Pagination for procedure history
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * ITEMS_PER_PAGE;
    return procedureHistory.slice(start, start + ITEMS_PER_PAGE);
  }, [procedureHistory, historyPage]);
  const totalHistoryPages = Math.ceil(procedureHistory.length / ITEMS_PER_PAGE);

  // Pagination for documents
  const paginatedDocs = useMemo(() => {
    const start = (docsPage - 1) * ITEMS_PER_PAGE;
    return documents.slice(start, start + ITEMS_PER_PAGE);
  }, [documents, docsPage]);
  const totalDocsPages = Math.ceil(documents.length / ITEMS_PER_PAGE);

  const handleClientUpdated = () => {
    refetch();
    onClose();
  };

  const handleDeleteClient = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: 'Client supprimé',
        description: 'Le client a été supprimé avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      router.push('/admin/clients');
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeleting(false);
      onDeleteClose();
    }
  };

  const handleLaunchRecueilProcedure = async () => {
    if (!selectedRecueilEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un destinataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/recueil-informations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, email: selectedRecueilEmail }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: `Un email avec le formulaire a été envoyé à ${selectedRecueilEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRecueilClose();
      setSelectedRecueilEmail('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchRdv1Procedure = async () => {
    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/preparation-rdv1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: 'Un email de préparation du RDV 1 a été envoyé au client.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRdv1Close();
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchRenouvellementProcedure = async () => {
    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/souhait-renouvellement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: 'Un email de demande de renouvellement a été envoyé au client.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRenouvellementClose();
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleCvCasierFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setCvCasierFiles(prev => [...prev, ...Array.from(files)]);
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const removeCvCasierFile = (index: number) => {
    setCvCasierFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleLaunchCvCasierProcedure = async () => {
    if (!selectedCvCasierEmail) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un destinataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (cvCasierFiles.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez ajouter au moins un fichier.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLaunchingProcedure(true);
    try {
      // First, create the procedure
      const response = await fetch('/api/procedures/envoi-cv-casier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, email: selectedCvCasierEmail }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      const data = await response.json();

      // Then, upload the files
      for (const file of cvCasierFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('procedureId', data.procedureId);
        formData.append('title', file.name);
        formData.append('kind', 'SUPPORTING_DOC');
        formData.append('uploadedBy', 'ADMIN');

        await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });
      }

      // Finally, send the email with download link
      await fetch('/api/procedures/envoi-cv-casier/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ procedureId: data.procedureId }),
      });

      toast({
        title: 'Procédure lancée',
        description: `Un email avec le lien de téléchargement a été envoyé à ${selectedCvCasierEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onCvCasierClose();
      setSelectedCvCasierEmail('');
      setCvCasierFiles([]);
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleLaunchContractualisationProcedure = async () => {
    if (!selectedContractualisationSigner || !client) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un signataire.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Parse the selected signer to get name and email
    // Format: "email|firstName|lastName|phone"
    const [signerEmail, signerFirstName, signerLastName, signerPhone] = selectedContractualisationSigner.split('|');

    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/contractualisation-ecole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          signerEmail,
          signerFirstName,
          signerLastName,
          signerPhone: signerPhone || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: `Une demande de signature a été envoyée à ${signerEmail}.`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onContractualisationClose();
      setSelectedContractualisationSigner('');
      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Une erreur est survenue lors du lancement de la procédure.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLaunchingProcedure(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;

    setIsDeletingDoc(true);
    try {
      const supabase = createClient();

      // Delete from storage if path exists
      if (docToDelete.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('client-files')
          .remove([docToDelete.storage_path]);

        if (storageError) {
          console.error('Storage delete error:', storageError);
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', docToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: 'Document supprimé',
        description: 'Le document a été supprimé avec succès.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      refetch();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du document.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDeletingDoc(false);
      setDocToDelete(null);
      onDeleteDocClose();
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="accent.500" />
      </Box>
    );
  }

  if (error || !client) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error || 'Client non trouvé'}
      </Alert>
    );
  }

  const isParticulier = client.type_client === 'Particulier';
  const isEcole = client.type_client === 'École';

  // Get display name for header
  const getDisplayName = () => {
    if (isEcole) {
      return client.organisation || `${client.first_name} ${client.last_name}`;
    }
    // For Particulier, prefer jeune name, then parent1 name
    if (client.first_name_jeune || client.last_name_jeune) {
      return `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim();
    }
    if (client.first_name_parent1 || client.last_name_parent1) {
      return `${client.first_name_parent1 || ''} ${client.last_name_parent1 || ''}`.trim();
    }
    return `${client.first_name} ${client.last_name}`;
  };

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" align="center">
        <Heading color="brand.500" fontFamily="heading">
          {getDisplayName()}
        </Heading>
        <HStack spacing={3}>
          <Button variant="outline" onClick={onOpen} borderColor="brand.500" color="brand.500">
            Modifier
          </Button>
          <Button variant="outline" colorScheme="red" onClick={onDeleteOpen}>
            Supprimer
          </Button>
        </HStack>
      </HStack>

      {/* Informations générales */}
      <Card bg="white" shadow="sm">
        <CardBody>
          <Stack spacing={4}>
            <Heading size="sm" color="brand.500" fontFamily="heading">Informations générales</Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
              <GridItem>
                <Text fontSize="sm" color="gray.500">Statut</Text>
                <Badge colorScheme={client.client_status === 'Client' ? 'green' : 'orange'} mt={1}>
                  {client.client_status || 'Prospect'}
                </Badge>
              </GridItem>
              <GridItem>
                <Text fontSize="sm" color="gray.500">Type</Text>
                <Text fontWeight="medium">{isEcole ? 'Établissement' : 'Particulier'}</Text>
              </GridItem>
              {isParticulier && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Sous-type</Text>
                  <Text fontWeight="medium">
                    {client.sub_type === 'Jeune' ? 'Jeune / Élève' : client.sub_type === 'Parent' ? 'Parent' : '—'}
                  </Text>
                </GridItem>
              )}
              {isParticulier && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Niveau</Text>
                  <Text fontWeight="medium">{client.niveau_eleve || '—'}</Text>
                </GridItem>
              )}
              {isParticulier && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Type de demande</Text>
                  <Text fontWeight="medium">{client.demande_type || '—'}</Text>
                </GridItem>
              )}
            </Grid>
          </Stack>
        </CardBody>
      </Card>

      {/* ========== PARTICULIER - Tous les contacts ========== */}
      {isParticulier && (
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(3, 1fr)' }} gap={4}>
          {/* Jeune */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Jeune / Élève</Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.first_name_jeune || client.last_name_jeune
                      ? `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.phone_jeune || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.email_jeune || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Parent 1 */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Parent 1</Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.first_name_parent1 || client.last_name_parent1
                      ? `${client.first_name_parent1 || ''} ${client.last_name_parent1 || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.phone_parent1 || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.email_parent1 || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Parent 2 */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Parent 2</Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.first_name_parent2 || client.last_name_parent2
                      ? `${client.first_name_parent2 || ''} ${client.last_name_parent2 || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.phone_parent2 || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.email_parent2 || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      )}

      {/* ========== ÉTABLISSEMENT CONTACT ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Contact de l'établissement</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">{client.first_name} {client.last_name}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.phone1 || '—'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.email}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Responsables ========== */}
      {isEcole && (
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
          {/* Responsable modules */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <HStack justify="space-between">
                  <Heading size="sm" color="brand.500" fontFamily="heading">Responsable modules</Heading>
                  {client.ecole_resp_modules_peut_negocier && (
                    <Badge colorScheme="green" fontSize="xs">Habilité prix</Badge>
                  )}
                </HStack>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_modules_prenom || client.ecole_resp_modules_nom
                      ? `${client.ecole_resp_modules_prenom || ''} ${client.ecole_resp_modules_nom || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.ecole_resp_modules_phone || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.ecole_resp_modules_email || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable autorisation prix */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Responsable autorisation prix</Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_autorisation_prenom || client.ecole_resp_autorisation_nom
                      ? `${client.ecole_resp_autorisation_prenom || ''} ${client.ecole_resp_autorisation_nom || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.ecole_resp_autorisation_phone || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.ecole_resp_autorisation_email || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable facturation */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Responsable facturation</Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_facturation_prenom || client.ecole_resp_facturation_nom
                      ? `${client.ecole_resp_facturation_prenom || ''} ${client.ecole_resp_facturation_nom || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.ecole_resp_facturation_phone || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.ecole_resp_facturation_email || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Responsable planning */}
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Responsable planning</Heading>
                <Box>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.ecole_resp_planning_prenom || client.ecole_resp_planning_nom
                      ? `${client.ecole_resp_planning_prenom || ''} ${client.ecole_resp_planning_nom || ''}`.trim()
                      : '—'}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.ecole_resp_planning_phone || '—'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.ecole_resp_planning_email || '—'}</Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </Grid>
      )}

      {/* ========== ÉTABLISSEMENT - Informations structure ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Informations structure</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">N° SIRET</Text>
                  <Text fontWeight="medium">{client.ecole_siret || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">N° NDA</Text>
                  <Text fontWeight="medium">{client.ecole_nda || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Région d'obtention NDA</Text>
                  <Text fontWeight="medium">{client.ecole_nda_region || '—'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Frais pris en charge ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Frais pris en charge par l'établissement</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Frais du midi</Text>
                  <Text fontWeight="medium">
                    {client.ecole_frais_midi_montant ? `${client.ecole_frais_midi_montant} €` : '—'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Conditions</Text>
                  <Text fontWeight="medium">{client.ecole_frais_midi_conditions || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Remboursement déplacement</Text>
                  <Badge
                    colorScheme={client.ecole_frais_deplacement_rembourse ? 'green' : 'gray'}
                    mt={1}
                  >
                    {client.ecole_frais_deplacement_rembourse ? 'Oui' : 'Non'}
                  </Badge>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Prix au kilomètre</Text>
                  <Text fontWeight="medium">
                    {client.ecole_frais_km_prix ? `${client.ecole_frais_km_prix} €/km` : '—'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Informations module ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Informations module</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Nom du module</Text>
                  <Text fontWeight="medium">{client.ecole_module_nom || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Nombre d'heures</Text>
                  <Text fontWeight="medium">{client.ecole_module_heures || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Type de formation</Text>
                  <Text fontWeight="medium">
                    {client.ecole_formation_type === 'initiale_en_alternance' ? 'Initiale / Alternance' :
                     client.ecole_formation_type === 'continue' ? 'Continue' : '—'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Classe(s)</Text>
                  <Text fontWeight="medium">{client.ecole_classes_noms || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Taille du groupe</Text>
                  <Text fontWeight="medium">{client.ecole_groupe_taille || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Évaluations min.</Text>
                  <Text fontWeight="medium">{client.ecole_evaluation_nombre_min || '—'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="sm" color="gray.500">Période</Text>
                  <Text fontWeight="medium">{client.ecole_module_periode || '—'}</Text>
                </GridItem>
              </Grid>
              <Box>
                <Text fontSize="sm" color="gray.500">Modalités d'évaluation</Text>
                <Text fontWeight="medium">{client.ecole_evaluation_modalites || '—'}</Text>
              </Box>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* ========== ÉTABLISSEMENT - Enseignant ========== */}
      {isEcole && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Enseignant du contenu de la matière</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Prénom</Text>
                  <Text fontWeight="medium">{client.ecole_enseignant_prenom || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Nom</Text>
                  <Text fontWeight="medium">{client.ecole_enseignant_nom || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.ecole_enseignant_email || '—'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Informations scolaires / Recueil - Particulier uniquement */}
      {isParticulier && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Informations scolaires</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Établissement scolaire</Text>
                  <Text fontWeight="medium">{client.etablissement_scolaire || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Moyenne maths</Text>
                  <Text fontWeight="medium">{client.moyenne_maths || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Moyenne générale</Text>
                  <Text fontWeight="medium">{client.moyenne_generale || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Numéro CESU</Text>
                  <Text fontWeight="medium">{client.numero_cesu || '—'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Lieu et disponibilités - Particulier uniquement */}
      {isParticulier && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Lieu et disponibilités</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Adresse des cours</Text>
                  <Text fontWeight="medium">{client.adresse_cours || '—'}</Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Jours disponibles</Text>
                  <Text fontWeight="medium">
                    {client.jours_disponibles && client.jours_disponibles.length > 0
                      ? client.jours_disponibles.join(', ')
                      : '—'}
                  </Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Souhait de renouvellement - Particulier uniquement, si réponse reçue */}
      {isParticulier && client.renouvellement_date_reponse && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={4}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Souhait de renouvellement</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Souhaite renouveler</Text>
                  <Badge
                    colorScheme={client.renouvellement_souhaite ? 'green' : 'red'}
                    mt={1}
                  >
                    {client.renouvellement_souhaite ? 'Oui' : 'Non'}
                  </Badge>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Date de réponse</Text>
                  <Text fontWeight="medium">
                    {new Date(client.renouvellement_date_reponse).toLocaleDateString('fr-FR')}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Commentaire</Text>
                  <Text fontWeight="medium">{client.renouvellement_commentaire || '—'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
      )}

      {/* Adresse & Notes */}
      <Grid templateColumns={{ base: '1fr', md: client.notes ? 'repeat(2, 1fr)' : '1fr' }} gap={4}>
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={3}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Adresse</Heading>
              <Text fontWeight="medium">
                {client.address_line1 || '—'}
                {client.postal_code && <><br />{client.postal_code}</>}
                {client.city && ` ${client.city}`}
                {client.country && <><br />{client.country}</>}
              </Text>
            </Stack>
          </CardBody>
        </Card>

        {client.notes && (
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <Heading size="sm" color="brand.500" fontFamily="heading">Notes</Heading>
                <Text>{client.notes}</Text>
              </Stack>
            </CardBody>
          </Card>
        )}
      </Grid>

      <Card bg="white">
        <CardBody>
          <Stack spacing={4}>
            <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">
              Historique des procédures ({procedureHistory.length})
            </Heading>

            {/* Procedure Buttons - Different for Particulier vs École */}
            <HStack spacing={3} flexWrap="wrap">
              {isEcole ? (
                <>
                  <Button colorScheme="accent" size="sm" onClick={onRecueilOpen}>
                    Recueil des informations
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onContractualisationOpen}>
                    Contractualisation
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onCvCasierOpen}>
                    Envoyer CV/Casier
                  </Button>
                </>
              ) : (
                <>
                  <Button colorScheme="accent" size="sm" onClick={onRecueilOpen}>
                    Recueil des informations
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onRdv1Open}>
                    Préparation RDV 1
                  </Button>
                  <Button colorScheme="accent" size="sm">
                    Contractualisation
                  </Button>
                  <Button colorScheme="accent" size="sm">
                    Déclaration des heures
                  </Button>
                  <Button colorScheme="accent" size="sm" onClick={onRenouvellementOpen}>
                    Souhait de renouvellement
                  </Button>
                  <Button colorScheme="accent" size="sm">
                    Fin du contrat
                  </Button>
                </>
              )}
            </HStack>

            {procedureHistory.length > 0 ? (
              <>
                <Stack spacing={1}>
                  {paginatedHistory.map(entry => (
                    <HStack
                      key={entry.id}
                      py={2}
                      px={3}
                      bg="gray.50"
                      borderRadius="md"
                      justify="space-between"
                    >
                      <HStack spacing={3} flex={1}>
                        <Text fontWeight="medium" fontSize="sm" minW="180px">
                          {entry.procedure_label}
                        </Text>
                        <Badge
                          colorScheme={entry.status === 'FORMULAIRE_REMPLI' ? 'green' : entry.status.includes('RELANCE') ? 'orange' : 'blue'}
                          fontSize="xs"
                        >
                          {statusLabels[entry.status]}
                        </Badge>
                      </HStack>
                      <Text fontSize="xs" color="gray.500">
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </HStack>
                  ))}
                </Stack>
                {totalHistoryPages > 1 && (
                  <HStack justify="center" pt={3} spacing={2}>
                    <IconButton
                      aria-label="Page précédente"
                      icon={<Icon as={FiChevronLeft} />}
                      size="sm"
                      variant="outline"
                      isDisabled={historyPage === 1}
                      onClick={() => setHistoryPage(p => p - 1)}
                    />
                    <Text fontSize="sm" color="gray.600">
                      Page {historyPage} / {totalHistoryPages}
                    </Text>
                    <IconButton
                      aria-label="Page suivante"
                      icon={<Icon as={FiChevronRight} />}
                      size="sm"
                      variant="outline"
                      isDisabled={historyPage === totalHistoryPages}
                      onClick={() => setHistoryPage(p => p + 1)}
                    />
                  </HStack>
                )}
              </>
            ) : (
              <Box textAlign="center" py={6}>
                <Text color="brand.400" mb={2}>
                  Aucune procédure pour le moment
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Utilisez les boutons ci-dessus pour lancer une procédure
                </Text>
              </Box>
            )}
          </Stack>
        </CardBody>
      </Card>

      <Card bg="white">
        <CardBody>
          <Stack spacing={4}>
            <HStack justify="space-between">
              <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">
                Documents ({documents.length})
              </Heading>
            </HStack>
            {documents.length > 0 ? (
              <>
                <Stack spacing={2}>
                  {paginatedDocs.map(doc => {
                    // Find the procedure for this document
                    const docProcedure = procedures.find(p => p.id === doc.procedure_id);
                    return (
                      <HStack
                        key={doc.id}
                        py={2}
                        px={3}
                        bg="gray.50"
                        borderRadius="md"
                        justify="space-between"
                      >
                        <Stack spacing={0} flex={1}>
                          <Text fontWeight="medium" fontSize="sm">{doc.title}</Text>
                          <Text fontSize="xs" color="gray.500">
                            De : {docProcedure?.procedure_type?.label || 'Document'} • {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Text>
                          {doc.original_filename && (
                            <Text fontSize="xs" color="gray.400" fontStyle="italic">
                              {doc.original_filename}
                            </Text>
                          )}
                        </Stack>
                        <HStack>
                          <Button
                            size="sm"
                            variant="outline"
                            colorScheme="accent"
                            onClick={async () => {
                              if (!doc.storage_path) return;
                              const supabase = createClient();
                              const { data } = await supabase.storage
                                .from('client-files')
                                .createSignedUrl(doc.storage_path, 60);
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              }
                            }}
                          >
                            Ouvrir
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="accent"
                            onClick={async () => {
                              if (!doc.storage_path) return;
                              const supabase = createClient();
                              const { data } = await supabase.storage
                                .from('client-files')
                                .download(doc.storage_path);
                              if (data) {
                                const url = URL.createObjectURL(data);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = doc.original_filename || doc.title || 'document';
                                a.click();
                                URL.revokeObjectURL(url);
                              }
                            }}
                          >
                            Télécharger
                          </Button>
                          <IconButton
                            aria-label="Supprimer le document"
                            icon={<Icon as={FiTrash2} />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => {
                              setDocToDelete({ id: doc.id, storage_path: doc.storage_path, title: doc.title });
                              onDeleteDocOpen();
                            }}
                          />
                        </HStack>
                      </HStack>
                    );
                  })}
                </Stack>
                {totalDocsPages > 1 && (
                  <HStack justify="center" pt={3} spacing={2}>
                    <IconButton
                      aria-label="Page précédente"
                      icon={<Icon as={FiChevronLeft} />}
                      size="sm"
                      variant="outline"
                      isDisabled={docsPage === 1}
                      onClick={() => setDocsPage(p => p - 1)}
                    />
                    <Text fontSize="sm" color="gray.600">
                      Page {docsPage} / {totalDocsPages}
                    </Text>
                    <IconButton
                      aria-label="Page suivante"
                      icon={<Icon as={FiChevronRight} />}
                      size="sm"
                      variant="outline"
                      isDisabled={docsPage === totalDocsPages}
                      onClick={() => setDocsPage(p => p + 1)}
                    />
                  </HStack>
                )}
              </>
            ) : (
              <Box textAlign="center" py={6}>
                <Text color="brand.400">
                  Aucun document pour le moment
                </Text>
              </Box>
            )}
          </Stack>
        </CardBody>
      </Card>

      {client && (
        <EditClientModal
          isOpen={isOpen}
          onClose={onClose}
          onSuccess={handleClientUpdated}
          client={client}
        />
      )}

      {/* Modal de confirmation - Recueil des informations */}
      <Modal isOpen={isRecueilOpen} onClose={() => { onRecueilClose(); setSelectedRecueilEmail(''); }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Lancer la procédure
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Vous êtes sur le point de lancer la procédure <strong>Recueil des informations</strong>.
            </Text>
            <Text mt={3} mb={4}>
              Un email sera envoyé avec un lien vers un formulaire pré-rempli pour compléter les informations du dossier.
            </Text>

            <FormControl isRequired>
              <FormLabel color="brand.600">Envoyer à</FormLabel>
              <Select
                placeholder="Sélectionner un destinataire"
                value={selectedRecueilEmail}
                onChange={(e) => setSelectedRecueilEmail(e.target.value)}
              >
                {isEcole ? (
                  // École: show all contact emails
                  <>
                    <option value={client?.email}>
                      {client?.first_name} {client?.last_name} &lt;{client?.email}&gt; (Contact principal)
                    </option>
                    {client?.ecole_resp_modules_email && (
                      <option value={client.ecole_resp_modules_email}>
                        {client.ecole_resp_modules_prenom} {client.ecole_resp_modules_nom} &lt;{client.ecole_resp_modules_email}&gt; (Resp. modules)
                      </option>
                    )}
                    {client?.ecole_resp_autorisation_email && (
                      <option value={client.ecole_resp_autorisation_email}>
                        {client.ecole_resp_autorisation_prenom} {client.ecole_resp_autorisation_nom} &lt;{client.ecole_resp_autorisation_email}&gt; (Resp. autorisation prix)
                      </option>
                    )}
                    {client?.ecole_resp_facturation_email && (
                      <option value={client.ecole_resp_facturation_email}>
                        {client.ecole_resp_facturation_prenom} {client.ecole_resp_facturation_nom} &lt;{client.ecole_resp_facturation_email}&gt; (Resp. facturation)
                      </option>
                    )}
                    {client?.ecole_resp_planning_email && (
                      <option value={client.ecole_resp_planning_email}>
                        {client.ecole_resp_planning_prenom} {client.ecole_resp_planning_nom} &lt;{client.ecole_resp_planning_email}&gt; (Resp. planning)
                      </option>
                    )}
                  </>
                ) : (
                  // Particulier: show parent/jeune emails
                  <>
                    {client?.email_parent1 && (
                      <option value={client.email_parent1}>
                        {client.first_name_parent1} {client.last_name_parent1} &lt;{client.email_parent1}&gt; (Parent 1)
                      </option>
                    )}
                    {client?.email_parent2 && (
                      <option value={client.email_parent2}>
                        {client.first_name_parent2} {client.last_name_parent2} &lt;{client.email_parent2}&gt; (Parent 2)
                      </option>
                    )}
                    {client?.email_jeune && (
                      <option value={client.email_jeune}>
                        {client.first_name_jeune} {client.last_name_jeune} &lt;{client.email_jeune}&gt; (Jeune)
                      </option>
                    )}
                    {client?.email && !client?.email_parent1 && !client?.email_parent2 && !client?.email_jeune && (
                      <option value={client.email}>
                        {client.first_name} {client.last_name} &lt;{client.email}&gt;
                      </option>
                    )}
                  </>
                )}
              </Select>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onRecueilClose(); setSelectedRecueilEmail(''); }}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRecueilProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedRecueilEmail}
            >
              Confirmer et envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation - Préparation RDV 1 */}
      <Modal isOpen={isRdv1Open} onClose={onRdv1Close} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Préparation du RDV 1
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Vous êtes sur le point de lancer la procédure <strong>Préparation du premier rendez-vous</strong>.
            </Text>
            <Text mt={3}>
              Un email sera envoyé à <strong>{client?.email_parent1 || client?.email_jeune || client?.email}</strong> pour demander de préparer :
            </Text>
            <Box as="ul" pl={5} mt={3} color="brand.600">
              <li>Les 3 derniers bulletins de notes</li>
              <li>Les 2 dernières évaluations de mathématiques</li>
              <li>Le(s) cahier(s) ou classeur de mathématiques</li>
            </Box>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRdv1Close}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRdv1Procedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
            >
              Confirmer et envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation - Souhait de renouvellement */}
      <Modal isOpen={isRenouvellementOpen} onClose={onRenouvellementClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Souhait de renouvellement
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Vous êtes sur le point de lancer la procédure <strong>Souhait de renouvellement</strong>.
            </Text>
            <Text mt={3}>
              Un email sera envoyé à <strong>{client?.email_parent1 || client?.email_jeune || client?.email}</strong> pour demander s'il souhaite poursuivre l'accompagnement l'année prochaine.
            </Text>
            <Text mt={3} fontSize="sm" color="gray.600">
              Le client pourra répondre via un formulaire sécurisé (lien valable 30 jours). Une relance automatique sera envoyée chaque vendredi si pas de réponse.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRenouvellementClose}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRenouvellementProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
            >
              Confirmer et envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Envoi CV/Casier judiciaire */}
      <Modal isOpen={isCvCasierOpen} onClose={onCvCasierClose} isCentered size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Envoyer CV actualisé / Casier judiciaire
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600">
                Sélectionnez le destinataire et ajoutez les fichiers à envoyer. Un lien sécurisé (valable 14 jours) sera envoyé par email pour télécharger les documents.
              </Text>

              <FormControl isRequired>
                <FormLabel>Destinataire</FormLabel>
                <Select
                  placeholder="Sélectionner un destinataire"
                  value={selectedCvCasierEmail}
                  onChange={(e) => setSelectedCvCasierEmail(e.target.value)}
                >
                  <option value={client?.email}>
                    {client?.first_name} {client?.last_name} &lt;{client?.email}&gt; (Contact principal)
                  </option>
                  {client?.ecole_resp_modules_email && (
                    <option value={client.ecole_resp_modules_email}>
                      {client.ecole_resp_modules_prenom} {client.ecole_resp_modules_nom} &lt;{client.ecole_resp_modules_email}&gt; (Resp. modules)
                    </option>
                  )}
                  {client?.ecole_resp_autorisation_email && (
                    <option value={client.ecole_resp_autorisation_email}>
                      {client.ecole_resp_autorisation_prenom} {client.ecole_resp_autorisation_nom} &lt;{client.ecole_resp_autorisation_email}&gt; (Resp. autorisation prix)
                    </option>
                  )}
                  {client?.ecole_resp_facturation_email && (
                    <option value={client.ecole_resp_facturation_email}>
                      {client.ecole_resp_facturation_prenom} {client.ecole_resp_facturation_nom} &lt;{client.ecole_resp_facturation_email}&gt; (Resp. facturation)
                    </option>
                  )}
                  {client?.ecole_resp_planning_email && (
                    <option value={client.ecole_resp_planning_email}>
                      {client.ecole_resp_planning_prenom} {client.ecole_resp_planning_nom} &lt;{client.ecole_resp_planning_email}&gt; (Resp. planning)
                    </option>
                  )}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Documents à envoyer</FormLabel>
                <Box
                  as="label"
                  htmlFor="cv-casier-files"
                  display="flex"
                  flexDirection="column"
                  alignItems="center"
                  justifyContent="center"
                  p={6}
                  border="2px dashed"
                  borderColor="gray.300"
                  borderRadius="lg"
                  cursor="pointer"
                  _hover={{ borderColor: 'accent.500', bg: 'gray.50' }}
                  transition="all 0.2s"
                >
                  <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
                  <Text color="gray.500" fontSize="sm">
                    Cliquez pour sélectionner des fichiers
                  </Text>
                  <Text color="gray.400" fontSize="xs">
                    PDF, images, Word, etc.
                  </Text>
                  <Input
                    id="cv-casier-files"
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={handleCvCasierFileChange}
                    display="none"
                  />
                </Box>

                {cvCasierFiles.length > 0 && (
                  <VStack mt={3} spacing={2} align="stretch">
                    {cvCasierFiles.map((file, index) => (
                      <Box
                        key={index}
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        p={2}
                        bg="green.50"
                        border="1px solid"
                        borderColor="green.200"
                        borderRadius="md"
                      >
                        <HStack spacing={2}>
                          <Icon as={FiFile} color="green.500" />
                          <Text fontSize="sm" color="green.700" noOfLines={1}>
                            {file.name}
                          </Text>
                        </HStack>
                        <IconButton
                          aria-label="Supprimer"
                          icon={<Icon as={FiX} />}
                          size="xs"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => removeCvCasierFile(index)}
                        />
                      </Box>
                    ))}
                  </VStack>
                )}
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onCvCasierClose}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchCvCasierProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedCvCasierEmail || cvCasierFiles.length === 0}
            >
              Envoyer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal - Contractualisation (signature électronique) */}
      <Modal isOpen={isContractualisationOpen} onClose={() => { onContractualisationClose(); setSelectedContractualisationSigner(''); }} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            Contractualisation
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Vous êtes sur le point de lancer la procédure de <strong>Contractualisation</strong>.
            </Text>
            <Text mt={3} mb={4}>
              Une demande de signature électronique sera envoyée au signataire sélectionné via Yousign.
            </Text>

            <FormControl isRequired>
              <FormLabel color="brand.600">Signataire</FormLabel>
              <Select
                placeholder="Sélectionner un signataire"
                value={selectedContractualisationSigner}
                onChange={(e) => setSelectedContractualisationSigner(e.target.value)}
              >
                {/* Contact principal */}
                {client?.email && (
                  <option value={`${client.email}|${client.first_name}|${client.last_name}|${client.phone1 || ''}`}>
                    {client.first_name} {client.last_name} &lt;{client.email}&gt; (Contact principal)
                  </option>
                )}
                {/* Responsable modules */}
                {client?.ecole_resp_modules_email && (
                  <option value={`${client.ecole_resp_modules_email}|${client.ecole_resp_modules_prenom}|${client.ecole_resp_modules_nom}|${client.ecole_resp_modules_phone || ''}`}>
                    {client.ecole_resp_modules_prenom} {client.ecole_resp_modules_nom} &lt;{client.ecole_resp_modules_email}&gt; (Resp. modules)
                  </option>
                )}
                {/* Responsable autorisation prix */}
                {client?.ecole_resp_autorisation_email && (
                  <option value={`${client.ecole_resp_autorisation_email}|${client.ecole_resp_autorisation_prenom}|${client.ecole_resp_autorisation_nom}|${client.ecole_resp_autorisation_phone || ''}`}>
                    {client.ecole_resp_autorisation_prenom} {client.ecole_resp_autorisation_nom} &lt;{client.ecole_resp_autorisation_email}&gt; (Resp. autorisation prix)
                  </option>
                )}
                {/* Responsable facturation */}
                {client?.ecole_resp_facturation_email && (
                  <option value={`${client.ecole_resp_facturation_email}|${client.ecole_resp_facturation_prenom}|${client.ecole_resp_facturation_nom}|${client.ecole_resp_facturation_phone || ''}`}>
                    {client.ecole_resp_facturation_prenom} {client.ecole_resp_facturation_nom} &lt;{client.ecole_resp_facturation_email}&gt; (Resp. facturation)
                  </option>
                )}
                {/* Responsable planning */}
                {client?.ecole_resp_planning_email && (
                  <option value={`${client.ecole_resp_planning_email}|${client.ecole_resp_planning_prenom}|${client.ecole_resp_planning_nom}|${client.ecole_resp_planning_phone || ''}`}>
                    {client.ecole_resp_planning_prenom} {client.ecole_resp_planning_nom} &lt;{client.ecole_resp_planning_email}&gt; (Resp. planning)
                  </option>
                )}
              </Select>
            </FormControl>

            <Text mt={4} fontSize="sm" color="gray.600">
              Le signataire recevra un email de Yousign avec un lien sécurisé pour signer le document.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={() => { onContractualisationClose(); setSelectedContractualisationSigner(''); }}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchContractualisationProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
              isDisabled={!selectedContractualisationSigner}
            >
              Envoyer la demande de signature
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="brand.500">
              Supprimer le client
            </AlertDialogHeader>

            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible et supprimera également toutes les procédures et documents associés.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteClient}
                ml={3}
                isLoading={isDeleting}
                loadingText="Suppression..."
              >
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Modal de confirmation de suppression de document */}
      <AlertDialog
        isOpen={isDeleteDocOpen}
        leastDestructiveRef={cancelDocRef}
        onClose={onDeleteDocClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold" color="brand.500">
              Supprimer le document
            </AlertDialogHeader>

            <AlertDialogBody>
              Êtes-vous sûr de vouloir supprimer le document <strong>{docToDelete?.title}</strong> ? Cette action est irréversible.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelDocRef} onClick={onDeleteDocClose}>
                Annuler
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDeleteDocument}
                ml={3}
                isLoading={isDeletingDoc}
                loadingText="Suppression..."
              >
                Supprimer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Stack>
  );
}
