'use client';

import { DataTable } from '@/components/DataTable';
import { Client } from '@/types';
import { useRouter } from 'next/navigation';
import { Badge, Spinner, Alert, AlertIcon, Box } from '@chakra-ui/react';
import { RecueilFormStatus } from '@/lib/hooks/useRecueilStatus';

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
  error: string | null;
  showArchivedDate?: boolean;
  // Si fourni, affiche une colonne "Formulaire" (recueil d'informations).
  // Pas d'entrée pour un client = procédure jamais lancée = pas de badge.
  recueilStatus?: Record<string, RecueilFormStatus>;
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

// Colonne « Élève / Module » : nom du jeune (particulier) ou nom du module (école)
function getEleveOuModule(client: Client): string {
  if (client.type_client === 'École') return client.ecole_module_nom || '-';
  return `${client.first_name_jeune || ''} ${client.last_name_jeune || ''}`.trim() || '-';
}

// Helper function to get the display type
function getDisplayType(client: Client): string {
  if (client.type_client === 'École') {
    return 'Établissement';
  }
  const label = client.sub_type || 'Particulier';
  // « Parent - CESU » / « Parent - Ponctuel »
  return client.mode_facturation ? `${label} - ${client.mode_facturation}` : label;
}

export function ClientsTable({
  clients,
  loading,
  error,
  showArchivedDate = false,
  recueilStatus,
}: ClientsTableProps) {
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
          key: 'eleve_module',
          label: 'Élève / Module',
          render: (client: Client) => getEleveOuModule(client),
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
        ...(recueilStatus
          ? [
              {
                key: 'recueil_status',
                label: 'Formulaire',
                render: (client: Client) => {
                  const status = recueilStatus[client.id];
                  // Procédure jamais lancée → aucun indicateur
                  if (!status) return null;
                  return status === 'rempli' ? (
                    <Badge bg="green.100" color="green.700" whiteSpace="nowrap">
                      ✓ Rempli
                    </Badge>
                  ) : (
                    <Badge bg="orange.100" color="orange.700" whiteSpace="nowrap">
                      En attente
                    </Badge>
                  );
                },
              },
            ]
          : []),
        {
          key: 'created_at',
          label: 'Créé le',
          sortable: true,
          render: (client: Client) => new Date(client.created_at).toLocaleDateString('fr-FR'),
        },
        ...(showArchivedDate
          ? [
              {
                key: 'archived_at',
                label: 'Archivé le',
                sortable: true,
                render: (client: Client) =>
                  client.archived_at
                    ? new Date(client.archived_at).toLocaleDateString('fr-FR')
                    : '-',
              },
            ]
          : []),
      ]}
      data={clients}
      onRowClick={client => router.push(`/admin/clients/${client.id}`)}
    />
  );
}
