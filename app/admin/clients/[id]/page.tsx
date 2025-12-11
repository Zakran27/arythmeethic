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
} from '@chakra-ui/react';
import { useParams } from 'next/navigation';
import { useClientDetail } from '@/lib/hooks/useClientDetail';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import { EditClientModal } from './EditClientModal';

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params.id as string;
  const { client, procedures, loading, error, refetch } = useClientDetail(clientId);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleClientUpdated = () => {
    refetch();
    onClose();
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
  const isJeune = client.sub_type === 'Jeune';
  const isParent = client.sub_type === 'Parent';

  // Get display name for header
  const getDisplayName = () => {
    if (isEcole) {
      return client.organisation || `${client.first_name} ${client.last_name}`;
    }
    if (isJeune && (client.first_name_jeune || client.last_name_jeune)) {
      return `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim();
    }
    if (isParent && (client.first_name_parent1 || client.last_name_parent1)) {
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
              {isParticulier && client.sub_type && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Sous-type</Text>
                  <Text fontWeight="medium">{client.sub_type === 'Jeune' ? 'Jeune / Élève' : 'Parent'}</Text>
                </GridItem>
              )}
              {(isJeune || isParent) && client.niveau_eleve && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Niveau</Text>
                  <Text fontWeight="medium">{client.niveau_eleve}</Text>
                </GridItem>
              )}
              {(isJeune || isParent) && client.demande_type && (
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Type de demande</Text>
                  <Text fontWeight="medium">{client.demande_type}</Text>
                </GridItem>
              )}
            </Grid>
          </Stack>
        </CardBody>
      </Card>

      {/* ========== JEUNE / ÉLÈVE CONTACTS ========== */}
      {isJeune && (
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

      {/* ========== PARENT CONTACT ========== */}
      {isParent && (
        <Card bg="white" shadow="sm">
          <CardBody>
            <Stack spacing={3}>
              <Heading size="sm" color="brand.500" fontFamily="heading">Parent</Heading>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(4, 1fr)' }} gap={4}>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Nom complet</Text>
                  <Text fontWeight="medium">
                    {client.first_name_parent1 || client.last_name_parent1
                      ? `${client.first_name_parent1 || ''} ${client.last_name_parent1 || ''}`.trim()
                      : '—'}
                  </Text>
                </GridItem>
                <GridItem>
                  <Text fontSize="sm" color="gray.500">Téléphone</Text>
                  <Text fontWeight="medium">{client.phone_parent1 || '—'}</Text>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <Text fontSize="sm" color="gray.500">Email</Text>
                  <Text fontWeight="medium">{client.email_parent1 || '—'}</Text>
                </GridItem>
              </Grid>
            </Stack>
          </CardBody>
        </Card>
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

            {/* Procedure Buttons - Different for École */}
            <HStack spacing={3} flexWrap="wrap">
              {isEcole ? (
                <>
                  <Button colorScheme="accent" size="sm">
                    Qualification
                  </Button>
                  <Button bg="green.500" color="white" size="sm" _hover={{ bg: 'green.600' }}>
                    Contractualisation
                  </Button>
                  <Button bg="terracotta.400" color="white" size="sm" _hover={{ bg: 'terracotta.500' }}>
                    Enquête de satisfaction
                  </Button>
                </>
              ) : (
                <>
                  <Button colorScheme="accent" size="sm">
                    Nouveau client
                  </Button>
                  <Button bg="green.500" color="white" size="sm" _hover={{ bg: 'green.600' }}>
                    Renouvellement
                  </Button>
                  <Button bg="terracotta.400" color="white" size="sm" _hover={{ bg: 'terracotta.500' }}>
                    Demander documents
                  </Button>
                  <Button bg="brand.600" color="white" size="sm" _hover={{ bg: 'brand.500' }}>
                    Upload document
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
    </Stack>
  );
}
