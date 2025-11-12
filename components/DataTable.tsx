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
      <Card>
        <CardBody>
          <Text color="gray.500" textAlign="center">
            No data available
          </Text>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <Box overflowX="auto">
        <Table variant="simple">
          <Thead>
            <Tr>
              {columns.map(col => (
                <Th key={col.key}>{col.label}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {data.map((item, idx) => (
              <Tr
                key={idx}
                onClick={() => onRowClick?.(item)}
                cursor={onRowClick ? 'pointer' : 'default'}
                _hover={onRowClick ? { bg: 'gray.50' } : undefined}
              >
                {columns.map(col => (
                  <Td key={col.key}>{col.render ? col.render(item) : item[col.key]}</Td>
                ))}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Card>
  );
}
