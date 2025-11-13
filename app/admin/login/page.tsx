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
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Check for auth errors in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      if (error === 'access_denied' || errorDescription?.includes('expired')) {
        toast({
          title: 'Lien expiré',
          description: 'Ce lien magique a expiré. Veuillez en demander un nouveau.',
          status: 'error',
          duration: 7000,
          isClosable: true,
        });
        // Clean up URL
        window.history.replaceState({}, document.title, '/admin/login');
      }
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/admin/clients');
      }
    });
  }, [supabase, toast, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user exists in profiles table (authorized users only)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .single();

      if (!profile) {
        throw new Error("Email non autorisé. Contactez l'administrateur.");
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: 'Lien magique envoyé !',
        description: 'Consultez votre email pour le lien de connexion',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : "Échec de l'envoi du lien magique",
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
                {!emailSent ? (
                  <>
                    <Box>
                      <Heading size="md" mb={2}>
                        Connexion
                      </Heading>
                      <Text color="gray.600" fontSize="sm">
                        Nous vous enverrons un lien magique pour vous connecter
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

                        <Button
                          type="submit"
                          colorScheme="brand"
                          size="lg"
                          width="full"
                          isLoading={loading}
                        >
                          Envoyer le lien magique
                        </Button>
                      </Stack>
                    </form>
                  </>
                ) : (
                  <Box textAlign="center" py={4}>
                    <Heading size="md" mb={2}>
                      Vérifiez votre email
                    </Heading>
                    <Text color="gray.600" mb={4}>
                      Nous avons envoyé un lien magique à <strong>{email}</strong>
                    </Text>
                    <Button variant="link" colorScheme="brand" onClick={() => setEmailSent(false)}>
                      Utiliser un autre email
                    </Button>
                  </Box>
                )}

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
