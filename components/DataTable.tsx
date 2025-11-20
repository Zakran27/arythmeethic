'use client';

import { Table, Thead, Tbody, Tr, Th, Td, Box, Card, CardBody, Text } from '@chakra-ui/react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
}: DataTableProps<T>) {
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
              {columns.map(col => (
                <Th key={col.key} color="brand.600" textTransform="none" fontSize="sm" fontWeight="600">
                  {col.label}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.map((item, idx) => (
              <Tr
                key={idx}
                onClick={() => onRowClick?.(item)}
                cursor={onRowClick ? 'pointer' : 'default'}
                _hover={onRowClick ? { bg: '#fafafa' } : undefined}
                transition="background 0.2s"
              >
                {columns.map(col => (
                  <Td key={col.key} color="brand.600">
                    {col.render ? col.render(item) : item[col.key]}
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
