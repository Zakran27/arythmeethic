'use client';

import {
  Box,
  Heading,
  Stack,
  Text,
  FormControl,
  FormLabel,
  FormErrorMessage,
  Input,
  Button,
  useToast,
  Spinner,
  Card,
  CardBody,
  Image,
  Code,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

type Enrolment = { factorId: string; qr: string; secret: string };

// Double authentification (TOTP) du compte connecté : activation par QR code, désactivation.
// Une fois activée, le middleware et is_admin() exigent le code à chaque connexion.
export default function SecuritePage() {
  const supabase = createClient();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [enrolment, setEnrolment] = useState<Enrolment | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setActiveId(data?.totp[0]?.id ?? null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    // Une activation abandonnée laisse un facteur non vérifié : on le retire avant d'en créer un
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const f of factors?.all ?? []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `A Rythme Ethic ${new Date().toISOString().slice(0, 10)}`,
    });
    setBusy(false);
    if (enrollError || !data) {
      toast({ title: "Impossible de démarrer l'activation", status: 'error', isClosable: true });
      return;
    }
    setEnrolment({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!enrolment) return;
    if (!/^\d{6}$/.test(code)) {
      setError('Le code fait 6 chiffres.');
      return;
    }
    setBusy(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolment.factorId,
      code,
    });
    setBusy(false);
    if (verifyError) {
      setError("Code incorrect. Saisissez le code affiché maintenant dans l'application.");
      return;
    }
    setEnrolment(null);
    setCode('');
    toast({ title: 'Double authentification activée', status: 'success', isClosable: true });
    load();
  };

  const disable = async () => {
    if (!activeId) return;
    setBusy(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: activeId });
    setBusy(false);
    if (unenrollError) {
      toast({ title: 'Désactivation impossible', status: 'error', isClosable: true });
      return;
    }
    toast({ title: 'Double authentification désactivée', status: 'info', isClosable: true });
    load();
  };

  return (
    <Stack spacing={6}>
      <Box>
        <Heading color="brand.500" fontFamily="heading">
          Sécurité du compte
        </Heading>
        <Text color="gray.600" fontSize="sm" mt={1}>
          La double authentification demande, en plus du mot de passe, un code à 6 chiffres donné
          par une application sur votre téléphone (Google Authenticator, Microsoft Authenticator…).
        </Text>
      </Box>

      {loading ? (
        <Spinner color="brand.500" />
      ) : (
        <Card>
          <CardBody>
            <Stack spacing={5}>
              <HStack>
                <Text fontWeight="semibold">Double authentification</Text>
                <Badge colorScheme={activeId ? 'green' : 'gray'}>
                  {activeId ? 'Activée' : 'Désactivée'}
                </Badge>
              </HStack>

              {activeId && (
                <Box>
                  <Button variant="outline" colorScheme="red" onClick={disable} isLoading={busy}>
                    Désactiver la double authentification
                  </Button>
                </Box>
              )}

              {!activeId && !enrolment && (
                <Box>
                  <Button colorScheme="brand" onClick={start} isLoading={busy}>
                    Activer la double authentification
                  </Button>
                </Box>
              )}

              {enrolment && (
                <form onSubmit={confirm}>
                  <Stack spacing={4} maxW="sm">
                    <Text fontSize="sm">
                      1. Dans l&apos;application, ajoutez un compte en scannant ce QR code.
                    </Text>
                    <Image src={enrolment.qr} alt="QR code à scanner" boxSize="200px" />
                    <Text fontSize="sm" color="gray.600">
                      Pas de scan possible ? Saisissez cette clé : <Code>{enrolment.secret}</Code>
                    </Text>
                    <FormControl isInvalid={!!error}>
                      <FormLabel>2. Code affiché par l&apos;application</FormLabel>
                      <Input
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                      />
                      <FormErrorMessage>{error}</FormErrorMessage>
                    </FormControl>
                    <Box>
                      <Button type="submit" colorScheme="brand" isLoading={busy}>
                        Confirmer l&apos;activation
                      </Button>
                    </Box>
                  </Stack>
                </form>
              )}
            </Stack>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
}
