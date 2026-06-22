'use client';

import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Text,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Spinner,
  Code,
  Wrap,
  WrapItem,
  Divider,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { getEmailTemplateMeta, DEFAULT_TEMPLATE_CONTENT } from '@/lib/email-templates';
import { RichTextEditor } from '@/components/RichTextEditor';

export default function EmailTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const key = params.key as string;
  const meta = getEmailTemplateMeta(key);
  const toast = useToast();
  const supabase = createClient();

  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasCustom, setHasCustom] = useState(false);

  useEffect(() => {
    if (!meta || !meta.wired) {
      setLoading(false);
      return;
    }
    supabase
      .from('email_templates')
      .select('subject, html')
      .eq('key', key)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.html) {
          setSubject(data.subject || '');
          setHtml(data.html || '');
          setHasCustom(true);
        }
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!meta || !meta.wired) {
    return (
      <Stack spacing={4}>
        <Heading size="md" color="brand.500">
          Template non disponible
        </Heading>
        <Text color="gray.600">
          Ce template n’est pas encore éditable. Revenez à la liste.
        </Text>
        <Button alignSelf="start" onClick={() => router.push('/admin/email-templates')}>
          ← Retour
        </Button>
      </Stack>
    );
  }

  const loadDefault = () => {
    const def = DEFAULT_TEMPLATE_CONTENT[key];
    if (def) {
      setSubject(def.subject);
      setHtml(def.html);
      toast({
        title: 'Modèle par défaut chargé',
        description: 'Pensez à enregistrer pour l’appliquer.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSave = async () => {
    if (!html.trim() || !subject.trim()) {
      toast({
        title: 'Champs requis',
        description: 'Le sujet et le contenu HTML sont requis.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .upsert({ key, subject, html, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    setHasCustom(true);
    toast({
      title: 'Template enregistré',
      description: 'Les prochains emails utiliseront cette version.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  const handleReset = async () => {
    setSaving(true);
    const { error } = await supabase.from('email_templates').delete().eq('key', key);
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, status: 'error', duration: 5000 });
      return;
    }
    setSubject('');
    setHtml('');
    setHasCustom(false);
    toast({
      title: 'Réinitialisé',
      description: 'L’email utilisera de nouveau la version par défaut.',
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };

  return (
    <Stack spacing={5}>
      <HStack justify="space-between" align="start" flexWrap="wrap" spacing={3}>
        <Box>
          <Button variant="ghost" size="sm" mb={2} onClick={() => router.push('/admin/email-templates')}>
            ← Retour
          </Button>
          <Heading color="brand.500" fontFamily="heading" size="lg">
            {meta.name}
          </Heading>
          <Text color="gray.600" fontSize="sm" mt={1}>
            {meta.description}
          </Text>
        </Box>
      </HStack>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : (
        <Stack spacing={4}>
          <Box bg="blue.50" border="1px solid" borderColor="blue.100" borderRadius="md" p={3}>
            <Text fontSize="sm" fontWeight="600" color="blue.700" mb={1}>
              Variables disponibles
            </Text>
            <Text fontSize="xs" color="blue.600" mb={2}>
              Insérez ces variables dans le sujet ou le contenu, elles seront remplacées
              automatiquement.
            </Text>
            <Wrap>
              {meta.variables.map(v => (
                <WrapItem key={v}>
                  <Code fontSize="xs" colorScheme="blue">{`{{${v}}}`}</Code>
                </WrapItem>
              ))}
            </Wrap>
          </Box>

          <FormControl isRequired>
            <FormLabel>Sujet de l’email</FormLabel>
            <Input value={subject} onChange={e => setSubject(e.target.value)} bg="white" />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Contenu de l’email</FormLabel>
            <Text fontSize="xs" color="gray.500" mb={2}>
              L’en-tête, le pied de page et le tableau des montants sont ajoutés automatiquement.
              Tapez les variables (ex. {'{{clientName}}'}) directement dans le texte.
            </Text>
            <RichTextEditor value={html} onChange={setHtml} />
          </FormControl>

          <Divider />

          <HStack justify="space-between" flexWrap="wrap" spacing={3}>
            <Button variant="outline" onClick={loadDefault}>
              Charger le modèle par défaut
            </Button>
            <HStack spacing={3}>
              {hasCustom && (
                <Button variant="ghost" colorScheme="red" onClick={handleReset} isLoading={saving}>
                  Réinitialiser au défaut
                </Button>
              )}
              <Button colorScheme="accent" onClick={handleSave} isLoading={saving}>
                Enregistrer
              </Button>
            </HStack>
          </HStack>
        </Stack>
      )}
    </Stack>
  );
}
