'use client';

import { Box, Flex, Button, Container, HStack, Text, Image } from '@chakra-ui/react';
import Link from 'next/link';

type ServiceTab = 'particulier' | 'accompagnement' | 'ecole';

interface NavProps {
  onServiceClick?: (tab: ServiceTab) => void;
}

export function Nav({ onServiceClick }: NavProps) {
  return (
    <Box bg="white" borderBottom="1px" borderColor="grey.300">
      <Container maxW="container.xl">
        <Flex h={{ base: 20, md: 28 }} alignItems="center" justifyContent="space-between">
          <Link href="/">
            <HStack
              spacing={3}
              cursor="pointer"
              _hover={{ opacity: 0.8 }}
              transition="opacity 0.2s"
            >
              <Image
                src="/logo.jpg"
                alt="A Rythme Ethic"
                h={{ base: '60px', md: '96px' }}
                borderRadius="md"
              />
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
          <HStack spacing={2}>
            {onServiceClick && (
              <HStack spacing={1} display={{ base: 'none', lg: 'flex' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  color="brand.500"
                  fontWeight="500"
                  _hover={{ bg: 'sand.100', color: 'brand.600' }}
                  onClick={() => onServiceClick('particulier')}
                >
                  Cours particuliers
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  color="brand.500"
                  fontWeight="500"
                  _hover={{ bg: 'sand.100', color: 'brand.600' }}
                  onClick={() => onServiceClick('accompagnement')}
                >
                  Accompagnement
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  color="brand.500"
                  fontWeight="500"
                  _hover={{ bg: 'sand.100', color: 'brand.600' }}
                  onClick={() => onServiceClick('ecole')}
                  whiteSpace="nowrap"
                >
                  Établissements & associations
                </Button>
              </HStack>
            )}
            <Link href="/admin/login">
              <Button colorScheme="accent" size={{ base: 'sm', md: 'md' }}>
                Connexion
              </Button>
            </Link>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
}
