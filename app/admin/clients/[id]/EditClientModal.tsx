'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Stack,
  Grid,
  GridItem,
  useToast,
  Divider,
  Text,
  Checkbox,
  SimpleGrid,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Client, ClientType, ClientSubType, ClientStatus } from '@/types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client: Client;
}

export function EditClientModal({ isOpen, onClose, onSuccess, client }: EditClientModalProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    first_name: client.first_name,
    last_name: client.last_name,
    email: client.email,
    phone1: client.phone1 || '',
    type_client: client.type_client as ClientType,
    sub_type: (client.sub_type || '') as ClientSubType | '',
    client_status: client.client_status as ClientStatus,
    organisation: client.organisation || '',
    address_line1: client.address_line1 || '',
    postal_code: client.postal_code || '',
    city: client.city || '',
    country: client.country || '',
    notes: client.notes || '',
    // Jeune fields
    first_name_jeune: client.first_name_jeune || '',
    last_name_jeune: client.last_name_jeune || '',
    email_jeune: client.email_jeune || '',
    phone_jeune: client.phone_jeune || '',
    niveau_eleve: client.niveau_eleve || '',
    demande_type: client.demande_type || '',
    // Parent 1 fields
    first_name_parent1: client.first_name_parent1 || '',
    last_name_parent1: client.last_name_parent1 || '',
    email_parent1: client.email_parent1 || '',
    phone_parent1: client.phone_parent1 || '',
    // Parent 2 fields
    first_name_parent2: client.first_name_parent2 || '',
    last_name_parent2: client.last_name_parent2 || '',
    email_parent2: client.email_parent2 || '',
    phone_parent2: client.phone_parent2 || '',
    // Recueil des informations fields
    numero_cesu: client.numero_cesu || '',
    etablissement_scolaire: client.etablissement_scolaire || '',
    moyenne_maths: client.moyenne_maths || '',
    moyenne_generale: client.moyenne_generale || '',
    adresse_cours: client.adresse_cours || '',
    jours_disponibles: client.jours_disponibles || [] as string[],
    // École-specific fields
    ecole_siret: client.ecole_siret || '',
    ecole_nda: client.ecole_nda || '',
    ecole_resp_modules_nom: client.ecole_resp_modules_nom || '',
    ecole_resp_modules_prenom: client.ecole_resp_modules_prenom || '',
    ecole_resp_modules_email: client.ecole_resp_modules_email || '',
    ecole_resp_modules_phone: client.ecole_resp_modules_phone || '',
    ecole_resp_modules_peut_negocier: client.ecole_resp_modules_peut_negocier || false,
    ecole_resp_autorisation_nom: client.ecole_resp_autorisation_nom || '',
    ecole_resp_autorisation_prenom: client.ecole_resp_autorisation_prenom || '',
    ecole_resp_autorisation_email: client.ecole_resp_autorisation_email || '',
    ecole_resp_autorisation_phone: client.ecole_resp_autorisation_phone || '',
    ecole_resp_facturation_nom: client.ecole_resp_facturation_nom || '',
    ecole_resp_facturation_prenom: client.ecole_resp_facturation_prenom || '',
    ecole_resp_facturation_email: client.ecole_resp_facturation_email || '',
    ecole_resp_facturation_phone: client.ecole_resp_facturation_phone || '',
    ecole_resp_planning_nom: client.ecole_resp_planning_nom || '',
    ecole_resp_planning_prenom: client.ecole_resp_planning_prenom || '',
    ecole_resp_planning_email: client.ecole_resp_planning_email || '',
    ecole_resp_planning_phone: client.ecole_resp_planning_phone || '',
    ecole_module_nom: client.ecole_module_nom || '',
    ecole_module_heures: client.ecole_module_heures?.toString() || '',
    ecole_formation_type: client.ecole_formation_type || '',
    ecole_classes_noms: client.ecole_classes_noms || '',
    ecole_groupe_taille: client.ecole_groupe_taille?.toString() || '',
    ecole_evaluation_modalites: client.ecole_evaluation_modalites || '',
    ecole_evaluation_nombre_min: client.ecole_evaluation_nombre_min?.toString() || '',
    ecole_module_periode: client.ecole_module_periode || '',
    // Enseignant
    ecole_enseignant_nom: client.ecole_enseignant_nom || '',
    ecole_enseignant_prenom: client.ecole_enseignant_prenom || '',
    ecole_enseignant_email: client.ecole_enseignant_email || '',
  });

  useEffect(() => {
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone1: client.phone1 || '',
      type_client: client.type_client as ClientType,
      sub_type: (client.sub_type || '') as ClientSubType | '',
      client_status: client.client_status as ClientStatus,
      organisation: client.organisation || '',
      address_line1: client.address_line1 || '',
      postal_code: client.postal_code || '',
      city: client.city || '',
      country: client.country || '',
      notes: client.notes || '',
      first_name_jeune: client.first_name_jeune || '',
      last_name_jeune: client.last_name_jeune || '',
      email_jeune: client.email_jeune || '',
      phone_jeune: client.phone_jeune || '',
      niveau_eleve: client.niveau_eleve || '',
      demande_type: client.demande_type || '',
      first_name_parent1: client.first_name_parent1 || '',
      last_name_parent1: client.last_name_parent1 || '',
      email_parent1: client.email_parent1 || '',
      phone_parent1: client.phone_parent1 || '',
      first_name_parent2: client.first_name_parent2 || '',
      last_name_parent2: client.last_name_parent2 || '',
      email_parent2: client.email_parent2 || '',
      phone_parent2: client.phone_parent2 || '',
      // Recueil des informations fields
      numero_cesu: client.numero_cesu || '',
      etablissement_scolaire: client.etablissement_scolaire || '',
      moyenne_maths: client.moyenne_maths || '',
      moyenne_generale: client.moyenne_generale || '',
      adresse_cours: client.adresse_cours || '',
      jours_disponibles: client.jours_disponibles || [],
      // École-specific fields
      ecole_siret: client.ecole_siret || '',
      ecole_nda: client.ecole_nda || '',
      ecole_resp_modules_nom: client.ecole_resp_modules_nom || '',
      ecole_resp_modules_prenom: client.ecole_resp_modules_prenom || '',
      ecole_resp_modules_email: client.ecole_resp_modules_email || '',
      ecole_resp_modules_phone: client.ecole_resp_modules_phone || '',
      ecole_resp_modules_peut_negocier: client.ecole_resp_modules_peut_negocier || false,
      ecole_resp_autorisation_nom: client.ecole_resp_autorisation_nom || '',
      ecole_resp_autorisation_prenom: client.ecole_resp_autorisation_prenom || '',
      ecole_resp_autorisation_email: client.ecole_resp_autorisation_email || '',
      ecole_resp_autorisation_phone: client.ecole_resp_autorisation_phone || '',
      ecole_resp_facturation_nom: client.ecole_resp_facturation_nom || '',
      ecole_resp_facturation_prenom: client.ecole_resp_facturation_prenom || '',
      ecole_resp_facturation_email: client.ecole_resp_facturation_email || '',
      ecole_resp_facturation_phone: client.ecole_resp_facturation_phone || '',
      ecole_resp_planning_nom: client.ecole_resp_planning_nom || '',
      ecole_resp_planning_prenom: client.ecole_resp_planning_prenom || '',
      ecole_resp_planning_email: client.ecole_resp_planning_email || '',
      ecole_resp_planning_phone: client.ecole_resp_planning_phone || '',
      ecole_module_nom: client.ecole_module_nom || '',
      ecole_module_heures: client.ecole_module_heures?.toString() || '',
      ecole_formation_type: client.ecole_formation_type || '',
      ecole_classes_noms: client.ecole_classes_noms || '',
      ecole_groupe_taille: client.ecole_groupe_taille?.toString() || '',
      ecole_evaluation_modalites: client.ecole_evaluation_modalites || '',
      ecole_evaluation_nombre_min: client.ecole_evaluation_nombre_min?.toString() || '',
      ecole_module_periode: client.ecole_module_periode || '',
      // Enseignant
      ecole_enseignant_nom: client.ecole_enseignant_nom || '',
      ecole_enseignant_prenom: client.ecole_enseignant_prenom || '',
      ecole_enseignant_email: client.ecole_enseignant_email || '',
    });
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Determine main email and name based on type
      let mainEmail = formData.email;
      let mainFirstName = formData.first_name;
      let mainLastName = formData.last_name;

      if (formData.type_client === 'Particulier') {
        if (formData.sub_type === 'Jeune') {
          mainEmail = formData.email_jeune || formData.email_parent1 || '';
          mainFirstName = formData.first_name_jeune || formData.first_name;
          mainLastName = formData.last_name_jeune || formData.last_name;
        } else if (formData.sub_type === 'Parent') {
          mainEmail = formData.email_parent1 || '';
          mainFirstName = formData.first_name_parent1 || formData.first_name;
          mainLastName = formData.last_name_parent1 || formData.last_name;
        }
      }

      const { error } = await supabase
        .from('clients')
        .update({
          first_name: mainFirstName,
          last_name: mainLastName,
          email: mainEmail,
          phone1: formData.phone1 || null,
          type_client: formData.type_client,
          sub_type: formData.sub_type || null,
          client_status: formData.client_status,
          organisation: formData.organisation || null,
          address_line1: formData.address_line1 || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          country: formData.country || null,
          notes: formData.notes || null,
          // Jeune fields
          first_name_jeune: formData.first_name_jeune || null,
          last_name_jeune: formData.last_name_jeune || null,
          email_jeune: formData.email_jeune || null,
          phone_jeune: formData.phone_jeune || null,
          niveau_eleve: formData.niveau_eleve || null,
          demande_type: formData.demande_type || null,
          // Parent 1 fields
          first_name_parent1: formData.first_name_parent1 || null,
          last_name_parent1: formData.last_name_parent1 || null,
          email_parent1: formData.email_parent1 || null,
          phone_parent1: formData.phone_parent1 || null,
          // Parent 2 fields
          first_name_parent2: formData.first_name_parent2 || null,
          last_name_parent2: formData.last_name_parent2 || null,
          email_parent2: formData.email_parent2 || null,
          phone_parent2: formData.phone_parent2 || null,
          // Recueil des informations fields
          numero_cesu: formData.numero_cesu || null,
          etablissement_scolaire: formData.etablissement_scolaire || null,
          moyenne_maths: formData.moyenne_maths || null,
          moyenne_generale: formData.moyenne_generale || null,
          adresse_cours: formData.adresse_cours || null,
          jours_disponibles: formData.jours_disponibles.length > 0 ? formData.jours_disponibles : null,
          // École-specific fields
          ecole_siret: formData.ecole_siret || null,
          ecole_nda: formData.ecole_nda || null,
          ecole_resp_modules_nom: formData.ecole_resp_modules_nom || null,
          ecole_resp_modules_prenom: formData.ecole_resp_modules_prenom || null,
          ecole_resp_modules_email: formData.ecole_resp_modules_email || null,
          ecole_resp_modules_phone: formData.ecole_resp_modules_phone || null,
          ecole_resp_modules_peut_negocier: formData.ecole_resp_modules_peut_negocier || null,
          ecole_resp_autorisation_nom: formData.ecole_resp_autorisation_nom || null,
          ecole_resp_autorisation_prenom: formData.ecole_resp_autorisation_prenom || null,
          ecole_resp_autorisation_email: formData.ecole_resp_autorisation_email || null,
          ecole_resp_autorisation_phone: formData.ecole_resp_autorisation_phone || null,
          ecole_resp_facturation_nom: formData.ecole_resp_facturation_nom || null,
          ecole_resp_facturation_prenom: formData.ecole_resp_facturation_prenom || null,
          ecole_resp_facturation_email: formData.ecole_resp_facturation_email || null,
          ecole_resp_facturation_phone: formData.ecole_resp_facturation_phone || null,
          ecole_resp_planning_nom: formData.ecole_resp_planning_nom || null,
          ecole_resp_planning_prenom: formData.ecole_resp_planning_prenom || null,
          ecole_resp_planning_email: formData.ecole_resp_planning_email || null,
          ecole_resp_planning_phone: formData.ecole_resp_planning_phone || null,
          ecole_module_nom: formData.ecole_module_nom || null,
          ecole_module_heures: formData.ecole_module_heures ? parseInt(formData.ecole_module_heures, 10) : null,
          ecole_formation_type: formData.ecole_formation_type || null,
          ecole_classes_noms: formData.ecole_classes_noms || null,
          ecole_groupe_taille: formData.ecole_groupe_taille ? parseInt(formData.ecole_groupe_taille, 10) : null,
          ecole_evaluation_modalites: formData.ecole_evaluation_modalites || null,
          ecole_evaluation_nombre_min: formData.ecole_evaluation_nombre_min ? parseInt(formData.ecole_evaluation_nombre_min, 10) : null,
          ecole_module_periode: formData.ecole_module_periode || null,
          // Enseignant
          ecole_enseignant_nom: formData.ecole_enseignant_nom || null,
          ecole_enseignant_prenom: formData.ecole_enseignant_prenom || null,
          ecole_enseignant_email: formData.ecole_enseignant_email || null,
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Contact modifié',
        status: 'success',
        duration: 3000,
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur lors de la modification du contact',
        description: error instanceof Error ? error.message : 'Erreur inconnue',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isParticulier = formData.type_client === 'Particulier';
  const isEcole = formData.type_client === 'École';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">Modifier le contact</ModalHeader>
        <ModalCloseButton color="brand.500" />
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <ModalBody overflowY="auto">
            <Stack spacing={4}>
              {/* Type Selection */}
              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Statut</FormLabel>
                    <Select
                      value={formData.client_status}
                      onChange={e => handleChange('client_status', e.target.value)}
                    >
                      <option value="Prospect">Prospect</option>
                      <option value="Client">Client</option>
                    </Select>
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={formData.type_client}
                      onChange={e => {
                        handleChange('type_client', e.target.value);
                        handleChange('sub_type', '');
                      }}
                    >
                      <option value="Particulier">Particulier</option>
                      <option value="École">Établissement</option>
                    </Select>
                  </FormControl>
                </GridItem>
                {isParticulier && (
                  <GridItem>
                    <FormControl isRequired>
                      <FormLabel>Sous-type</FormLabel>
                      <Select
                        value={formData.sub_type || ''}
                        onChange={e => handleChange('sub_type', e.target.value)}
                        placeholder="Sélectionnez..."
                      >
                        <option value="Jeune">Jeune / Élève</option>
                        <option value="Parent">Parent</option>
                      </Select>
                    </FormControl>
                  </GridItem>
                )}
              </Grid>

              {/* ========== PARTICULIER FIELDS ========== */}
              {isParticulier && (
                <>
                  {/* Jeune / Élève */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Jeune / Élève</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.first_name_jeune}
                          onChange={e => handleChange('first_name_jeune', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.last_name_jeune}
                          onChange={e => handleChange('last_name_jeune', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.phone_jeune}
                          onChange={e => handleChange('phone_jeune', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email_jeune}
                          onChange={e => handleChange('email_jeune', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Niveau de l'élève</FormLabel>
                        <Select
                          value={formData.niveau_eleve}
                          onChange={e => handleChange('niveau_eleve', e.target.value)}
                          placeholder="Sélectionnez..."
                        >
                          <option value="CP">CP</option>
                          <option value="CE1">CE1</option>
                          <option value="CE2">CE2</option>
                          <option value="CM1">CM1</option>
                          <option value="CM2">CM2</option>
                          <option value="6ème">6ème</option>
                          <option value="5ème">5ème</option>
                          <option value="4ème">4ème</option>
                          <option value="3ème">3ème</option>
                          <option value="2nde">2nde</option>
                          <option value="1ère">1ère</option>
                          <option value="Terminale">Terminale</option>
                          <option value="Supérieur">Supérieur</option>
                        </Select>
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Type de demande</FormLabel>
                        <Select
                          value={formData.demande_type}
                          onChange={e => handleChange('demande_type', e.target.value)}
                          placeholder="Sélectionnez..."
                        >
                          <option value="Bilan">Bilan</option>
                          <option value="Accompagnement">Accompagnement</option>
                          <option value="Atelier">Atelier</option>
                          <option value="Information">Information</option>
                        </Select>
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Parent 1 */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Parent 1</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.first_name_parent1}
                          onChange={e => handleChange('first_name_parent1', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.last_name_parent1}
                          onChange={e => handleChange('last_name_parent1', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.phone_parent1}
                          onChange={e => handleChange('phone_parent1', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email_parent1}
                          onChange={e => handleChange('email_parent1', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Parent 2 */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Parent 2</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.first_name_parent2}
                          onChange={e => handleChange('first_name_parent2', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.last_name_parent2}
                          onChange={e => handleChange('last_name_parent2', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.phone_parent2}
                          onChange={e => handleChange('phone_parent2', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email_parent2}
                          onChange={e => handleChange('email_parent2', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Informations scolaires */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Informations scolaires</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Établissement scolaire</FormLabel>
                        <Input
                          value={formData.etablissement_scolaire}
                          onChange={e => handleChange('etablissement_scolaire', e.target.value)}
                          placeholder="Nom du collège/lycée"
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Moyenne en maths</FormLabel>
                        <Input
                          value={formData.moyenne_maths}
                          onChange={e => handleChange('moyenne_maths', e.target.value)}
                          placeholder="Ex: 12/20"
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Moyenne générale</FormLabel>
                        <Input
                          value={formData.moyenne_generale}
                          onChange={e => handleChange('moyenne_generale', e.target.value)}
                          placeholder="Ex: 14/20"
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Numéro CESU</FormLabel>
                        <Input
                          value={formData.numero_cesu}
                          onChange={e => handleChange('numero_cesu', e.target.value)}
                          placeholder="Numéro CESU si applicable"
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Lieu et disponibilités */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Lieu et disponibilités</Text>
                  <FormControl>
                    <FormLabel>Adresse des cours</FormLabel>
                    <Input
                      value={formData.adresse_cours}
                      onChange={e => handleChange('adresse_cours', e.target.value)}
                      placeholder="Adresse où se dérouleront les cours"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Jours disponibles</FormLabel>
                    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
                      {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(jour => (
                        <Checkbox
                          key={jour}
                          isChecked={formData.jours_disponibles.includes(jour)}
                          onChange={e => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                jours_disponibles: [...prev.jours_disponibles, jour],
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                jours_disponibles: prev.jours_disponibles.filter(j => j !== jour),
                              }));
                            }
                          }}
                          colorScheme="accent"
                        >
                          {jour}
                        </Checkbox>
                      ))}
                    </SimpleGrid>
                  </FormControl>
                </>
              )}

              {/* ========== ÉTABLISSEMENT FIELDS ========== */}
              {isEcole && (
                <>
                  <Divider />
                  <FormControl isRequired>
                    <FormLabel>Nom de l'établissement</FormLabel>
                    <Input
                      value={formData.organisation}
                      onChange={e => handleChange('organisation', e.target.value)}
                    />
                  </FormControl>

                  <Text fontWeight="bold" color="brand.500" mt={2}>Contact de l'établissement</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.first_name}
                          onChange={e => handleChange('first_name', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.last_name}
                          onChange={e => handleChange('last_name', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.phone1}
                          onChange={e => handleChange('phone1', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={e => handleChange('email', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Responsable modules */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Responsable modules</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.ecole_resp_modules_prenom}
                          onChange={e => handleChange('ecole_resp_modules_prenom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.ecole_resp_modules_nom}
                          onChange={e => handleChange('ecole_resp_modules_nom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.ecole_resp_modules_phone}
                          onChange={e => handleChange('ecole_resp_modules_phone', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.ecole_resp_modules_email}
                          onChange={e => handleChange('ecole_resp_modules_email', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>
                  <Checkbox
                    isChecked={formData.ecole_resp_modules_peut_negocier}
                    onChange={e => setFormData(prev => ({ ...prev, ecole_resp_modules_peut_negocier: e.target.checked }))}
                    colorScheme="accent"
                  >
                    Habilité(e) à négocier les prix
                  </Checkbox>

                  {/* Responsable autorisation prix */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Responsable autorisation prix</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.ecole_resp_autorisation_prenom}
                          onChange={e => handleChange('ecole_resp_autorisation_prenom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.ecole_resp_autorisation_nom}
                          onChange={e => handleChange('ecole_resp_autorisation_nom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.ecole_resp_autorisation_phone}
                          onChange={e => handleChange('ecole_resp_autorisation_phone', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.ecole_resp_autorisation_email}
                          onChange={e => handleChange('ecole_resp_autorisation_email', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Responsable facturation */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Responsable facturation</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.ecole_resp_facturation_prenom}
                          onChange={e => handleChange('ecole_resp_facturation_prenom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.ecole_resp_facturation_nom}
                          onChange={e => handleChange('ecole_resp_facturation_nom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.ecole_resp_facturation_phone}
                          onChange={e => handleChange('ecole_resp_facturation_phone', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.ecole_resp_facturation_email}
                          onChange={e => handleChange('ecole_resp_facturation_email', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Responsable planning */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Responsable planning</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.ecole_resp_planning_prenom}
                          onChange={e => handleChange('ecole_resp_planning_prenom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.ecole_resp_planning_nom}
                          onChange={e => handleChange('ecole_resp_planning_nom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Téléphone</FormLabel>
                        <Input
                          value={formData.ecole_resp_planning_phone}
                          onChange={e => handleChange('ecole_resp_planning_phone', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.ecole_resp_planning_email}
                          onChange={e => handleChange('ecole_resp_planning_email', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Informations structure */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Informations structure</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>N° SIRET</FormLabel>
                        <Input
                          value={formData.ecole_siret}
                          onChange={e => handleChange('ecole_siret', e.target.value)}
                          placeholder="14 chiffres"
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>N° NDA</FormLabel>
                        <Input
                          value={formData.ecole_nda}
                          onChange={e => handleChange('ecole_nda', e.target.value)}
                          placeholder="Numéro de déclaration d'activité"
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Informations module */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Informations module</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom du module</FormLabel>
                        <Input
                          value={formData.ecole_module_nom}
                          onChange={e => handleChange('ecole_module_nom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nombre d'heures</FormLabel>
                        <Input
                          type="number"
                          value={formData.ecole_module_heures}
                          onChange={e => handleChange('ecole_module_heures', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Type de formation</FormLabel>
                        <Select
                          value={formData.ecole_formation_type}
                          onChange={e => handleChange('ecole_formation_type', e.target.value)}
                          placeholder="Sélectionnez..."
                        >
                          <option value="initiale_en_alternance">Formation initiale / en alternance</option>
                          <option value="continue">Formation continue</option>
                        </Select>
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom de la/des classe(s)</FormLabel>
                        <Input
                          value={formData.ecole_classes_noms}
                          onChange={e => handleChange('ecole_classes_noms', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Taille du groupe</FormLabel>
                        <Input
                          type="number"
                          value={formData.ecole_groupe_taille}
                          onChange={e => handleChange('ecole_groupe_taille', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nb évaluations min.</FormLabel>
                        <Input
                          type="number"
                          value={formData.ecole_evaluation_nombre_min}
                          onChange={e => handleChange('ecole_evaluation_nombre_min', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Période du module</FormLabel>
                        <Input
                          value={formData.ecole_module_periode}
                          onChange={e => handleChange('ecole_module_periode', e.target.value)}
                          placeholder="Ex: Septembre 2026 - Janvier 2027"
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Modalités d'évaluation</FormLabel>
                        <Textarea
                          value={formData.ecole_evaluation_modalites}
                          onChange={e => handleChange('ecole_evaluation_modalites', e.target.value)}
                          rows={2}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>

                  {/* Enseignant */}
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Enseignant du contenu de la matière</Text>
                  <Text fontSize="sm" color="gray.500">Facultatif</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.ecole_enseignant_prenom}
                          onChange={e => handleChange('ecole_enseignant_prenom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl>
                        <FormLabel>Nom</FormLabel>
                        <Input
                          value={formData.ecole_enseignant_nom}
                          onChange={e => handleChange('ecole_enseignant_nom', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem colSpan={2}>
                      <FormControl>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.ecole_enseignant_email}
                          onChange={e => handleChange('ecole_enseignant_email', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                  </Grid>
                </>
              )}

              {/* ========== COMMON FIELDS: Address & Notes ========== */}
              <Divider />
              <Text fontWeight="bold" color="brand.500">Adresse</Text>
              <FormControl>
                <FormLabel>Adresse</FormLabel>
                <Input
                  value={formData.address_line1}
                  onChange={e => handleChange('address_line1', e.target.value)}
                />
              </FormControl>

              <Grid templateColumns="repeat(3, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>Code postal</FormLabel>
                    <Input
                      value={formData.postal_code}
                      onChange={e => handleChange('postal_code', e.target.value)}
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl>
                    <FormLabel>Ville</FormLabel>
                    <Input
                      value={formData.city}
                      onChange={e => handleChange('city', e.target.value)}
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl>
                    <FormLabel>Pays</FormLabel>
                    <Input
                      value={formData.country}
                      onChange={e => handleChange('country', e.target.value)}
                    />
                  </FormControl>
                </GridItem>
              </Grid>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows={3}
                />
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} color="brand.500">
              Annuler
            </Button>
            <Button colorScheme="accent" type="submit" isLoading={loading}>
              Enregistrer
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
