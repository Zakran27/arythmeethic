'use client';

import {
  Box,
  Heading,
  Stack,
  Text,
  Switch,
  Textarea,
  FormControl,
  FormLabel,
  Button,
  useToast,
  Spinner,
  Card,
  CardBody,
  HStack,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

interface Msg {
  enabled: boolean;
  message: string;
}

export default function BandeauxPage() {
  const supabase = createClient();
  const toast = useToast();
  const [popup, setPopup] = useState<Msg>({ enabled: false, message: '' });
  const [banner, setBanner] = useState<Msg>({ enabled: false, message: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('site_messages')
      .select('key, enabled, message')
      .then(({ data }) => {
        for (const row of data ?? []) {
          if (row.key === 'popup') setPopup({ enabled: row.enabled, message: row.message || '' });
          if (row.key === 'banner') setBanner({ enabled: row.enabled, message: row.message || '' });
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('site_messages').upsert([
      { key: 'popup', enabled: popup.enabled, message: popup.message, updated_at: new Date().toISOString() },
      { key: 'banner', enabled: banner.enabled, message: banner.message, updated_at: new Date().toISOString() },
    ]);
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, status: 'error', duration: 5000, isClosable: true });
      return;
    }
    toast({ title: 'Enregistré', status: 'success', duration: 3000, isClosable: true });
  };

  return (
    <Stack spacing={6}>
      <Box>
        <Heading color="brand.500" fontFamily="heading">
          Bandeaux / popups
        </Heading>
        <Text color="gray.600" fontSize="sm" mt={1}>
          Messages temporaires affichés sur le site public. Activez-les et modifiez le texte ici ;
          décochez pour les retirer.
        </Text>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : (
        <Stack spacing={5}>
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <HStack justify="space-between">
                  <Box>
                    <Text fontWeight="600" color="brand.600">
                      Popup central
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Fenêtre affichée à l’arrivée sur la page d’accueil.
                    </Text>
                  </Box>
                  <Switch
                    isChecked={popup.enabled}
                    onChange={e => setPopup({ ...popup, enabled: e.target.checked })}
                    colorScheme="accent"
                    size="lg"
                  />
                </HStack>
                <FormControl>
                  <FormLabel fontSize="sm">Message</FormLabel>
                  <Textarea
                    value={popup.message}
                    onChange={e => setPopup({ ...popup, message: e.target.value })}
                    rows={4}
                    bg="white"
                  />
                </FormControl>
              </Stack>
            </CardBody>
          </Card>

          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <HStack justify="space-between">
                  <Box>
                    <Text fontWeight="600" color="brand.600">
                      Bandeau défilant
                    </Text>
                    <Text fontSize="sm" color="gray.500">
                      Bandeau qui défile en haut de la page d’accueil (texte court conseillé).
                    </Text>
                  </Box>
                  <Switch
                    isChecked={banner.enabled}
                    onChange={e => setBanner({ ...banner, enabled: e.target.checked })}
                    colorScheme="accent"
                    size="lg"
                  />
                </HStack>
                <FormControl>
                  <FormLabel fontSize="sm">Message</FormLabel>
                  <Textarea
                    value={banner.message}
                    onChange={e => setBanner({ ...banner, message: e.target.value })}
                    rows={2}
                    bg="white"
                  />
                </FormControl>
              </Stack>
            </CardBody>
          </Card>

          <Box>
            <Button colorScheme="accent" onClick={save} isLoading={saving}>
              Enregistrer
            </Button>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
