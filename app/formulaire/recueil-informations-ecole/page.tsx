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
  SimpleGrid,
  Alert,
  AlertIcon,
  Spinner,
  Image,
  Select,
  Textarea,
  Icon,
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

const FORMATION_TYPES = [
  { value: 'initiale_en_alternance', label: 'Formation initiale / en alternance' },
  { value: 'continue', label: 'Formation continue' },
];

function RecueilEcoleFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [coursExempleFile, setCoursExempleFile] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    // Responsable modules
    ecole_resp_modules_nom: '',
    ecole_resp_modules_prenom: '',
    ecole_resp_modules_email: '',
    ecole_resp_modules_phone: '',
    ecole_resp_modules_peut_negocier: false,
    // Responsable autorisation
    ecole_resp_autorisation_nom: '',
    ecole_resp_autorisation_prenom: '',
    ecole_resp_autorisation_email: '',
    ecole_resp_autorisation_phone: '',
    // Responsable facturation
    ecole_resp_facturation_nom: '',
    ecole_resp_facturation_prenom: '',
    ecole_resp_facturation_email: '',
    ecole_resp_facturation_phone: '',
    // Responsable planning
    ecole_resp_planning_nom: '',
    ecole_resp_planning_prenom: '',
    ecole_resp_planning_email: '',
    ecole_resp_planning_phone: '',
    // Structure info
    organisation: '',
    address_line1: '',
    postal_code: '',
    city: '',
    ecole_siret: '',
    ecole_nda: '',
    // Module info
    ecole_module_nom: '',
    ecole_module_heures: '',
    ecole_formation_type: '',
    ecole_classes_noms: '',
    ecole_groupe_taille: '',
    ecole_evaluation_modalites: '',
    ecole_evaluation_nombre_min: '',
    ecole_module_periode: '',
    // Enseignant
    ecole_enseignant_nom: '',
    ecole_enseignant_prenom: '',
    ecole_enseignant_email: '',
  });

  useEffect(() => {
    const fetchClient = async () => {
      if (!token) {
        setError('Lien invalide ou expiré');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/formulaire/recueil-informations-ecole?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Lien invalide ou expiré');
          setLoading(false);
          return;
        }

        // Pre-fill form with existing data
        setFormData({
          // Responsable modules
          ecole_resp_modules_nom: data.client.ecole_resp_modules_nom || '',
          ecole_resp_modules_prenom: data.client.ecole_resp_modules_prenom || '',
          ecole_resp_modules_email: data.client.ecole_resp_modules_email || '',
          ecole_resp_modules_phone: data.client.ecole_resp_modules_phone || '',
          ecole_resp_modules_peut_negocier: data.client.ecole_resp_modules_peut_negocier || false,
          // Responsable autorisation
          ecole_resp_autorisation_nom: data.client.ecole_resp_autorisation_nom || '',
          ecole_resp_autorisation_prenom: data.client.ecole_resp_autorisation_prenom || '',
          ecole_resp_autorisation_email: data.client.ecole_resp_autorisation_email || '',
          ecole_resp_autorisation_phone: data.client.ecole_resp_autorisation_phone || '',
          // Responsable facturation
          ecole_resp_facturation_nom: data.client.ecole_resp_facturation_nom || '',
          ecole_resp_facturation_prenom: data.client.ecole_resp_facturation_prenom || '',
          ecole_resp_facturation_email: data.client.ecole_resp_facturation_email || '',
          ecole_resp_facturation_phone: data.client.ecole_resp_facturation_phone || '',
          // Responsable planning
          ecole_resp_planning_nom: data.client.ecole_resp_planning_nom || '',
          ecole_resp_planning_prenom: data.client.ecole_resp_planning_prenom || '',
          ecole_resp_planning_email: data.client.ecole_resp_planning_email || '',
          ecole_resp_planning_phone: data.client.ecole_resp_planning_phone || '',
          // Structure info
          organisation: data.client.organisation || '',
          address_line1: data.client.address_line1 || '',
          postal_code: data.client.postal_code || '',
          city: data.client.city || '',
          ecole_siret: data.client.ecole_siret || '',
          ecole_nda: data.client.ecole_nda || '',
          // Module info
          ecole_module_nom: data.client.ecole_module_nom || '',
          ecole_module_heures: data.client.ecole_module_heures?.toString() || '',
          ecole_formation_type: data.client.ecole_formation_type || '',
          ecole_classes_noms: data.client.ecole_classes_noms || '',
          ecole_groupe_taille: data.client.ecole_groupe_taille?.toString() || '',
          ecole_evaluation_modalites: data.client.ecole_evaluation_modalites || '',
          ecole_evaluation_nombre_min: data.client.ecole_evaluation_nombre_min?.toString() || '',
          ecole_module_periode: data.client.ecole_module_periode || '',
          // Enseignant
          ecole_enseignant_nom: data.client.ecole_enseignant_nom || '',
          ecole_enseignant_prenom: data.client.ecole_enseignant_prenom || '',
          ecole_enseignant_email: data.client.ecole_enseignant_email || '',
        });
        setLoading(false);
      } catch (err) {
        setError('Erreur lors du chargement du formulaire');
        setLoading(false);
      }
    };

    fetchClient();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Prepare data for submission (convert numbers)
      const submitData = {
        ...formData,
        ecole_module_heures: formData.ecole_module_heures ? parseInt(formData.ecole_module_heures, 10) : null,
        ecole_groupe_taille: formData.ecole_groupe_taille ? parseInt(formData.ecole_groupe_taille, 10) : null,
        ecole_evaluation_nombre_min: formData.ecole_evaluation_nombre_min ? parseInt(formData.ecole_evaluation_nombre_min, 10) : null,
      };

      const response = await fetch('/api/formulaire/recueil-informations-ecole', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...submitData }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Erreur lors de l\'envoi du formulaire');
        setSubmitting(false);
        return;
      }

      // Upload syllabus file if provided
      if (syllabusFile && data.procedureId) {
        const fileFormData = new FormData();
        fileFormData.append('file', syllabusFile);
        fileFormData.append('procedureId', data.procedureId);
        fileFormData.append('title', 'Syllabus / Contenu de la matière');
        fileFormData.append('kind', 'SUPPORTING_DOC');
        fileFormData.append('uploadedBy', 'CLIENT');

        const uploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          console.error('Failed to upload syllabus:', await uploadResponse.text());
        }
      }

      // Upload cours exemple file if provided
      if (coursExempleFile && data.procedureId) {
        const fileFormData = new FormData();
        fileFormData.append('file', coursExempleFile);
        fileFormData.append('procedureId', data.procedureId);
        fileFormData.append('title', 'Exemple de cours passés');
        fileFormData.append('kind', 'SUPPORTING_DOC');
        fileFormData.append('uploadedBy', 'CLIENT');

        const uploadResponse = await fetch('/api/storage/upload', {
          method: 'POST',
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          console.error('Failed to upload cours exemple:', await uploadResponse.text());
        }
      }

      // Redirect to confirmation page
      router.push('/formulaire/recueil-informations-ecole/confirmation');
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
              Établissement scolaire
            </Text>
          </Box>

          <form onSubmit={handleSubmit}>
            <Stack spacing={6}>
              {/* Responsable modules */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Responsable des modules (proposition)
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom</FormLabel>
                        <Input
                          name="ecole_resp_modules_nom"
                          value={formData.ecole_resp_modules_nom}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Prénom</FormLabel>
                        <Input
                          name="ecole_resp_modules_prenom"
                          value={formData.ecole_resp_modules_prenom}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Email</FormLabel>
                        <Input
                          name="ecole_resp_modules_email"
                          type="email"
                          value={formData.ecole_resp_modules_email}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Téléphone</FormLabel>
                        <Input
                          name="ecole_resp_modules_phone"
                          type="tel"
                          value={formData.ecole_resp_modules_phone}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                        />
                      </FormControl>
                    </SimpleGrid>
                    <FormControl>
                      <Checkbox
                        name="ecole_resp_modules_peut_negocier"
                        isChecked={formData.ecole_resp_modules_peut_negocier}
                        onChange={handleChange}
                        colorScheme="cyan"
                      >
                        Habilité(e) à négocier les prix
                      </Checkbox>
                    </FormControl>
                  </Stack>
                </CardBody>
              </Card>

              {/* Responsable autorisation (conditionnel) */}
              {!formData.ecole_resp_modules_peut_negocier && (
                <Card bg="white" shadow="sm">
                  <CardBody>
                    <Stack spacing={4}>
                      <Heading size="sm" color="brand.500" fontFamily="heading">
                        Responsable autorisation prix
                      </Heading>
                      <Text fontSize="sm" color="gray.500">
                        Personne habilitée à valider les prix proposés
                      </Text>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <FormControl isRequired>
                          <FormLabel color="brand.600">Nom</FormLabel>
                          <Input
                            name="ecole_resp_autorisation_nom"
                            value={formData.ecole_resp_autorisation_nom}
                            onChange={handleChange}
                            placeholder="Nom"
                          />
                        </FormControl>
                        <FormControl isRequired>
                          <FormLabel color="brand.600">Prénom</FormLabel>
                          <Input
                            name="ecole_resp_autorisation_prenom"
                            value={formData.ecole_resp_autorisation_prenom}
                            onChange={handleChange}
                            placeholder="Prénom"
                          />
                        </FormControl>
                        <FormControl isRequired>
                          <FormLabel color="brand.600">Email</FormLabel>
                          <Input
                            name="ecole_resp_autorisation_email"
                            type="email"
                            value={formData.ecole_resp_autorisation_email}
                            onChange={handleChange}
                            placeholder="email@exemple.com"
                          />
                        </FormControl>
                        <FormControl isRequired>
                          <FormLabel color="brand.600">Téléphone</FormLabel>
                          <Input
                            name="ecole_resp_autorisation_phone"
                            type="tel"
                            value={formData.ecole_resp_autorisation_phone}
                            onChange={handleChange}
                            placeholder="06 XX XX XX XX"
                          />
                        </FormControl>
                      </SimpleGrid>
                    </Stack>
                  </CardBody>
                </Card>
              )}

              {/* Responsable facturation */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Responsable facturation
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom</FormLabel>
                        <Input
                          name="ecole_resp_facturation_nom"
                          value={formData.ecole_resp_facturation_nom}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Prénom</FormLabel>
                        <Input
                          name="ecole_resp_facturation_prenom"
                          value={formData.ecole_resp_facturation_prenom}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Email</FormLabel>
                        <Input
                          name="ecole_resp_facturation_email"
                          type="email"
                          value={formData.ecole_resp_facturation_email}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Téléphone</FormLabel>
                        <Input
                          name="ecole_resp_facturation_phone"
                          type="tel"
                          value={formData.ecole_resp_facturation_phone}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Responsable planning */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Responsable planning
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom</FormLabel>
                        <Input
                          name="ecole_resp_planning_nom"
                          value={formData.ecole_resp_planning_nom}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Prénom</FormLabel>
                        <Input
                          name="ecole_resp_planning_prenom"
                          value={formData.ecole_resp_planning_prenom}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Email</FormLabel>
                        <Input
                          name="ecole_resp_planning_email"
                          type="email"
                          value={formData.ecole_resp_planning_email}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Téléphone</FormLabel>
                        <Input
                          name="ecole_resp_planning_phone"
                          type="tel"
                          value={formData.ecole_resp_planning_phone}
                          onChange={handleChange}
                          placeholder="06 XX XX XX XX"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Structure info */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Informations structure
                    </Heading>
                    <FormControl isRequired>
                      <FormLabel color="brand.600">Nom de la structure</FormLabel>
                      <Input
                        name="organisation"
                        value={formData.organisation}
                        onChange={handleChange}
                        placeholder="Nom de l'établissement"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel color="brand.600">Adresse</FormLabel>
                      <Input
                        name="address_line1"
                        value={formData.address_line1}
                        onChange={handleChange}
                        placeholder="Adresse"
                      />
                    </FormControl>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Code postal</FormLabel>
                        <Input
                          name="postal_code"
                          value={formData.postal_code}
                          onChange={handleChange}
                          placeholder="Code postal"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Ville</FormLabel>
                        <Input
                          name="city"
                          value={formData.city}
                          onChange={handleChange}
                          placeholder="Ville"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">N° SIRET</FormLabel>
                        <Input
                          name="ecole_siret"
                          value={formData.ecole_siret}
                          onChange={handleChange}
                          placeholder="SIRET (14 chiffres)"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">N° NDA</FormLabel>
                        <Input
                          name="ecole_nda"
                          value={formData.ecole_nda}
                          onChange={handleChange}
                          placeholder="Numéro de déclaration d'activité"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Module info */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Informations module
                    </Heading>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom du module</FormLabel>
                        <Input
                          name="ecole_module_nom"
                          value={formData.ecole_module_nom}
                          onChange={handleChange}
                          placeholder="Ex: Mathématiques appliquées"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nombre d'heures proposé</FormLabel>
                        <Input
                          name="ecole_module_heures"
                          type="number"
                          value={formData.ecole_module_heures}
                          onChange={handleChange}
                          placeholder="Ex: 20"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Type de formation</FormLabel>
                        <Select
                          name="ecole_formation_type"
                          value={formData.ecole_formation_type}
                          onChange={handleChange}
                          placeholder="Sélectionner..."
                        >
                          {FORMATION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Nom de la/des classe(s)</FormLabel>
                        <Input
                          name="ecole_classes_noms"
                          value={formData.ecole_classes_noms}
                          onChange={handleChange}
                          placeholder="Ex: BTS CG 1ère année"
                        />
                      </FormControl>
                      <FormControl isRequired>
                        <FormLabel color="brand.600">Taille du groupe</FormLabel>
                        <Input
                          name="ecole_groupe_taille"
                          type="number"
                          value={formData.ecole_groupe_taille}
                          onChange={handleChange}
                          placeholder="Nombre d'étudiants"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Nombre d'évaluations minimum</FormLabel>
                        <Input
                          name="ecole_evaluation_nombre_min"
                          type="number"
                          value={formData.ecole_evaluation_nombre_min}
                          onChange={handleChange}
                          placeholder="Ex: 2"
                        />
                      </FormControl>
                    </SimpleGrid>
                    <FormControl>
                      <FormLabel color="brand.600">Modalités d'évaluation</FormLabel>
                      <Textarea
                        name="ecole_evaluation_modalites"
                        value={formData.ecole_evaluation_modalites}
                        onChange={handleChange}
                        placeholder="Décrivez les modalités d'évaluation..."
                        rows={3}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel color="brand.600">Période du module</FormLabel>
                      <Input
                        name="ecole_module_periode"
                        value={formData.ecole_module_periode}
                        onChange={handleChange}
                        placeholder="Ex: Septembre 2026 - Janvier 2027"
                      />
                    </FormControl>
                  </Stack>
                </CardBody>
              </Card>

              {/* Enseignant */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Enseignant du contenu de la matière
                    </Heading>
                    <Text fontSize="sm" color="gray.500">
                      Ces informations sont facultatives. Si vous avez déjà un enseignant attitré pour le contenu de la matière, vous pouvez renseigner ses coordonnées.
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <FormControl>
                        <FormLabel color="brand.600">Prénom (facultatif)</FormLabel>
                        <Input
                          name="ecole_enseignant_prenom"
                          value={formData.ecole_enseignant_prenom}
                          onChange={handleChange}
                          placeholder="Prénom"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Nom (facultatif)</FormLabel>
                        <Input
                          name="ecole_enseignant_nom"
                          value={formData.ecole_enseignant_nom}
                          onChange={handleChange}
                          placeholder="Nom"
                        />
                      </FormControl>
                      <FormControl>
                        <FormLabel color="brand.600">Email (facultatif)</FormLabel>
                        <Input
                          name="ecole_enseignant_email"
                          type="email"
                          value={formData.ecole_enseignant_email}
                          onChange={handleChange}
                          placeholder="email@exemple.com"
                        />
                      </FormControl>
                    </SimpleGrid>
                  </Stack>
                </CardBody>
              </Card>

              {/* Documents */}
              <Card bg="white" shadow="sm">
                <CardBody>
                  <Stack spacing={4}>
                    <Heading size="sm" color="brand.500" fontFamily="heading">
                      Documents (facultatif)
                    </Heading>
                    <Text fontSize="sm" color="gray.500">
                      Ces documents nous aideront à mieux préparer les interventions. Ils ne sont pas obligatoires.
                    </Text>

                    {/* Syllabus */}
                    <FormControl>
                      <FormLabel color="brand.600">Syllabus ou contenu de la matière</FormLabel>
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Image ou PDF décrivant le programme du module
                      </Text>
                      {!syllabusFile ? (
                        <Box
                          as="label"
                          htmlFor="syllabus-file"
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
                            Cliquez pour sélectionner un fichier
                          </Text>
                          <Input
                            id="syllabus-file"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setSyllabusFile(file);
                            }}
                            display="none"
                          />
                        </Box>
                      ) : (
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          p={3}
                          bg="green.50"
                          border="1px solid"
                          borderColor="green.200"
                          borderRadius="lg"
                        >
                          <Box display="flex" alignItems="center" gap={2}>
                            <Icon as={FiFile} color="green.500" />
                            <Text fontSize="sm" color="green.700" noOfLines={1}>
                              {syllabusFile.name}
                            </Text>
                          </Box>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => setSyllabusFile(null)}
                            leftIcon={<Icon as={FiX} />}
                          >
                            Supprimer
                          </Button>
                        </Box>
                      )}
                    </FormControl>

                    {/* Exemple de cours */}
                    <FormControl>
                      <FormLabel color="brand.600">Exemple de cours passés</FormLabel>
                      <Text fontSize="sm" color="gray.500" mb={2}>
                        Image, PDF, Word ou PowerPoint d'un cours précédent
                      </Text>
                      {!coursExempleFile ? (
                        <Box
                          as="label"
                          htmlFor="cours-exemple-file"
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
                            Cliquez pour sélectionner un fichier
                          </Text>
                          <Input
                            id="cours-exemple-file"
                            type="file"
                            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) setCoursExempleFile(file);
                            }}
                            display="none"
                          />
                        </Box>
                      ) : (
                        <Box
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          p={3}
                          bg="green.50"
                          border="1px solid"
                          borderColor="green.200"
                          borderRadius="lg"
                        >
                          <Box display="flex" alignItems="center" gap={2}>
                            <Icon as={FiFile} color="green.500" />
                            <Text fontSize="sm" color="green.700" noOfLines={1}>
                              {coursExempleFile.name}
                            </Text>
                          </Box>
                          <Button
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => setCoursExempleFile(null)}
                            leftIcon={<Icon as={FiX} />}
                          >
                            Supprimer
                          </Button>
                        </Box>
                      )}
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

export default function RecueilInformationsEcolePage() {
  return (
    <Suspense fallback={
      <Box textAlign="center" py={20}>
        <Spinner size="xl" color="accent.500" />
        <Text mt={4} color="brand.600">Chargement...</Text>
      </Box>
    }>
      <RecueilEcoleFormContent />
    </Suspense>
  );
}
