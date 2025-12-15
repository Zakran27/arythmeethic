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
  Grid,
  GridItem,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientType?: 'student' | 'parent' | 'school';
}

export function ContactModal({ isOpen, onClose, defaultClientType }: ContactModalProps) {
  const [formData, setFormData] = useState({
    clientType: defaultClientType || '',
    firstName: '',
    lastName: '',
    organisationName: '',
    email: '',
    phone: '',
    studentLevel: '',
    requestType: '',
    requestSubject: '',
    howDidYouHear: '',
    referrerName: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  // Reset form when defaultClientType changes
  useEffect(() => {
    if (defaultClientType) {
      setFormData(prev => ({ ...prev, clientType: defaultClientType }));
    }
  }, [defaultClientType]);

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
        firstName: '',
        lastName: '',
        organisationName: '',
        email: '',
        phone: '',
        studentLevel: '',
        requestType: '',
        requestSubject: '',
        howDidYouHear: '',
        referrerName: '',
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

  const renderFormFields = () => {
    switch (formData.clientType) {
      case 'parent':
        return (
          <>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Prénom</FormLabel>
                  <Input
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Votre nom"
                  />
                </FormControl>
              </GridItem>
            </Grid>

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
              <FormLabel>Niveau de l'élève</FormLabel>
              <Input
                value={formData.studentLevel}
                onChange={e => setFormData({ ...formData, studentLevel: e.target.value })}
                placeholder="Ex: 3ème, Terminale S, BTS..."
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Demande</FormLabel>
              <Select
                placeholder="Sélectionnez votre demande"
                value={formData.requestType}
                onChange={e => setFormData({ ...formData, requestType: e.target.value })}
              >
                <option value="accompagnement_annee">Accompagnement sur l'année</option>
                <option value="accompagnement_ponctuel">Accompagnement ponctuel</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Message</FormLabel>
              <Textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                placeholder="Décrivez votre besoin..."
                rows={4}
              />
            </FormControl>
          </>
        );

      case 'student':
        return (
          <>
            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Prénom</FormLabel>
                  <Input
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Nom</FormLabel>
                  <Input
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Votre nom"
                  />
                </FormControl>
              </GridItem>
            </Grid>

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
          </>
        );

      case 'school':
        return (
          <>
            <FormControl isRequired>
              <FormLabel>Nom de l'établissement</FormLabel>
              <Input
                value={formData.organisationName}
                onChange={e => setFormData({ ...formData, organisationName: e.target.value })}
                placeholder="Nom de votre établissement"
              />
            </FormControl>

            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Prénom du contact</FormLabel>
                  <Input
                    value={formData.firstName}
                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Votre prénom"
                  />
                </FormControl>
              </GridItem>
              <GridItem>
                <FormControl isRequired>
                  <FormLabel>Nom du contact</FormLabel>
                  <Input
                    value={formData.lastName}
                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Votre nom"
                  />
                </FormControl>
              </GridItem>
            </Grid>

            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@etablissement.fr"
              />
            </FormControl>

            <FormControl>
              <FormLabel>Téléphone</FormLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="02 40 12 34 56"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Objet de la demande</FormLabel>
              <Select
                placeholder="Sélectionnez l'objet"
                value={formData.requestSubject}
                onChange={e => setFormData({ ...formData, requestSubject: e.target.value })}
              >
                <option value="information">Demande d'informations</option>
                <option value="vacation_technique">Vacation dans une matière technique</option>
                <option value="atelier_cps">Atelier de compétences psycho-sociales</option>
              </Select>
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Comment m'avez-vous connue ?</FormLabel>
              <Select
                placeholder="Sélectionnez une option"
                value={formData.howDidYouHear}
                onChange={e => setFormData({ ...formData, howDidYouHear: e.target.value, referrerName: '' })}
              >
                <option value="linkedin">LinkedIn</option>
                <option value="recommandation">Recommandation</option>
              </Select>
            </FormControl>

            {formData.howDidYouHear === 'recommandation' && (
              <FormControl isRequired>
                <FormLabel>Nom de la personne</FormLabel>
                <Input
                  value={formData.referrerName}
                  onChange={e => setFormData({ ...formData, referrerName: e.target.value })}
                  placeholder="Nom de la personne qui vous a recommandé"
                />
              </FormControl>
            )}

            <FormControl isRequired>
              <FormLabel>Message</FormLabel>
              <Textarea
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                placeholder="Décrivez votre besoin..."
                rows={4}
              />
            </FormControl>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>Prendre contact avec A Rythme Ethic</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6} overflowY="auto">
          <form onSubmit={handleSubmit}>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Vous êtes</FormLabel>
                <Select
                  placeholder="Sélectionnez votre profil"
                  value={formData.clientType}
                  onChange={e => setFormData({
                    ...formData,
                    clientType: e.target.value,
                    firstName: '',
                    lastName: '',
                    organisationName: '',
                    email: '',
                    phone: '',
                    studentLevel: '',
                    requestType: '',
                    requestSubject: '',
                    howDidYouHear: '',
                    referrerName: '',
                    message: '',
                  })}
                >
                  <option value="parent">Parent</option>
                  <option value="student">Jeune / Élève</option>
                  <option value="school">Établissement</option>
                </Select>
              </FormControl>

              {renderFormFields()}

              {formData.clientType && (
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
              )}
            </Stack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
