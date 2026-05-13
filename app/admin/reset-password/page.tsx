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
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const supabase = createClient();

  // Supabase places the recovery session in the URL hash and the client picks it up automatically
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
      }
    });
    // Also check current session at mount in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => {
      subscription?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: 'Mot de passe trop court (min 8 caractères)', status: 'warning', duration: 3000 });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Les mots de passe ne correspondent pas', status: 'warning', duration: 3000 });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Mot de passe mis à jour', status: 'success', duration: 3000 });
      router.push('/admin/clients');
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
                    Nouveau mot de passe
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Choisissez un nouveau mot de passe pour votre compte.
                  </Text>
                </Box>

                {!ready ? (
                  <Box bg="orange.50" p={4} borderRadius="md" borderLeft="4px" borderColor="orange.500">
                    <Text fontWeight="600" color="orange.700" mb={1}>
                      Lien non valide ou expiré
                    </Text>
                    <Text fontSize="sm" color="orange.600">
                      Ce lien de réinitialisation n&apos;est pas valide. Demandez-en un nouveau.
                    </Text>
                    <ChakraLink
                      as={Link}
                      href="/admin/forgot-password"
                      color="brand.600"
                      fontSize="sm"
                      mt={3}
                      display="inline-block"
                    >
                      Demander un nouveau lien
                    </ChakraLink>
                  </Box>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
                      <FormControl isRequired>
                        <FormLabel>Nouveau mot de passe</FormLabel>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          minLength={8}
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel>Confirmer le mot de passe</FormLabel>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                          minLength={8}
                        />
                      </FormControl>
                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        width="full"
                        isLoading={loading}
                      >
                        Mettre à jour le mot de passe
                      </Button>
                    </Stack>
                  </form>
                )}
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
