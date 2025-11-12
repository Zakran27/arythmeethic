'use client';

import { Box, Flex, Button, Container, HStack, useColorModeValue, Text } from '@chakra-ui/react';
import Link from 'next/link';

export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const bg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box bg={bg} borderBottom="1px" borderColor={borderColor}>
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <Link href="/">
            <Text fontSize="xl" fontWeight="bold" color="brand.600">
              Tutorflow
            </Text>
          </Link>
          <HStack spacing={4}>
            {isAdmin ? (
              <>
                <Link href="/admin/clients">
                  <Button variant="ghost">Clients</Button>
                </Link>
              </>
            ) : (
              <Link href="/admin/login">
                <Button colorScheme="brand" size={{ base: 'sm', md: 'md' }}>
                  Connexion
                </Button>
              </Link>
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
