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
} from '@chakra-ui/react';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useClientDetail } from '@/lib/hooks/useClientDetail';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { EditClientModal } from './EditClientModal';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { client, procedures, loading, error, refetch } = useClientDetail(clientId);
  const { isOpen, onOpen, onClose } = useDisclosure();
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
  const [isLaunchingProcedure, setIsLaunchingProcedure] = useState(false);
  const toast = useToast();

  const handleClientUpdated = () => {
    refetch();
    onClose();
  };

  const handleLaunchRecueilProcedure = async () => {
    setIsLaunchingProcedure(true);
    try {
      const response = await fetch('/api/procedures/recueil-informations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors du lancement de la procédure');
      }

      toast({
        title: 'Procédure lancée',
        description: 'Un email avec le formulaire a été envoyé au client.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      onRecueilClose();
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
        <Button variant="outline" onClick={onOpen} borderColor="brand.500" color="brand.500">
          Modifier
        </Button>
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
              Procédures ({procedures.length})
            </Heading>

            {/* Procedure Buttons - Different for Particulier vs École */}
            <HStack spacing={3} flexWrap="wrap">
              {isEcole ? (
                <>
                  <Button colorScheme="accent" size="sm">
                    Qualification
                  </Button>
                  <Button colorScheme="accent" size="sm">
                    Contractualisation
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

            {procedures.length > 0 ? (
              <Stack spacing={3}>
                {procedures.map(proc => (
                  <Card key={proc.id} variant="outline" borderColor="grey.300" _hover={{ borderColor: 'accent.300', shadow: 'md' }} transition="all 0.2s">
                    <CardBody>
                      <Link href={`/admin/procedures/${proc.id}`}>
                        <HStack justify="space-between">
                          <Stack spacing={1}>
                            <Text fontWeight="bold">{proc.procedure_type?.label}</Text>
                            <Text fontSize="sm" color="gray.600">
                              Créé le : {new Date(proc.created_at).toLocaleDateString('fr-FR')}
                            </Text>
                          </Stack>
                          <StatusBadge status={proc.status} />
                        </HStack>
                      </Link>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Box textAlign="center" py={8}>
                <Text color="brand.400" mb={4}>
                  Aucune procédure pour le moment
                </Text>
                <Text fontSize="sm" color="terracotta.400">
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
              <Heading size="md" color="brand.500" fontFamily="heading" fontWeight="600">Documents</Heading>
              <Button variant="outline" size="sm" borderColor="brand.600" color="brand.600">
                Voir tous les documents
              </Button>
            </HStack>
            <Text color="brand.600" fontSize="sm">
              La gestion des documents sera disponible une fois les procédures créées
            </Text>
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
      <Modal isOpen={isRecueilOpen} onClose={onRecueilClose} isCentered>
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
            <Text mt={3}>
              Un email sera envoyé à <strong>{client?.email_parent1 || client?.email_jeune || client?.email}</strong> avec un lien vers un formulaire pré-rempli pour compléter les informations du dossier.
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onRecueilClose}>
              Annuler
            </Button>
            <Button
              colorScheme="accent"
              onClick={handleLaunchRecueilProcedure}
              isLoading={isLaunchingProcedure}
              loadingText="Envoi en cours..."
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
              <li>L'emploi du temps du jeune</li>
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
    </Stack>
  );
}
