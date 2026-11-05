'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Stack,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

// Second facteur (TOTP) après le mot de passe. Le middleware renvoie ici toute session admin en
// aal1 dont le compte a un facteur vérifié ; hors de ce cas il redirige vers /admin/clients.
export default function MfaPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code)) {
      setError('Le code fait 6 chiffres.');
      return;
    }
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const factor = data?.totp[0];
    const { error: verifyError } = factor
      ? await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
      : { error: new Error() };
    setLoading(false);
    if (verifyError) {
      setError(
        "Code incorrect ou expiré. Saisissez le code affiché maintenant dans l'application."
      );
      return;
    }
    router.push('/admin/clients');
    router.refresh();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <Box minH="100vh" bg="gray.50" py={20}>
      <Container maxW="md">
        <Stack spacing={8}>
          <Box textAlign="center">
            <Heading color="brand.600" mb={2}>
              A Rythme Ethic
            </Heading>
            <Text color="gray.600">Portail administrateur</Text>
          </Box>

          <Card>
            <CardBody>
              <Stack spacing={6}>
                <Box>
                  <Heading size="md" mb={2}>
                    Code de vérification
                  </Heading>
                  <Text color="gray.600" fontSize="sm">
                    Ouvrez votre application d&apos;authentification et saisissez le code à 6
                    chiffres.
                  </Text>
                </Box>

                <form onSubmit={verify}>
                  <Stack spacing={4}>
                    <FormControl isInvalid={!!error}>
                      <FormLabel>Code</FormLabel>
                      <Input
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        autoFocus
                        fontSize="lg"
                        letterSpacing="0.3em"
                        placeholder="123456"
                      />
                      <FormErrorMessage>{error}</FormErrorMessage>
                    </FormControl>
                    <Button
                      type="submit"
                      colorScheme="brand"
                      size="lg"
                      width="full"
                      isLoading={loading}
                    >
                      Valider le code
                    </Button>
                  </Stack>
                </form>

                <Button variant="link" size="sm" color="gray.600" onClick={logout}>
                  Se déconnecter
                </Button>
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
