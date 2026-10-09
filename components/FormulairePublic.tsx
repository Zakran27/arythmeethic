'use client';

import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  HStack,
  Heading,
  Icon,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import { useState } from 'react';
import { RECUEIL_UPLOAD_MAX_BYTES, uploadExtension } from '@/lib/validators';

// Blocs communs des formulaires publics (recueil, préparation accompagnement)

export function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card bg="white" shadow="sm">
      <CardBody>
        <Stack spacing={4}>
          <HStack spacing={3}>
            <Flex
              boxSize={7}
              flexShrink={0}
              borderRadius="full"
              bg="accent.500"
              color="white"
              fontSize="sm"
              fontWeight="bold"
              align="center"
              justify="center"
            >
              {n}
            </Flex>
            <Heading size="sm" color="brand.500" fontFamily="heading">
              {title}
            </Heading>
          </HStack>
          {children}
        </Stack>
      </CardBody>
    </Card>
  );
}

// Zone de dépôt : PDF ou image (`pdfOnly` : PDF seulement), 15 Mo max par fichier, `max` fichiers
export function FileDrop({
  id,
  files,
  max,
  pdfOnly = false,
  onChange,
}: {
  id: string;
  files: File[];
  max: number;
  pdfOnly?: boolean;
  onChange: (files: File[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    const picked = Array.from(list || []);
    const ok = picked.filter(f => {
      const ext = uploadExtension(f.name);
      return (pdfOnly ? ext === 'pdf' : ext) && f.size <= RECUEIL_UPLOAD_MAX_BYTES;
    });
    setError(
      ok.length < picked.length
        ? pdfOnly
          ? 'Fichier refusé : PDF uniquement, 15 Mo maximum.'
          : 'Fichier refusé : PDF ou image (JPG, PNG…) uniquement, 15 Mo maximum par fichier.'
        : null
    );
    onChange([...files, ...ok].slice(0, max));
  };

  return (
    <Stack spacing={2}>
      {files.map((file, i) => (
        <Flex
          key={`${file.name}-${i}`}
          align="center"
          justify="space-between"
          p={3}
          bg="green.50"
          border="1px solid"
          borderColor="green.200"
          borderRadius="lg"
        >
          <HStack spacing={2} minW={0}>
            <Icon as={FiFile} color="green.500" />
            <Text fontSize="sm" color="green.700" noOfLines={1}>
              {file.name}
            </Text>
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            leftIcon={<Icon as={FiX} />}
          >
            Supprimer
          </Button>
        </Flex>
      ))}
      {files.length < max && (
        <Box
          as="label"
          htmlFor={id}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={6}
          border="2px dashed"
          borderColor="gray.300"
          borderRadius="lg"
          cursor="pointer"
          _hover={{ borderColor: 'accent.500', bg: 'gray.50' }}
          transition="all 0.2s"
        >
          <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
          <Text color="gray.500" fontSize="sm">
            {max > 1
              ? 'Cliquez pour sélectionner un ou plusieurs fichiers'
              : 'Cliquez pour sélectionner un fichier'}
          </Text>
          <Input
            id={id}
            type="file"
            accept={pdfOnly ? '.pdf,application/pdf' : '.pdf,image/*'}
            multiple={max > 1}
            onChange={e => {
              add(e.target.files);
              e.target.value = '';
            }}
            display="none"
          />
        </Box>
      )}
      {error && (
        <Text fontSize="sm" color="red.500">
          {error}
        </Text>
      )}
    </Stack>
  );
}
