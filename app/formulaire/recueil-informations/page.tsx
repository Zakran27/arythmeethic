'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  HStack,
  Flex,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Input,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
  SimpleGrid,
  Alert,
  AlertIcon,
  Spinner,
  Image,
  Divider,
  Icon,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, Suspense } from 'react';
import { createClient } from '@/lib/supabase-client';
import { RESPONSABLES_LEGAUX, TROUBLES_APPRENTISSAGE, splitSituation } from '@/types';
import {
  RECUEIL_CONTACT_KEYS,
  RECUEIL_UPLOAD_MAX_BYTES,
  UPLOAD_MIME,
  findRecueilContactErrors,
  uploadExtension,
} from '@/lib/validators';

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

// Champs texte pré-remplis tels quels depuis la fiche
const TEXT_FIELDS = [
  ...RECUEIL_CONTACT_KEYS,
  'numero_cesu',
  'niveau_eleve',
  'etablissement_scolaire',
  'moyenne_maths',
  'moyenne_generale',
  'troubles_autre',
  'date_dernier_diagnostic',
];

// Libellé du Parent 1 selon les responsables légaux (tout est stocké en Parent 1 / Parent 2)
const PARENT1_LABEL: Record<string, string> = {
  [RESPONSABLES_LEGAUX[1]]: 'Parent',
  [RESPONSABLES_LEGAUX[2]]: 'Tuteur·rice ou personne désignée',
  [RESPONSABLES_LEGAUX[3]]: 'Responsable',
};

const CONTACT_INPUTS = [
  { field: 'first_name', label: 'Prénom', placeholder: 'Prénom' },
  { field: 'last_name', label: 'Nom', placeholder: 'Nom' },
  { field: 'phone', label: 'Téléphone portable', placeholder: '06 XX XX XX XX', type: 'tel' },
  { field: 'email', label: 'Email', placeholder: 'email@exemple.com', type: 'email' },
];

const ouiNon = (b?: boolean | null) => (b == null ? '' : b ? 'oui' : 'non');

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card bg="white" shadow="sm">
      <CardBody>
        <Stack spacing={4}>
          <HStack spacing={3}>
            <Flex
              boxSize={7}
              flexShrink={0}
              borderRadius="full"
              bg="accent.500"
              color="white"
              fontSize="sm"
              fontWeight="bold"
              align="center"
              justify="center"
            >
              {n}
            </Flex>
            <Heading size="sm" color="brand.500" fontFamily="heading">
              {title}
            </Heading>
          </HStack>
          {children}
        </Stack>
      </CardBody>
    </Card>
  );
}

