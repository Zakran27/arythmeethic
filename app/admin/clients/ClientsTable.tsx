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

// Helper function to get the display name based on client type
function getDisplayName(client: Client): string {
  if (client.type_client === 'École') {
    // For École, show organisation name first, then contact name
    if (client.organisation) {
      return client.organisation;
    }
    return `${client.first_name} ${client.last_name}`;
  }

  // For Particulier
  if (client.sub_type === 'Jeune') {
    // Show jeune's name
    if (client.first_name_jeune || client.last_name_jeune) {
      return `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim();
    }
  } else if (client.sub_type === 'Parent') {
    // Show parent 1's name
    if (client.first_name_parent1 || client.last_name_parent1) {
      return `${client.first_name_parent1 || ''} ${client.last_name_parent1 || ''}`.trim();
    }
  }

  // Fallback to main name
  return `${client.first_name} ${client.last_name}`;
}

// Helper function to get the display email based on client type
function getDisplayEmail(client: Client): string {
  if (client.type_client === 'École') {
    return client.email || '—';
  }

  // For Particulier
  if (client.sub_type === 'Jeune') {
    // Show jeune's email first, then parent1's email as fallback
    return client.email_jeune || client.email_parent1 || client.email || '—';
  } else if (client.sub_type === 'Parent') {
    // Show parent 1's email
    return client.email_parent1 || client.email || '—';
  }

  // Fallback to main email
  return client.email || '—';
}

// Helper function to get the display type
function getDisplayType(client: Client): string {
  if (client.type_client === 'École') {
    return 'Établissement';
  }
  return client.sub_type || 'Particulier';
}

export function ClientsTable({ clients, loading, error }: ClientsTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" color="accent.500" />
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
          sortable: true,
          render: (client: Client) => getDisplayName(client),
        },
        {
          key: 'email',
          label: 'Email',
          sortable: true,
          render: (client: Client) => getDisplayEmail(client),
        },
        {
          key: 'type_client',
          label: 'Type',
          sortable: true,
          render: (client: Client) => (
            <Badge
              colorScheme={client.type_client === 'École' ? 'accent' : 'brand'}
              bg={client.type_client === 'École' ? 'accent.100' : 'sand.200'}
              color={client.type_client === 'École' ? 'accent.700' : 'brand.700'}
            >
              {getDisplayType(client)}
            </Badge>
          ),
        },
        {
          key: 'created_at',
          label: 'Créé le',
          sortable: true,
          render: (client: Client) => new Date(client.created_at).toLocaleDateString('fr-FR'),
        },
      ]}
      data={clients}
      onRowClick={client => router.push(`/admin/clients/${client.id}`)}
    />
  );
}
