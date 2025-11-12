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
} from '@chakra-ui/react';
import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { ClientType } from '@/types';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewClientModal({ isOpen, onClose, onSuccess }: NewClientModalProps) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    type_client: 'Particulier' as ClientType,
    organisation: '',
    address_line1: '',
    postal_code: '',
    city: '',
    country: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('clients').insert([
        {
          ...formData,
          phone: formData.phone || null,
          organisation: formData.organisation || null,
          address_line1: formData.address_line1 || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          country: formData.country || null,
          notes: formData.notes || null,
        },
      ]);

      if (error) throw error;

      toast({
        title: 'Client créé',
        status: 'success',
        duration: 3000,
      });

      // Reset form
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        type_client: 'Particulier',
        organisation: '',
        address_line1: '',
        postal_code: '',
        city: '',
        country: '',
        notes: '',
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur lors de la création du client',
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader>Nouveau client</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
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
              </Grid>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => handleChange('email', e.target.value)}
                />
              </FormControl>

              <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                <GridItem>
                  <FormControl>
                    <FormLabel>Téléphone</FormLabel>
                    <Input
                      value={formData.phone}
                      onChange={e => handleChange('phone', e.target.value)}
                    />
                  </FormControl>
                </GridItem>
                <GridItem>
                  <FormControl isRequired>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={formData.type_client}
                      onChange={e => handleChange('type_client', e.target.value)}
                    >
                      <option value="Particulier">Particulier</option>
                      <option value="École">École</option>
                    </Select>
                  </FormControl>
                </GridItem>
              </Grid>

              {formData.type_client === 'École' && (
                <FormControl>
                  <FormLabel>Organisation</FormLabel>
                  <Input
                    value={formData.organisation}
                    onChange={e => handleChange('organisation', e.target.value)}
                  />
                </FormControl>
              )}

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
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="brand" type="submit" isLoading={loading}>
              Créer le client
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
