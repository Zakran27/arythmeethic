'use client';

import { DataTable } from '@/components/DataTable';
import { Client } from '@/types';
import { useRouter } from 'next/navigation';
import { Badge, Spinner, Alert, AlertIcon, Box } from '@chakra-ui/react';

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
  error: string | null;
}

export function ClientsTable({ clients, loading, error }: ClientsTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="brand.500" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  return (
    <DataTable
      columns={[
        {
          key: 'first_name',
          label: 'Nom',
          render: (client: Client) => `${client.first_name} ${client.last_name}`,
        },
        { key: 'email', label: 'Email' },
        {
          key: 'type_client',
          label: 'Type',
          render: (client: Client) => (
            <Badge colorScheme={client.type_client === 'École' ? 'purple' : 'blue'}>
              {client.type_client}
            </Badge>
          ),
        },
        {
          key: 'created_at',
          label: 'Créé le',
          render: (client: Client) => new Date(client.created_at).toLocaleDateString('fr-FR'),
        },
      ]}
      data={clients}
      onRowClick={client => router.push(`/admin/clients/${client.id}`)}
    />
  );
}
