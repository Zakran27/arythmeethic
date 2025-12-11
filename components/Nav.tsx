'use client';

import { Box, Flex, Button, Container, HStack, Text, Image } from '@chakra-ui/react';
import Link from 'next/link';

export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <Box bg="white" borderBottom="1px" borderColor="grey.300">
      <Container maxW="container.xl">
        <Flex h={16} alignItems="center" justifyContent="space-between">
          <Link href="/">
            <HStack spacing={3} cursor="pointer" _hover={{ opacity: 0.8 }} transition="opacity 0.2s">
              <Image src="/logo.jpg" alt="A Rythme Ethic" h="40px" borderRadius="md" />
              <Text 
                fontSize="xl" 
                fontWeight="600" 
                color="brand.500" 
                display={{ base: 'none', md: 'block' }}
                fontFamily="heading"
              >
                A Rythme Ethic
              </Text>
            </HStack>
          </Link>
          <HStack spacing={4}>
            {isAdmin ? (
              <>
                <Link href="/admin/clients">
                  <Button variant="ghost" color="brand.600">Contacts</Button>
                </Link>
              </>
            ) : (
              <Link href="/admin/login">
                <Button colorScheme="accent" size={{ base: 'sm', md: 'md' }}>
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
