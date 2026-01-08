'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  CheckboxGroup,
  SimpleGrid,
  Alert,
  AlertIcon,
  Spinner,
  Image,
  Divider,
} from '@chakra-ui/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { Client } from '@/types';

const JOURS_SEMAINE = [
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
  'Dimanche',
];

function RecueilFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<Client | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Parents
    first_name_parent1: '',
    last_name_parent1: '',
    phone_parent1: '',
    email_parent1: '',
    first_name_parent2: '',
    last_name_parent2: '',
    phone_parent2: '',
    email_parent2: '',
    // CESU
    numero_cesu: '',
    // Jeune
    first_name_jeune: '',
    last_name_jeune: '',
    phone_jeune: '',
    email_jeune: '',
    // Cours
    adresse_cours: '',
    niveau_eleve: '',
    etablissement_scolaire: '',
    moyenne_maths: '',
    moyenne_generale: '',
    jours_disponibles: [] as string[],
  });

  useEffect(() => {
    const fetchClient = async () => {
      if (!token) {
        setError('Lien invalide ou expiré');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/formulaire/recueil-informations?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Lien invalide ou expiré');
          setLoading(false);
          return;
        }

        setClient(data.client);
        // Pre-fill form with existing data
        setFormData({
          first_name_parent1: data.client.first_name_parent1 || '',
          last_name_parent1: data.client.last_name_parent1 || '',
          phone_parent1: data.client.phone_parent1 || '',
          email_parent1: data.client.email_parent1 || '',
          first_name_parent2: data.client.first_name_parent2 || '',
          last_name_parent2: data.client.last_name_parent2 || '',
          phone_parent2: data.client.phone_parent2 || '',
          email_parent2: data.client.email_parent2 || '',
          numero_cesu: data.client.numero_cesu || '',
          first_name_jeune: data.client.first_name_jeune || '',
          last_name_jeune: data.client.last_name_jeune || '',
          phone_jeune: data.client.phone_jeune || '',
          email_jeune: data.client.email_jeune || '',
          adresse_cours: data.client.adresse_cours || data.client.address_line1 || '',
          niveau_eleve: data.client.niveau_eleve || '',
          etablissement_scolaire: data.client.etablissement_scolaire || '',
          moyenne_maths: data.client.moyenne_maths || '',
          moyenne_generale: data.client.moyenne_generale || '',
          jours_disponibles: data.client.jours_disponibles || [],
        });
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement du formulaire');
        setLoading(false);
      }
    };

    fetchClient();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleJoursChange = (values: string[]) => {
    setFormData(prev => ({ ...prev, jours_disponibles: values }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/formulaire/recueil-informations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...formData }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Erreur lors de l\'envoi du formulaire');
        setSubmitting(false);
        return;
      }

      // Redirect to confirmation page
      router.push('/formulaire/recueil-informations/confirmation');
    } catch (err) {
      setError('Erreur lors de l\'envoi du formulaire');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box textAlign="center" py={20}>
        <Spinner size="xl" color="accent.500" />
        <Text mt={4} color="brand.600">Chargement du formulaire...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxW="container.md" py={20}>
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {error}
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
              {/* Parent 1 */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Parent 1 (responsable légal)
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Prénom</FormLabel>
                        <Input
                          name="first_name_parent1"
                          value={formData.first_name_parent1}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom</FormLabel>
                        <Input
                          name="last_name_parent1"
                          value={formData.last_name_parent1}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Téléphone portable</FormLabel>
                        <Input
                          name="phone_parent1"
                          type="tel"
                          value={formData.phone_parent1}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Email</FormLabel>
                        <Input
                          name="email_parent1"
                          type="email"
                          value={formData.email_parent1}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Parent 2 */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Parent 2 (facultatif)
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel color="brand.600">Prénom</FormLabel>
                        <Input
                          name="first_name_parent2"
                          value={formData.first_name_parent2}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Nom</FormLabel>
                        <Input
                          name="last_name_parent2"
                          value={formData.last_name_parent2}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Téléphone portable</FormLabel>
                        <Input
                          name="phone_parent2"
                          type="tel"
                          value={formData.phone_parent2}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Email</FormLabel>
                        <Input
                          name="email_parent2"
                          type="email"
                          value={formData.email_parent2}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* CESU */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <FormControl>
                    <FormLabel color="brand.600">Numéro CESU (facultatif)</FormLabel>
                    <Input
                      name="numero_cesu"
                      value={formData.numero_cesu}
                      onChange={handleChange}
                      placeholder="Numéro CESU si vous en avez un"
                    />
                  </FormControl>
                </CardBody>
              </Card>

              {/* Jeune */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Jeune / Élève
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Prénom</FormLabel>
                        <Input
                          name="first_name_jeune"
                          value={formData.first_name_jeune}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom</FormLabel>
                        <Input
                          name="last_name_jeune"
                          value={formData.last_name_jeune}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Téléphone portable</FormLabel>
                        <Input
                          name="phone_jeune"
                          type="tel"
                          value={formData.phone_jeune}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Email</FormLabel>
                        <Input
                          name="email_jeune"
                          type="email"
                          value={formData.email_jeune}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Informations scolaires */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Informations scolaires
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Niveau de l'élève</FormLabel>
                        <Input
                          name="niveau_eleve"
                          value={formData.niveau_eleve}
                          onChange={handleChange}
                          placeholder="Ex: 3ème, 2nde, Terminale..."
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Établissement scolaire</FormLabel>
                        <Input
                          name="etablissement_scolaire"
                          value={formData.etablissement_scolaire}
                          onChange={handleChange}
                          placeholder="Nom du collège/lycée"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Moyenne en mathématiques</FormLabel>
                        <Input
                          name="moyenne_maths"
                          value={formData.moyenne_maths}
                          onChange={handleChange}
                          placeholder="Ex: 12/20"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Moyenne générale</FormLabel>
                        <Input
                          name="moyenne_generale"
                          value={formData.moyenne_generale}
                          onChange={handleChange}
                          placeholder="Ex: 14/20"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Adresse et disponibilités */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Lieu et disponibilités
                    </Heading>
                    <FormControl isRequired>
                      <FormLabel color="brand.600">Adresse des cours particuliers</FormLabel>
                      <Input
                        name="adresse_cours"
                        value={formData.adresse_cours}
                        onChange={handleChange}
                        placeholder="Adresse complète où se dérouleront les cours"
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel color="brand.600">Jours possibles pour le cours</FormLabel>
                      <CheckboxGroup
                        value={formData.jours_disponibles}
                        onChange={handleJoursChange}
                      >
                        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                          {JOURS_SEMAINE.map(jour => (
                            <Checkbox key={jour} value={jour} colorScheme="cyan">
                              {jour}
                            </Checkbox>
                          ))}
                        </SimpleGrid>
                      </CheckboxGroup>
                    </FormControl>
                  </Stack>
                </CardBody>
              </Card>

              {/* Submit */}
              <Button
                type="submit"
                colorScheme="accent"
                size="lg"
                isLoading={submitting}
                loadingText="Envoi en cours..."
              >
                Envoyer les informations
              </Button>
            </Stack>
          </form>
        </Stack>
      </Container>
    </Box>
  );
}

export default function RecueilInformationsPage() {
  return (
    <Suspense fallback={
      <Box textAlign="center" py={20}>
        <Spinner size="xl" color="accent.500" />
        <Text mt={4} color="brand.600">Chargement...</Text>
      </Box>
    }>
      <RecueilFormContent />
    </Suspense>
  );
}
