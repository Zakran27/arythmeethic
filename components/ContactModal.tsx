'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  Checkbox,
  FormControl,
  FormErrorMessage,
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
import { isValidPhone } from '@/lib/validators';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientType?: 'student' | 'parent' | 'school';
}

const emptyFormData = {
  serviceType: '',
  clientType: '',
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
  demarcheVolontaire: false,
};

export function ContactModal({ isOpen, onClose, defaultClientType }: ContactModalProps) {
  const [formData, setFormData] = useState({
    ...emptyFormData,
    clientType: defaultClientType || '',
  });
  const [loading, setLoading] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const toast = useToast();

  const trimmedEmail = formData.email.trim();
  const emailValid = EMAIL_REGEX.test(trimmedEmail);
  const showEmailError = emailTouched && trimmedEmail.length > 0 && !emailValid;

  const trimmedPhone = formData.phone.trim();
  const phoneValid = isValidPhone(trimmedPhone);
  const showPhoneError = phoneTouched && trimmedPhone.length > 0 && !phoneValid;

  // Reset form when defaultClientType changes
  useEffect(() => {
    if (defaultClientType) {
      setFormData(prev => ({ ...prev, clientType: defaultClientType }));
    }
  }, [defaultClientType]);

  const handleServiceTypeChange = (value: string) => {
    setFormData({
      ...emptyFormData,
      serviceType: value,
      clientType: value === 'prestation_professionnels' ? 'school' : '',
    });
  };

  const handleClientTypeChange = (value: string) => {
    setFormData(prev => ({
      ...emptyFormData,
      serviceType: prev.serviceType,
      clientType: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailValid) {
      setEmailTouched(true);
      toast({
        title: 'Adresse email invalide',
        description: 'Vérifiez la forme : nom@domaine.fr',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (trimmedPhone.length > 0 && !phoneValid) {
      setPhoneTouched(true);
      toast({
        title: 'Numéro de téléphone invalide',
        description: 'Format attendu : 06 12 34 56 78 ou +33 6 12 34 56 78.',
        status: 'warning',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email: trimmedEmail }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Erreur lors de l'envoi");
      }

      toast({
        title: 'Message envoyé !',
        description: 'Nous vous répondrons dans les plus brefs délais.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setFormData({
        ...emptyFormData,
        clientType: defaultClientType || '',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Erreur',
        description:
          error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez réessayer.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const showButtons =
    (formData.serviceType === 'prestation_professionnels' && formData.clientType === 'school') ||
    (['cours_particulier', 'accompagnement_uniquement'].includes(formData.serviceType) &&
      !!formData.clientType);

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

            <FormControl isRequired isInvalid={showEmailError}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => setEmailTouched(true)}
                placeholder="votre@email.com"
              />
              {showEmailError && (
                <FormErrorMessage>
                  Adresse email invalide. Vérifiez la forme : nom@domaine.fr
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={showPhoneError}>
              <FormLabel>Téléphone</FormLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => setPhoneTouched(true)}
                placeholder="06 12 34 56 78"
              />
              <FormErrorMessage>
                Numéro invalide. Format : 06 12 34 56 78 ou +33 6 12 34 56 78.
              </FormErrorMessage>
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

            <Checkbox
              isChecked={formData.demarcheVolontaire}
              onChange={e => setFormData({ ...formData, demarcheVolontaire: e.target.checked })}
            >
              S'agit-il d'une démarche volontaire de votre jeune ?
            </Checkbox>

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

            <FormControl isRequired isInvalid={showEmailError}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => setEmailTouched(true)}
                placeholder="votre@email.com"
              />
              {showEmailError && (
                <FormErrorMessage>
                  Adresse email invalide. Vérifiez la forme : nom@domaine.fr
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={showPhoneError}>
              <FormLabel>Téléphone</FormLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => setPhoneTouched(true)}
                placeholder="06 12 34 56 78"
              />
              <FormErrorMessage>
                Numéro invalide. Format : 06 12 34 56 78 ou +33 6 12 34 56 78.
              </FormErrorMessage>
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

            <FormControl isRequired isInvalid={showEmailError}>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                onBlur={() => setEmailTouched(true)}
                placeholder="contact@etablissement.fr"
              />
              {showEmailError && (
                <FormErrorMessage>
                  Adresse email invalide. Vérifiez la forme : nom@domaine.fr
                </FormErrorMessage>
              )}
            </FormControl>

            <FormControl isInvalid={showPhoneError}>
              <FormLabel>Téléphone</FormLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                onBlur={() => setPhoneTouched(true)}
                placeholder="02 40 12 34 56"
              />
              <FormErrorMessage>
                Numéro invalide. Format : 06 12 34 56 78 ou +33 6 12 34 56 78.
              </FormErrorMessage>
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
                onChange={e =>
                  setFormData({ ...formData, howDidYouHear: e.target.value, referrerName: '' })
                }
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
              {/* Step 1 - Type d'accompagnement */}
              <FormControl isRequired>
                <FormLabel>Type d'accompagnement</FormLabel>
                <Select
                  placeholder="Sélectionnez un type d'accompagnement"
                  value={formData.serviceType}
                  onChange={e => handleServiceTypeChange(e.target.value)}
                >
                  <option value="cours_particulier">Cours particulier</option>
                  <option value="accompagnement_uniquement">Accompagnement uniquement</option>
                  <option value="prestation_professionnels">
                    Prestation pour les professionnels
                  </option>
                </Select>
              </FormControl>

              {/* Step 2 - "Vous êtes" uniquement pour cours/accompagnement */}
              {['cours_particulier', 'accompagnement_uniquement'].includes(
                formData.serviceType
              ) && (
                <FormControl isRequired>
                  <FormLabel>Vous êtes</FormLabel>
                  <Select
                    placeholder="Sélectionnez votre profil"
                    value={formData.clientType}
                    onChange={e => handleClientTypeChange(e.target.value)}
                  >
                    <option value="parent">Parent d'enfant mineur</option>
                    <option value="student">Jeune / Élève</option>
                  </Select>
                </FormControl>
              )}

              {/* Champs spécifiques au profil */}
              {renderFormFields()}

              {/* Boutons - visibles uniquement quand le formulaire est prêt */}
              {showButtons && (
                <Stack direction="row" spacing={3} pt={2}>
                  <Button onClick={onClose} variant="ghost" flex={1}>
                    Annuler
                  </Button>
                  <Button type="submit" colorScheme="brand" isLoading={loading} flex={1}>
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
