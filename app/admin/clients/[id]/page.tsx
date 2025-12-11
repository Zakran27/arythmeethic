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
  Divider,
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

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" align="center">
        <Heading color="brand.500" fontFamily="heading">
          {client.first_name} {client.last_name}
        </Heading>
        <Button variant="outline" onClick={onOpen} borderColor="brand.500" color="brand.500">
          Modifier
        </Button>
      </HStack>

      <Card bg="white" shadow="sm">
        <CardBody>
          <Stack spacing={4}>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <Text fontWeight="bold">Statut</Text>
                <Badge colorScheme={client.client_status === 'Client' ? 'green' : 'orange'}>
                  {client.client_status || 'Prospect'}
                </Badge>
              </GridItem>
              <GridItem>
                <Text fontWeight="bold">Type</Text>
                <Text>{client.type_client}{client.sub_type ? ` (${client.sub_type})` : ''}</Text>
              </GridItem>
              {isEcole && (
                <GridItem>
                  <Text fontWeight="bold">Organisation</Text>
                  <Text>{client.organisation || '—'}</Text>
                </GridItem>
              )}
            </Grid>

            {isParticulier && (
              <>
                <Divider />
                <Text fontWeight="bold" fontSize="md" color="brand.500">Jeune / Élève</Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <Text fontWeight="bold">Nom</Text>
                    <Text>{client.last_name_jeune || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Prénom</Text>
                    <Text>{client.first_name_jeune || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Téléphone</Text>
                    <Text>{client.phone_jeune || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Email</Text>
                    <Text>{client.email_jeune || '—'}</Text>
                  </GridItem>
                </Grid>

                <Divider />
                <Text fontWeight="bold" fontSize="md" color="brand.500">Parent 1</Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <Text fontWeight="bold">Nom</Text>
                    <Text>{client.last_name_parent1 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Prénom</Text>
                    <Text>{client.first_name_parent1 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Téléphone</Text>
                    <Text>{client.phone_parent1 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Email</Text>
                    <Text>{client.email_parent1 || '—'}</Text>
                  </GridItem>
                </Grid>

                <Divider />
                <Text fontWeight="bold" fontSize="md" color="brand.500">Parent 2</Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <Text fontWeight="bold">Nom</Text>
                    <Text>{client.last_name_parent2 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Prénom</Text>
                    <Text>{client.first_name_parent2 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Téléphone</Text>
                    <Text>{client.phone_parent2 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Email</Text>
                    <Text>{client.email_parent2 || '—'}</Text>
                  </GridItem>
                </Grid>
              </>
            )}

            {isEcole && (
              <>
                <Divider />
                <Text fontWeight="bold" fontSize="md" color="brand.500">Contact</Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <GridItem>
                    <Text fontWeight="bold">Email</Text>
                    <Text>{client.email}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Téléphone 1</Text>
                    <Text>{client.phone1 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Téléphone 2</Text>
                    <Text>{client.phone2 || '—'}</Text>
                  </GridItem>
                  <GridItem>
                    <Text fontWeight="bold">Téléphone 3</Text>
                    <Text>{client.phone3 || '—'}</Text>
                  </GridItem>
                </Grid>
              </>
            )}

            <Divider />
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem colSpan={2}>
                <Text fontWeight="bold">Adresse</Text>
                <Text>
                  {client.address_line1 || '—'}
                  {client.postal_code && `, ${client.postal_code}`}
                  {client.city && ` ${client.city}`}
                </Text>
              </GridItem>
              {client.notes && (
                <GridItem colSpan={2}>
                  <Text fontWeight="bold">Notes</Text>
                  <Text>{client.notes}</Text>
                </GridItem>
              )}
            </Grid>
          </Stack>
        </CardBody>
      </Card>

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
