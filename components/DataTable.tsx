'use client';

import { Table, Thead, Tbody, Tr, Th, Td, Box, Card, CardBody, Text, HStack } from '@chakra-ui/react';
import { useState, useMemo } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  sortKey?: string; // Optional different key for sorting
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

type SortDirection = 'asc' | 'desc' | null;

// Simple sort indicator component
function SortIndicator({ direction, isActive }: { direction: SortDirection; isActive: boolean }) {
  return (
    <Box
      as="span"
      ml={1}
      opacity={isActive ? 1 : 0.3}
      transition="opacity 0.2s"
      fontSize="xs"
    >
      {isActive && direction === 'asc' ? '▲' : isActive && direction === 'desc' ? '▼' : '▲'}
    </Box>
  );
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;

    const key = column.sortKey || column.key;

    if (sortColumn === key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortColumn];
      const bValue = (b as Record<string, unknown>)[sortColumn];

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'fr', { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Date comparison (for string dates)
      if (sortColumn === 'created_at' || sortColumn.includes('date')) {
        const dateA = new Date(String(aValue)).getTime();
        const dateB = new Date(String(bValue)).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }

      // Fallback to string comparison
      const comparison = String(aValue).localeCompare(String(bValue), 'fr', { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  if (data.length === 0) {
    return (
      <Card bg="white">
        <CardBody>
          <Text color="brand.600" textAlign="center">
            Aucune donnée disponible
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card bg="white">
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead bg="#faf6f2">
            <Tr>
              {columns.map(col => {
                const isActive = sortColumn === (col.sortKey || col.key);
                return (
                  <Th
                    key={col.key}
                    color="brand.600"
                    textTransform="none"
                    fontSize="sm"
                    fontWeight="600"
                    cursor={col.sortable ? 'pointer' : 'default'}
                    onClick={() => handleSort(col)}
                    _hover={col.sortable ? { bg: 'sand.200' } : undefined}
                    transition="background 0.2s"
                    userSelect="none"
                  >
                    <HStack spacing={1}>
                      <Text>{col.label}</Text>
                      {col.sortable && (
                        <SortIndicator direction={sortDirection} isActive={isActive} />
                      )}
                    </HStack>
                  </Th>
                );
              })}
            </Tr>
          </Thead>
          <Tbody>
            {sortedData.map((item, idx) => (
              <Tr
                key={idx}
                onClick={() => onRowClick?.(item)}
                cursor={onRowClick ? 'pointer' : 'default'}
                _hover={onRowClick ? { bg: '#fafafa' } : undefined}
                transition="background 0.2s"
              >
                {columns.map(col => (
                  <Td key={col.key} color="brand.600">
                    {col.render ? col.render(item) : ((item as Record<string, unknown>)[col.key] as React.ReactNode)}
                  </Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
