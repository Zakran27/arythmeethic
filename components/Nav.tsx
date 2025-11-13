'use client';

import { Box, Flex, Button, Container, HStack, useColorModeValue, Text, Image } from '@chakra-ui/react';
import Link from 'next/link';

export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const bg = useColorModeValue('white', 'graphite.700');
  const borderColor = useColorModeValue('sand.200', 'graphite.600');

  return (
    <Box bg={bg} borderBottom="1px" borderColor={borderColor}>
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <Link href="/">
            <HStack spacing={3}>
              <Image src="/logo.jpg" alt="A Rythme Ethic" h="40px" />
              <Text fontSize="xl" fontWeight="bold" color="brand.500" display={{ base: 'none', md: 'block' }}>
                A Rythme Ethic
              </Text>
            </HStack>
          </Link>
          <HStack spacing={4}>
            {isAdmin ? (
              <>
                <Link href="/admin/clients">
                  <Button variant="ghost" color="graphite.600" _hover={{ bg: 'sand.100' }}>Clients</Button>
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