// Zone de dépôt : PDF ou image, 15 Mo max par fichier, `max` fichiers
function FileDrop({
  id,
  files,
  max,
  onChange,
}: {
  id: string;
  files: File[];
  max: number;
  onChange: (files: File[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    const picked = Array.from(list || []);
    const ok = picked.filter(f => uploadExtension(f.name) && f.size <= RECUEIL_UPLOAD_MAX_BYTES);
    setError(
      ok.length < picked.length
        ? 'Fichier refusé : PDF ou image (JPG, PNG…) uniquement, 15 Mo maximum par fichier.'
        : null
    );
    onChange([...files, ...ok].slice(0, max));
  };

  return (
    <Stack spacing={2}>
      {files.map((file, i) => (
        <Flex
          key={`${file.name}-${i}`}
          align="center"
          justify="space-between"
          p={3}
          bg="green.50"
          border="1px solid"
          borderColor="green.200"
          borderRadius="lg"
        >
          <HStack spacing={2} minW={0}>
            <Icon as={FiFile} color="green.500" />
            <Text fontSize="sm" color="green.700" noOfLines={1}>
              {file.name}
            </Text>
          </HStack>
          <Button
            size="sm"
            variant="ghost"
            colorScheme="red"
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            leftIcon={<Icon as={FiX} />}
          >
            Supprimer
          </Button>
        </Flex>
      ))}
      {files.length < max && (
        <Box
          as="label"
          htmlFor={id}
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          p={6}
          border="2px dashed"
          borderColor="gray.300"
          borderRadius="lg"
          cursor="pointer"
          _hover={{ borderColor: 'accent.500', bg: 'gray.50' }}
          transition="all 0.2s"
        >
          <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
          <Text color="gray.500" fontSize="sm">
            {max > 1
              ? 'Cliquez pour sélectionner un ou plusieurs fichiers'
              : 'Cliquez pour sélectionner un fichier'}
          </Text>
          <Input
            id={id}
            type="file"
            accept=".pdf,image/*"
            multiple={max > 1}
            onChange={e => {
              add(e.target.files);
              e.target.value = '';
            }}
            display="none"
          />
        </Box>
      )}
      {error && (
        <Text fontSize="sm" color="red.500">
          {error}
        </Text>
      )}
    </Stack>
  );
}

function RecueilFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [joursError, setJoursError] = useState<string | null>(null);

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [jours, setJours] = useState<string[]>([]);
  const [troubles, setTroubles] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [edt, setEdt] = useState<File[]>([]);
  const [bilans, setBilans] = useState<File[]>([]);
  // Fichiers déjà envoyés au Storage : pas de ré-upload si l'envoi du formulaire est retenté
  const uploaded = useRef(new Map<File, string>());

  useEffect(() => {
    const fetchClient = async () => {
      if (!token) {
        setLoadError('Lien invalide ou expiré');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/formulaire/recueil-informations?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setLoadError(data.error || 'Lien invalide ou expiré');
          setLoading(false);
          return;
        }

        const c = data.client;
        const { choix, precisions } = splitSituation(c.situation_familiale);
        setFormData({
          ...Object.fromEntries(TEXT_FIELDS.map(k => [k, c[k] || ''])),
          adresse_cours: c.adresse_cours || c.address_line1 || '',
          situation: choix || (c.first_name_parent2 ? RESPONSABLES_LEGAUX[0] : ''),
          situation_precisions: precisions,
          suivi_psy: ouiNon(c.suivi_psy),
          aise_avec_diagnostics: ouiNon(c.aise_avec_diagnostics),
        });
        setJours(c.jours_disponibles || []);
        setTroubles([...(c.troubles_apprentissage || []), ...(c.troubles_autre ? ['Autre'] : [])]);
        setLoading(false);
      } catch {
        setLoadError('Erreur lors du chargement du formulaire');
        setLoading(false);
      }
    };

    fetchClient();
  }, [token]);

  const v = (name: string) => formData[name] || '';
  const set = (name: string, value: string) => setFormData(prev => ({ ...prev, [name]: value }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    set(e.target.name, e.target.value);

  const deuxParents = v('situation') === RESPONSABLES_LEGAUX[0];
  const parent1Label = deuxParents ? 'Parent 1' : PARENT1_LABEL[v('situation')] || 'Parent 1';
  const hasTroubles = troubles.length > 0;
  // Données de santé fournies → consentement explicite obligatoire
  const hasHealth = hasTroubles || v('suivi_psy') === 'oui';
  const fieldErrors = findRecueilContactErrors(formData, deuxParents);

  const personLabel = (who: 'parent1' | 'parent2', fallback: string) => {
    const name = `${v(`first_name_${who}`)} ${v(`last_name_${who}`)}`.trim() || fallback;
    return v(`email_${who}`) ? `${name} (${v(`email_${who}`)})` : name;
  };

  // URL signée (le token est vérifié, pas consommé) puis envoi direct au Storage
  const uploadFile = async (file: File) => {
    const cached = uploaded.current.get(file);
    if (cached) return cached;
    const res = await fetch('/api/formulaire/recueil-informations/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, filename: file.name, size: file.size }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error);
    // Type MIME imposé par l'extension (l'API le revérifie) : supabase-js ignore `contentType`
    // pour un Blob, c'est le type du Blob qui part (souvent vide pour un HEIC)
    const typed = new Blob([file], { type: UPLOAD_MIME[uploadExtension(data.path) ?? ''] });
    const { error } = await createClient()
      .storage.from('client-files')
      .uploadToSignedUrl(data.path, data.uploadToken, typed);
    if (error) throw new Error(`L'envoi du fichier « ${file.name} » a échoué. Réessayez.`);
    uploaded.current.set(file, data.path);
    return data.path as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setSubmitError(null);

    if (!v('situation') || (deuxParents && !v('gestionnaire'))) {
      setSubmitError('Merci de répondre aux questions des sections 1 et 3.');
      return;
    }
    if (jours.length === 0) {
      setJoursError('Veuillez sélectionner au moins un jour');
      setSubmitError('Merci de sélectionner au moins un jour possible pour le cours (section 5).');
      return;
    }
    if (Object.keys(fieldErrors).length > 0) {
      setSubmitError('Merci de corriger les champs signalés en rouge.');
      return;
    }

    setSubmitting(true);
    try {
      // Ordre imposé : uploads (token encore valide) → envoi du formulaire (consomme le token)
      const files = [
        ...edt.map(file => ({ kind: 'edt', file })),
        ...(hasTroubles ? bilans : []).map(file => ({ kind: 'bilan', file })),
      ];
      const uploads = [];
      for (const { kind, file } of files) {
        uploads.push({ kind, path: await uploadFile(file), original_filename: file.name });
      }

      const response = await fetch('/api/formulaire/recueil-informations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
          jours_disponibles: jours,
          troubles_apprentissage: troubles,
          troubles_autre: troubles.includes('Autre') ? v('troubles_autre') : '',
          consentement_sante: hasHealth && consent,
          uploads,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error);
      }
      router.push('/formulaire/recueil-informations/confirmation');
    } catch (err) {
      // Nos messages (Error simple) sont affichés ; réseau / réponse illisible → message générique
      setSubmitError(
        err instanceof Error && err.name === 'Error' && err.message
          ? err.message
          : "Erreur lors de l'envoi du formulaire. Vérifiez votre connexion et réessayez."
      );
      setSubmitting(false);
    }
  };

  const contactGrid = (who: 'parent1' | 'parent2' | 'jeune') => (
    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
      {CONTACT_INPUTS.map(({ field, label, placeholder, type }) => {
        const name = `${field}_${who}`;
        const error = showErrors ? fieldErrors[name] : undefined;
        return (
          <FormControl key={name} isRequired isInvalid={!!error}>
            <FormLabel color="brand.600">{label}</FormLabel>
            <Input
              name={name}
              type={type}
              value={v(name)}
              onChange={handleChange}
              placeholder={placeholder}
            />
            <FormErrorMessage>{error}</FormErrorMessage>
          </FormControl>
        );
      })}
    </SimpleGrid>
  );

  const ouiNonRadio = (name: string) => (
    <RadioGroup value={v(name)} onChange={value => set(name, value)}>
      <HStack spacing={6}>
        <Radio value="oui" colorScheme="accent">
          Oui
        </Radio>
        <Radio value="non" colorScheme="accent">
          Non
        </Radio>
      </HStack>
    </RadioGroup>
  );

  if (loading) {
    return (
      <Box textAlign="center" py={20}>
        <Spinner size="xl" color="accent.500" />
        <Text mt={4} color="brand.600">
          Chargement du formulaire...
        </Text>
      </Box>
    );
  }

  if (loadError) {
    return (
      <Container maxW="container.md" py={20}>
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {loadError}
        </Alert>
      </Container>
    );
  }

  return (
    <Box bg="#fafafa" minH="100vh" py={8}>
      <Container maxW="container.md">
        <Stack spacing={6}>
          {/* Header */}
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
              Recueil des informations
            </Heading>
            <Text color="brand.600" mt={2}>
              Merci de compléter les informations ci-dessous pour finaliser votre inscription
            </Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={6}>
              <Section n={1} title="Situation familiale">
                <FormControl isRequired>
                  <FormLabel color="brand.600">
                    Qui sont les responsables légaux de votre enfant ?
                  </FormLabel>
                  <Text fontSize="sm" color="gray.500" mb={3}>
                    Cette information me permet de m'adresser aux bonnes personnes et de recueillir
                    les accords nécessaires.
                  </Text>
                  <RadioGroup value={v('situation')} onChange={value => set('situation', value)}>
                    <Stack spacing={2}>
                      {RESPONSABLES_LEGAUX.map(option => (
                        <Radio key={option} value={option} colorScheme="accent">
                          {option}
                        </Radio>
                      ))}
                    </Stack>
                  </RadioGroup>
                </FormControl>
                <FormControl>
                  <FormLabel color="brand.600">Organisation particulière (facultatif)</FormLabel>
                  <Text fontSize="sm" color="gray.500" mb={2}>
                    Si votre enfant vit une organisation particulière (garde, décision de justice,
                    autre), vous pouvez m'en informer. Ces informations restent confidentielles et
                    me servent uniquement à adapter nos échanges.
                  </Text>
                  <Textarea
                    name="situation_precisions"
                    value={v('situation_precisions')}
                    onChange={handleChange}
                    rows={3}
                  />
                </FormControl>
              </Section>

              <Section
                n={2}
                title={deuxParents || !v('situation') ? 'Parents' : 'Responsable légal'}
              >
                <Heading size="xs" color="brand.500" fontFamily="heading">
                  {parent1Label}
                </Heading>
                {contactGrid('parent1')}
                {deuxParents && (
                  <>
                    <Divider />
                    <Heading size="xs" color="brand.500" fontFamily="heading">
                      Parent 2
                    </Heading>
                    {contactGrid('parent2')}
                  </>
                )}
              </Section>

              <Section n={3} title="Gestion administrative">
                {deuxParents && (
                  <FormControl isRequired>
                    <FormLabel color="brand.600">Qui fait la gestion administrative ?</FormLabel>
                    <Text fontSize="sm" color="gray.500" mb={3}>
                      Signature du contrat, déclarations mensuelles… Cette personne sera mon
                      interlocuteur principal.
                    </Text>
                    <RadioGroup
                      value={v('gestionnaire')}
                      onChange={value => set('gestionnaire', value)}
                    >
                      <Stack spacing={2} wordBreak="break-word">
                        <Radio value="parent1" colorScheme="accent">
                          {personLabel('parent1', 'Parent 1')}
                        </Radio>
                        <Radio value="parent2" colorScheme="accent">
                          {personLabel('parent2', 'Parent 2')}
                        </Radio>
                      </Stack>
                    </RadioGroup>
                  </FormControl>
                )}
                <FormControl>
                  <FormLabel color="brand.600">Numéro CESU (facultatif)</FormLabel>
                  <Input
                    name="numero_cesu"
                    value={v('numero_cesu')}
                    onChange={handleChange}
                    placeholder="Numéro CESU si vous en avez un"
                  />
                </FormControl>
              </Section>

              <Section n={4} title="Jeune / Élève">
                <Text fontSize="sm" color="gray.500">
                  Le téléphone et l'email du jeune doivent être différents de ceux des parents.
                </Text>
                {contactGrid('jeune')}
              </Section>

              <Section n={5} title="Scolarité et disponibilités">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel color="brand.600">Niveau de l'élève</FormLabel>
                    <Input
                      name="niveau_eleve"
                      value={v('niveau_eleve')}
                      onChange={handleChange}
                      placeholder="Ex: 3ème, 2nde, Terminale..."
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="brand.600">Établissement scolaire</FormLabel>
                    <Input
                      name="etablissement_scolaire"
                      value={v('etablissement_scolaire')}
                      onChange={handleChange}
                      placeholder="Nom du collège/lycée"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="brand.600">Moyenne en mathématiques</FormLabel>
                    <Input
                      name="moyenne_maths"
                      value={v('moyenne_maths')}
                      onChange={handleChange}
                      placeholder="Ex: 12/20"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel color="brand.600">Moyenne générale</FormLabel>
                    <Input
                      name="moyenne_generale"
                      value={v('moyenne_generale')}
                      onChange={handleChange}
                      placeholder="Ex: 14/20"
                    />
                  </FormControl>
                </SimpleGrid>
                <FormControl isRequired>
                  <FormLabel color="brand.600">Adresse des cours particuliers</FormLabel>
                  <Input
                    name="adresse_cours"
                    value={v('adresse_cours')}
                    onChange={handleChange}
                    placeholder="Adresse complète où se dérouleront les cours"
                  />
                </FormControl>
                <FormControl isInvalid={!!joursError}>
                  <FormLabel color="brand.600">
                    Jours possibles pour le cours
                    <Text as="span" color="red.500" ml={1}>
                      *
                    </Text>
                  </FormLabel>
                  <CheckboxGroup
                    value={jours}
                    onChange={values => {
                      setJours(values as string[]);
                      if (values.length > 0) setJoursError(null);
                    }}
                  >
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                      {JOURS_SEMAINE.map(jour => (
                        <Checkbox key={jour} value={jour} colorScheme="accent">
                          {jour}
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </CheckboxGroup>
                  <FormErrorMessage>{joursError}</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel color="brand.600">Emploi du temps de l'élève (facultatif)</FormLabel>
                  <Text fontSize="sm" color="gray.500" mb={2}>
                    PDF ou image, 15 Mo maximum.
                  </Text>
                  <FileDrop id="emploi-du-temps" files={edt} max={1} onChange={setEdt} />
                </FormControl>
              </Section>

              <Section n={6} title="Besoins particuliers (facultatif)">
                <Box
                  bg="brand.50"
                  border="1px solid"
                  borderColor="brand.100"
                  borderRadius="md"
                  p={3}
                >
                  <Text fontSize="sm" color="brand.600">
                    Ces informations sont strictement confidentielles : elles ne seront jamais
                    diffusées et servent uniquement à adapter l'accompagnement.
                  </Text>
                </Box>
                <FormControl>
                  <FormLabel color="brand.600">
                    Votre enfant présente-t-il un trouble de l'apprentissage, du développement et/ou
                    une neuroatypie ?
                  </FormLabel>
                  <Text fontSize="sm" color="gray.500" mb={2}>
                    Plusieurs choix possibles.
                  </Text>
                  <CheckboxGroup
                    value={troubles}
                    onChange={values => setTroubles(values as string[])}
                  >
                    <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={2}>
                      {[...TROUBLES_APPRENTISSAGE, 'Autre'].map(trouble => (
                        <Checkbox key={trouble} value={trouble} colorScheme="accent">
                          {trouble}
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </CheckboxGroup>
                </FormControl>
                {troubles.includes('Autre') && (
                  <FormControl isRequired>
                    <FormLabel color="brand.600">Précisez</FormLabel>
                    <Input
                      name="troubles_autre"
                      value={v('troubles_autre')}
                      onChange={handleChange}
                    />
                  </FormControl>
                )}
                <FormControl>
                  <FormLabel color="brand.600">
                    Votre enfant est-il suivi par un psychologue (ou autre professionnel) ?
                  </FormLabel>
                  {ouiNonRadio('suivi_psy')}
                </FormControl>
                {hasTroubles && (
                  <>
                    <FormControl>
                      <FormLabel color="brand.600">
                        Votre enfant est-il à l'aise avec ses diagnostics ?
                      </FormLabel>
                      {ouiNonRadio('aise_avec_diagnostics')}
                    </FormControl>
                    <FormControl>
                      <FormLabel color="brand.600">Date du dernier diagnostic</FormLabel>
                      <Input
                        type="date"
                        name="date_dernier_diagnostic"
                        value={v('date_dernier_diagnostic')}
                        onChange={handleChange}
                        max={new Date().toISOString().slice(0, 10)}
                        maxW="220px"
                      />
                      <FormHelperText>
                        Si vous ne connaissez pas le jour exact, indiquez le 1er du mois.
                      </FormHelperText>
                    </FormControl>
                    <FormControl>
                      <FormLabel color="brand.600">Bilans et documents (facultatif)</FormLabel>
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Bilan orthophonique, psychologique… tout document que vous jugez utile. PDF
                        ou image, 15 Mo maximum par fichier, 5 fichiers maximum.
                      </Text>
                      <FileDrop id="bilans" files={bilans} max={5} onChange={setBilans} />
                    </FormControl>
                  </>
                )}
                {hasHealth && (
                  <FormControl isRequired>
                    <Checkbox
                      isChecked={consent}
                      onChange={e => setConsent(e.target.checked)}
                      colorScheme="accent"
                      alignItems="flex-start"
                    >
                      <Text fontSize="sm" color="brand.600">
                        J'accepte que ces informations soient conservées par A Rythme Ethic
                        uniquement pour adapter l'accompagnement de mon enfant.
                      </Text>
                    </Checkbox>
                  </FormControl>
                )}
              </Section>

              <Section n={7} title="Validation">
                <Text fontSize="sm" color="gray.500">
                  Vérifiez vos réponses : les fichiers joints sont envoyés avec le formulaire.
                </Text>
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
                  Envoyer les informations
                </Button>
              </Section>
            </Stack>
          </form>
        </Stack>
      </Container>
    </Box>
  );
}

export default function RecueilInformationsPage() {
  return (
    <Suspense
      fallback={
        <Box textAlign="center" py={20}>
          <Spinner size="xl" color="accent.500" />
          <Text mt={4} color="brand.600">
            Chargement...
          </Text>
        </Box>
      }
    >
      <RecueilFormContent />
    </Suspense>
  );
}
