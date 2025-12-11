'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Card,
  CardBody,
  useToast,
  Link as ChakraLink,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Check if user is already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/admin/clients');
      }
    });
  }, [supabase, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('Email ou mot de passe incorrect');
        }
        throw error;
      }

      toast({
        title: 'Connexion réussie',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      router.push('/admin/clients');
    } catch (error) {
      toast({
        title: 'Erreur de connexion',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={20}>
      <Container maxW="md">
        <Stack spacing={8}>
          <Box textAlign="center">
            <Link href="/">
              <Heading color="brand.600" mb={2}>
                A Rythme Ethic
              </Heading>
            </Link>
            <Text color="gray.600">Portail administrateur</Text>
          </Box>

          <Card>
            <CardBody>
              <Stack spacing={6}>
                <Box>
                  <Heading size="md" mb={2}>
                    Connexion
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Connectez-vous avec votre email et mot de passe
                  </Text>
                </Box>

                <form onSubmit={handleLogin}>
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Email</FormLabel>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>Mot de passe</FormLabel>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </FormControl>

                    <Button
                      type="submit"
                      colorScheme="brand"
                      size="lg"
                      width="full"
                      isLoading={loading}
                    >
                      Se connecter
                    </Button>
                  </Stack>
                </form>

                <Box textAlign="center" pt={4} borderTop="1px" borderColor="gray.200">
                  <ChakraLink as={Link} href="/" color="brand.600" fontSize="sm">
                    ← Retour à l'accueil
                  </ChakraLink>
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
