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
  Badge,
  Box,
  useDisclosure,
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
        <Spinner size="xl" color="brand.500" />
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

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" align="center">
        <Heading>
          {client.first_name} {client.last_name}
        </Heading>
        <Button colorScheme="gray" variant="outline" onClick={onOpen}>
          Modifier
        </Button>
      </HStack>

      <Card>
        <CardBody>
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
            <GridItem>
              <Text fontWeight="bold">Type</Text>
              <Text>{client.type_client}</Text>
            </GridItem>
            <GridItem>
              <Text fontWeight="bold">Organisation</Text>
              <Text>{client.organisation || '—'}</Text>
            </GridItem>
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
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <Heading size="md">Procédures ({procedures.length})</Heading>

            {/* n8n Workflow Buttons */}
            <HStack spacing={3} flexWrap="wrap">
              <Button colorScheme="blue" size="sm">
                Nouveau client
              </Button>
              <Button colorScheme="green" size="sm">
                Renouvellement
              </Button>
              <Button colorScheme="purple" size="sm">
                Demander documents
              </Button>
              <Button colorScheme="orange" size="sm">
                Upload document
              </Button>
            </HStack>

            {procedures.length > 0 ? (
              <Stack spacing={3}>
                {procedures.map(proc => (
                  <Card key={proc.id} variant="outline">
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
                <Text color="gray.500" mb={4}>
                  Aucune procédure pour le moment
                </Text>
                <Text fontSize="sm" color="gray.400">
                  Utilisez les boutons ci-dessus pour lancer une procédure
                </Text>
              </Box>
            )}
          </Stack>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <Stack spacing={4}>
            <HStack justify="space-between">
              <Heading size="md">Documents</Heading>
              <Button variant="outline" size="sm">
                Voir tous les documents
              </Button>
            </HStack>
            <Text color="gray.500" fontSize="sm">
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
