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
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Client, ClientType } from '@/types';

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
    phone: client.phone || '',
    type_client: client.type_client as ClientType,
    organisation: client.organisation || '',
    address_line1: client.address_line1 || '',
    postal_code: client.postal_code || '',
    city: client.city || '',
    country: client.country || '',
    notes: client.notes || '',
  });

  useEffect(() => {
    setFormData({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone || '',
      type_client: client.type_client as ClientType,
      organisation: client.organisation || '',
      address_line1: client.address_line1 || '',
      postal_code: client.postal_code || '',
      city: client.city || '',
      country: client.country || '',
      notes: client.notes || '',
    });
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          ...formData,
          phone: formData.phone || null,
          organisation: formData.organisation || null,
          address_line1: formData.address_line1 || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          country: formData.country || null,
          notes: formData.notes || null,
        })
        .eq('id', client.id);

      if (error) throw error;

      toast({
        title: 'Client modifié',
        status: 'success',
        duration: 3000,
      });

      onSuccess();
    } catch (error) {
      toast({
        title: 'Erreur lors de la modification du client',
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
          <ModalHeader>Modifier le client</ModalHeader>
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
              Enregistrer
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
