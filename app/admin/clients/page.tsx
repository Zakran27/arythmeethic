'use client';

import {
  Heading,
  Button,
  Stack,
  HStack,
  useDisclosure,
  Input,
  InputGroup,
  InputLeftElement,
  Box,
  Text,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Badge,
} from '@chakra-ui/react';
import { FiSearch } from 'react-icons/fi';
import { useState, useMemo } from 'react';
import { ClientsTable } from './ClientsTable';
import { NewClientModal } from './NewClientModal';
import { useClients } from '@/lib/hooks/useClients';
import { Client } from '@/types';
import { AdvancedFilters, FilterCondition, FilterField, applyFilters } from '@/components/admin/AdvancedFilters';

export default function ClientsPage() {
  const { clients, loading, error, refetch } = useClients();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  // Define filterable fields
  const filterFields: FilterField[] = [
    { key: 'first_name', label: 'Prénom', type: 'text' },
    { key: 'last_name', label: 'Nom', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'type_client', label: 'Type', type: 'select', options: [
      { value: 'Particulier', label: 'Particulier' },
      { value: 'École', label: 'Établissement' },
    ]},
    { key: 'sub_type', label: 'Sous-type', type: 'select', options: [
      { value: 'Jeune', label: 'Jeune / Élève' },
      { value: 'Parent', label: 'Parent' },
    ]},
    { key: 'organisation', label: 'Organisation', type: 'text' },
    { key: 'city', label: 'Ville', type: 'text' },
    { key: 'postal_code', label: 'Code postal', type: 'text' },
    { key: 'first_name_jeune', label: 'Prénom jeune', type: 'text' },
    { key: 'last_name_jeune', label: 'Nom jeune', type: 'text' },
    { key: 'first_name_parent1', label: 'Prénom parent 1', type: 'text' },
    { key: 'last_name_parent1', label: 'Nom parent 1', type: 'text' },
    { key: 'first_name_parent2', label: 'Prénom parent 2', type: 'text' },
    { key: 'last_name_parent2', label: 'Nom parent 2', type: 'text' },
  ];

  const handleClientCreated = () => {
    refetch();
    onClose();
  };

  // Filter clients based on search and advanced filters
  const filterClients = (clientsList: Client[]) => {
    // First apply text search
    let filtered = clientsList.filter(client => {
      if (searchQuery === '') return true;
      const searchLower = searchQuery.toLowerCase();
      return (
        client.first_name?.toLowerCase().includes(searchLower) ||
        client.last_name?.toLowerCase().includes(searchLower) ||
        client.email?.toLowerCase().includes(searchLower) ||
        client.organisation?.toLowerCase().includes(searchLower) ||
        client.first_name_jeune?.toLowerCase().includes(searchLower) ||
        client.last_name_jeune?.toLowerCase().includes(searchLower) ||
        client.first_name_parent1?.toLowerCase().includes(searchLower) ||
        client.last_name_parent1?.toLowerCase().includes(searchLower)
      );
    });

    // Then apply advanced filters
    filtered = applyFilters(filtered, filters);

    return filtered;
  };

  // Separate prospects and clients
  const prospects = useMemo(() => {
    const prospectsList = clients.filter(c => c.client_status === 'Prospect' || !c.client_status);
    return filterClients(prospectsList);
  }, [clients, searchQuery, filters]);

  const activeClients = useMemo(() => {
    const clientsList = clients.filter(c => c.client_status === 'Client');
    return filterClients(clientsList);
  }, [clients, searchQuery, filters]);

  return (
    <Stack spacing={6}>
      <HStack justify="space-between" align="center">
        <Heading color="brand.500" fontFamily="heading">Gestion des contacts</Heading>
        <Button colorScheme="accent" onClick={onOpen}>
          + Nouveau contact
        </Button>
      </HStack>

      {/* Search and Filters */}
      <Stack spacing={3}>
        <HStack spacing={4} flexWrap="wrap">
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <FiSearch color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Rechercher par nom, email, organisation..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              bg="white"
            />
          </InputGroup>
        </HStack>

        <AdvancedFilters
          fields={filterFields}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </Stack>

      {/* Tabs for Prospects and Clients */}
      <Tabs variant="enclosed" colorScheme="accent">
        <TabList>
          <Tab>
            Prospects
            <Badge ml={2} colorScheme="orange" borderRadius="full">
              {prospects.length}
            </Badge>
          </Tab>
          <Tab>
            Clients
            <Badge ml={2} colorScheme="green" borderRadius="full">
              {activeClients.length}
            </Badge>
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            {prospects.length === 0 && !loading ? (
              <Box textAlign="center" py={10} bg="white" borderRadius="md">
                <Text color="gray.500">Aucun prospect trouvé</Text>
              </Box>
            ) : (
              <ClientsTable clients={prospects} loading={loading} error={error} />
            )}
          </TabPanel>
          <TabPanel px={0}>
            {activeClients.length === 0 && !loading ? (
              <Box textAlign="center" py={10} bg="white" borderRadius="md">
                <Text color="gray.500">Aucun client trouvé</Text>
              </Box>
            ) : (
              <ClientsTable clients={activeClients} loading={loading} error={error} />
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <NewClientModal isOpen={isOpen} onClose={onClose} onSuccess={handleClientCreated} />
    </Stack>
  );
}
