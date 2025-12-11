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
          // Parent 2 fields (only for Jeune type)
          first_name_parent2: formData.sub_type === 'Jeune' ? (formData.first_name_parent2 || null) : null,
          last_name_parent2: formData.sub_type === 'Jeune' ? (formData.last_name_parent2 || null) : null,
          email_parent2: formData.sub_type === 'Jeune' ? (formData.email_parent2 || null) : null,
          phone_parent2: formData.sub_type === 'Jeune' ? (formData.phone_parent2 || null) : null,
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
  const isJeune = formData.sub_type === 'Jeune';
  const isParent = formData.sub_type === 'Parent';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader color="brand.500" fontFamily="heading">Modifier le contact</ModalHeader>
          <ModalCloseButton color="brand.500" />
          <ModalBody>
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

              {/* ========== JEUNE / ÉLÈVE FIELDS ========== */}
              {isJeune && (
                <>
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Jeune / Élève</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.first_name_jeune}
                          onChange={e => handleChange('first_name_jeune', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl isRequired>
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
                </>
              )}

              {/* ========== PARENT FIELDS ========== */}
              {isParent && (
                <>
                  <Divider />
                  <Text fontWeight="bold" color="brand.500">Parent</Text>
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    <GridItem>
                      <FormControl isRequired>
                        <FormLabel>Prénom</FormLabel>
                        <Input
                          value={formData.first_name_parent1}
                          onChange={e => handleChange('first_name_parent1', e.target.value)}
                        />
                      </FormControl>
                    </GridItem>
                    <GridItem>
                      <FormControl isRequired>
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
                      <FormControl isRequired>
                        <FormLabel>Email</FormLabel>
                        <Input
                          type="email"
                          value={formData.email_parent1}
                          onChange={e => handleChange('email_parent1', e.target.value)}
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
