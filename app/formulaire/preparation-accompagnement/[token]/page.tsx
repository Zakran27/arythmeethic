'use client';

import { use, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Image,
  Spinner,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react';
import { createClient } from '@/lib/supabase-client';
import { parseDisponibilites } from '@/lib/validators';
import { Section, FileDrop } from '@/components/FormulairePublic';
import { DisponibilitesInput } from '@/components/DisponibilitesInput';
import type { Disponibilite } from '@/types';

const API = '/api/formulaire/preparation-accompagnement';

export default function PreparationAccompagnementPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [info, setInfo] = useState<{ jeunePrenom: string | null; anneeScolaire: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null); // lien invalide / expiré / déjà répondu
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [edt, setEdt] = useState<File[]>([]);
  const [dispos, setDispos] = useState<Disponibilite[]>([]);
  const [contraintes, setContraintes] = useState('');
  // Fichier déjà envoyé au Storage : pas de ré-upload si l'envoi du formulaire est retenté
  const uploaded = useRef(new Map<File, string>());

  useEffect(() => {
    fetch(`${API}?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) return setError(data.error || 'Lien invalide');
        setInfo(data);
        setDispos(parseDisponibilites(data.disponibilites).slots);
        setContraintes(data.contraintes || '');
      })
      .catch(() => setError('Erreur lors du chargement'));
  }, [token]);

  // URL signée (le token est vérifié, pas consommé) puis envoi direct au Storage
  const uploadFile = async (file: File) => {
    const cached = uploaded.current.get(file);
    if (cached) return cached;
    const res = await fetch(`${API}/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, filename: file.name, size: file.size }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error);
    const { error: uploadError } = await createClient()
      .storage.from('client-files')
      .uploadToSignedUrl(
        data.path,
        data.uploadToken,
        new Blob([file], { type: 'application/pdf' })
      );
    if (uploadError) throw new Error(`L'envoi du fichier « ${file.name} » a échoué. Réessayez.`);
    uploaded.current.set(file, data.path);
    return data.path as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setSubmitError(null);
    if (edt.length === 0) {
      setSubmitError("Merci de joindre l'emploi du temps (section 1).");
      return;
    }
    const { error: dispoError } = parseDisponibilites(dispos);
    if (dispoError) {
      setSubmitError(dispoError);
      return;
    }

    setSubmitting(true);
    try {
      // Ordre imposé : upload (token encore valide) → envoi du formulaire (consomme le token)
      const path = await uploadFile(edt[0]);
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          disponibilites: dispos,
          contraintes,
          edt: { path, original_filename: edt[0].name },
        }),
      });
      const data = await res.json();
      if (data.success) setDone(true);
      // 410 = déjà répondu / lien expiré : plus rien à faire
      else if (res.status === 410) setError(data.error);
      else throw new Error(data.error);
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.name === 'Error' && err.message
          ? err.message
          : "Erreur lors de l'envoi du formulaire. Vérifiez votre connexion et réessayez."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const header = (
    <Box textAlign="center" mb={4}>
      <Image
        src="/logo.jpg"
        alt="A Rythme Ethic"
        maxH="80px"
        mx="auto"
        borderRadius="xl"
        boxShadow="sm"
        mb={4}
      />
      <Heading as="h1" size="xl" color="brand.500" fontFamily="heading">
        Préparation de l&apos;accompagnement
      </Heading>
      {info && (
        <Text color="brand.600" mt={2}>
          Année scolaire {info.anneeScolaire}
        </Text>
      )}
    </Box>
  );

  const shell = (children: React.ReactNode) => (
    <Box bg="#fafafa" minH="100vh" py={8}>
      <Container maxW="container.md">
        <Stack spacing={6}>
          {header}
          {children}
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Florence Louazel - A Rythme Ethic
          </Text>
        </Stack>
      </Container>
    </Box>
  );

  if (error) {
    return shell(
      <Alert status="warning" borderRadius="lg">
        <AlertIcon />
        {error}
      </Alert>
    );
  }

  if (!info) {
    return (
      <Box minH="100vh" bg="#fafafa" display="flex" alignItems="center" justifyContent="center">
        <Spinner size="xl" color="accent.500" />
      </Box>
    );
  }

  if (done) {
    return shell(
      <Box bg="white" p={8} borderRadius="xl" shadow="sm" textAlign="center">
        <Heading size="lg" color="brand.500" fontFamily="heading" mb={4}>
          Merci !
        </Heading>
        <Text color="brand.600">
          L&apos;emploi du temps et les disponibilités
          {info.jeunePrenom ? ` de ${info.jeunePrenom}` : ''} ont bien été transmis. Je reprendrai
          contact avec vous par la suite.
        </Text>
      </Box>
    );
  }

  const prenom = info.jeunePrenom || 'votre enfant';
  return shell(
    <form onSubmit={handleSubmit}>
      <Stack spacing={6}>
        <Section n={1} title={`Emploi du temps ${info.anneeScolaire}`}>
          {/* Pas de isRequired : il rendrait obligatoire l'input fichier caché (envoi bloqué) */}
          <FormControl>
            <FormLabel color="brand.600">
              Emploi du temps de {prenom}
              <Text as="span" color="red.500" ml={1}>
                *
              </Text>
            </FormLabel>
            <Text fontSize="sm" color="gray.500" mb={2}>
              Au format PDF, 15 Mo maximum.
            </Text>
            <FileDrop id="emploi-du-temps" files={edt} max={1} pdfOnly onChange={setEdt} />
          </FormControl>
        </Section>

        <Section n={2} title="Disponibilités">
          <Text fontSize="sm" color="gray.500">
            Cochez au moins 2 jours possibles pour le cours et indiquez pour chacun le créneau
            souhaité.
          </Text>
          <DisponibilitesInput value={dispos} onChange={setDispos} showErrors={showErrors} />
        </Section>

        <Section n={3} title="Contraintes extrascolaires (facultatif)">
          <FormControl>
            <FormLabel color="brand.600">
              Activités ou rendez-vous réguliers à prendre en compte
            </FormLabel>
            <Textarea
              value={contraintes}
              onChange={e => setContraintes(e.target.value)}
              placeholder="Ex : football le mercredi de 14h à 16h, conservatoire le samedi matin…"
              rows={4}
              maxLength={2000}
            />
          </FormControl>
        </Section>

        <Section n={4} title="Validation">
          {submitError && (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {submitError}
            </Alert>
          )}
          <Button
            type="submit"
            colorScheme="accent"
            size="lg"
            isLoading={submitting}
            loadingText="Envoi en cours..."
          >
            Envoyer
          </Button>
        </Section>
      </Stack>
    </form>
  );
}
