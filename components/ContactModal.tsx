'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Stack,
  Select,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientType?: 'student' | 'parent' | 'school';
}

export function ContactModal({ isOpen, onClose, defaultClientType }: ContactModalProps) {
  const [formData, setFormData] = useState({
    clientType: defaultClientType || '',
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Erreur lors de l\'envoi');

      toast({
        title: 'Message envoyé !',
        description: 'Nous vous répondrons dans les plus brefs délais.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setFormData({
        clientType: defaultClientType || '',
        name: '',
        email: '',
        phone: '',
        message: '',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue. Veuillez réessayer.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Prendre contact avec A Rythme Ethic</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Vous êtes</FormLabel>
                <Select
                  placeholder="Sélectionnez votre profil"
                  value={formData.clientType}
                  onChange={e => setFormData({ ...formData, clientType: e.target.value })}
                >
                  <option value="student">Jeune / Élève</option>
                  <option value="parent">Parent</option>
                  <option value="school">École / Centre de formation</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Nom complet</FormLabel>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Votre nom"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="votre@email.com"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Téléphone</FormLabel>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Message</FormLabel>
                <Textarea
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Décrivez votre besoin..."
                  rows={6}
                />
              </FormControl>

              <Stack direction="row" spacing={3} pt={2}>
                <Button onClick={onClose} variant="ghost" flex={1}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  colorScheme="brand"
                  isLoading={loading}
                  flex={1}
                >
                  Envoyer
                </Button>
              </Stack>
            </Stack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
