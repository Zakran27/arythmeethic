'use client';

import {
  Box,
  HStack,
  VStack,
  Select,
  Input,
  IconButton,
  Button,
  Text,
  Wrap,
  WrapItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverHeader,
  PopoverCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { FiPlus, FiFilter, FiX } from 'react-icons/fi';
import { useState } from 'react';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'not_equals';
  value: string;
}

interface AdvancedFiltersProps {
  fields: FilterField[];
  filters: FilterCondition[];
  onFiltersChange: (filters: FilterCondition[]) => void;
}

const operatorLabels: Record<string, string> = {
  equals: 'est égal à',
  contains: 'contient',
  starts_with: 'commence par',
  not_equals: 'est différent de',
};

export function AdvancedFilters({ fields, filters, onFiltersChange }: AdvancedFiltersProps) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newFilter, setNewFilter] = useState<Partial<FilterCondition>>({
    field: fields[0]?.key || '',
    operator: 'contains',
    value: '',
  });

  const selectedField = fields.find(f => f.key === newFilter.field);

  const addFilter = () => {
    if (!newFilter.field || !newFilter.value) return;

    const filter: FilterCondition = {
      id: `${Date.now()}`,
      field: newFilter.field,
      operator: newFilter.operator as FilterCondition['operator'],
      value: newFilter.value,
    };

    onFiltersChange([...filters, filter]);
    setNewFilter({
      field: fields[0]?.key || '',
      operator: 'contains',
      value: '',
    });
    onClose();
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const getFieldLabel = (key: string) => {
    return fields.find(f => f.key === key)?.label || key;
  };

  const getValueLabel = (field: string, value: string) => {
    const fieldDef = fields.find(f => f.key === field);
    if (fieldDef?.type === 'select' && fieldDef.options) {
      return fieldDef.options.find(o => o.value === value)?.label || value;
    }
    return value;
  };

  return (
    <Box>
      <HStack spacing={3} flexWrap="wrap" align="center">
        <Popover isOpen={isOpen} onOpen={onOpen} onClose={onClose} placement="bottom-start">
          <PopoverTrigger>
            <Button
              leftIcon={<FiFilter />}
              variant="outline"
              size="sm"
              borderColor="brand.500"
              color="brand.500"
              _hover={{ bg: 'brand.50' }}
            >
              Ajouter un filtre
            </Button>
          </PopoverTrigger>
          <PopoverContent width="400px">
            <PopoverHeader fontWeight="semibold" borderBottomWidth="1px">
              Nouveau filtre
            </PopoverHeader>
            <PopoverCloseButton />
            <PopoverBody>
              <VStack spacing={3} align="stretch">
                <Box>
                  <Text fontSize="sm" mb={1} color="gray.600">Champ</Text>
                  <Select
                    value={newFilter.field}
                    onChange={e => setNewFilter({ ...newFilter, field: e.target.value, value: '' })}
                    size="sm"
                  >
                    {fields.map(field => (
                      <option key={field.key} value={field.key}>
                        {field.label}
                      </option>
                    ))}
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" mb={1} color="gray.600">Condition</Text>
                  <Select
                    value={newFilter.operator}
                    onChange={e => setNewFilter({ ...newFilter, operator: e.target.value as FilterCondition['operator'] })}
                    size="sm"
                  >
                    {selectedField?.type === 'select' ? (
                      <>
                        <option value="equals">est égal à</option>
                        <option value="not_equals">est différent de</option>
                      </>
                    ) : (
                      <>
                        <option value="contains">contient</option>
                        <option value="equals">est égal à</option>
                        <option value="starts_with">commence par</option>
                        <option value="not_equals">est différent de</option>
                      </>
                    )}
                  </Select>
                </Box>

                <Box>
                  <Text fontSize="sm" mb={1} color="gray.600">Valeur</Text>
                  {selectedField?.type === 'select' && selectedField.options ? (
                    <Select
                      value={newFilter.value}
                      onChange={e => setNewFilter({ ...newFilter, value: e.target.value })}
                      size="sm"
                      placeholder="Sélectionnez..."
                    >
                      {selectedField.options.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      value={newFilter.value}
                      onChange={e => setNewFilter({ ...newFilter, value: e.target.value })}
                      placeholder="Entrez une valeur..."
                      size="sm"
                    />
                  )}
                </Box>

                <Button
                  colorScheme="accent"
                  size="sm"
                  onClick={addFilter}
                  isDisabled={!newFilter.value}
                  leftIcon={<FiPlus />}
                >
                  Ajouter
                </Button>
              </VStack>
            </PopoverBody>
          </PopoverContent>
        </Popover>

        {filters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            color="gray.500"
            onClick={clearAllFilters}
            leftIcon={<FiX />}
          >
            Effacer tout
          </Button>
        )}
      </HStack>

      {filters.length > 0 && (
        <Wrap spacing={2} mt={3}>
          {filters.map(filter => (
            <WrapItem key={filter.id}>
              <Tag
                size="md"
                borderRadius="full"
                variant="solid"
                bg="accent.100"
                color="accent.800"
              >
                <TagLabel>
                  {getFieldLabel(filter.field)} {operatorLabels[filter.operator]} "{getValueLabel(filter.field, filter.value)}"
                </TagLabel>
                <TagCloseButton onClick={() => removeFilter(filter.id)} />
              </Tag>
            </WrapItem>
          ))}
        </Wrap>
      )}
    </Box>
  );
}

// Helper function to apply filters to a dataset
export function applyFilters<T>(
  data: T[],
  filters: FilterCondition[]
): T[] {
  if (filters.length === 0) return data;

  return data.filter(item => {
    return filters.every(filter => {
      const itemValue = (item as Record<string, unknown>)[filter.field];
      const value = String(itemValue || '').toLowerCase();
      const filterValue = filter.value.toLowerCase();

      switch (filter.operator) {
        case 'equals':
          return value === filterValue;
        case 'contains':
          return value.includes(filterValue);
        case 'starts_with':
          return value.startsWith(filterValue);
        case 'not_equals':
          return value !== filterValue;
        default:
          return true;
      }
    });
  });
}
