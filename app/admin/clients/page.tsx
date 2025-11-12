'use client';

import { Heading, Button, Stack, HStack, useDisclosure } from '@chakra-ui/react';
import { ClientsTable } from './ClientsTable';
import { NewClientModal } from './NewClientModal';
import { useClients } from '@/lib/hooks/useClients';

export default function ClientsPage() {
  const { clients, loading, error, refetch } = useClients();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleClientCreated = () => {
    refetch();
    onClose();
  };

  return (
    <Stack spacing={6}>
      <HStack justify="space-between">
        <Heading>Clients</Heading>
        <Button colorScheme="brand" onClick={onOpen}>
          + Nouveau client
        </Button>
      </HStack>

      <ClientsTable clients={clients} loading={loading} error={error} />

      <NewClientModal isOpen={isOpen} onClose={onClose} onSuccess={handleClientCreated} />
    </Stack>
  );
}
