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
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : 'https://arythmeethic.fr';
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/admin/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Une erreur est survenue',
        status: 'error',
        duration: 5000,
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
                    Mot de passe oublié
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Entrez votre adresse email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </Text>
                </Box>

                {sent ? (
                  <Box bg="green.50" p={4} borderRadius="md" borderLeft="4px" borderColor="green.500">
                    <Text fontWeight="600" color="green.700" mb={1}>
                      Email envoyé !
                    </Text>
                    <Text fontSize="sm" color="green.600">
                      Vérifiez votre boîte de réception ({email}). Si vous ne voyez pas l&apos;email, regardez dans
                      les spams.
                    </Text>
                  </Box>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          placeholder="florence.louazel@arythmeethic.fr"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        width="full"
                        isLoading={loading}
                      >
                        Envoyer le lien
                      </Button>
                    </Stack>
                  </form>
                )}

                <Box textAlign="center" pt={4} borderTop="1px" borderColor="gray.200">
                  <ChakraLink as={Link} href="/admin/login" color="brand.600" fontSize="sm">
                    ← Retour à la connexion
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
