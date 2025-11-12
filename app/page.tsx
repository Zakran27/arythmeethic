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
  SimpleGrid,
  Icon,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { Nav } from '@/components/Nav';
import { FiHome, FiBook, FiAward } from 'react-icons/fi';
import { useState } from 'react';

export default function HomePage() {
  const [formData, setFormData] = useState({
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

    // TODO: Implement actual form submission
    setTimeout(() => {
      toast({
        title: 'Message envoyé !',
        description: 'Nous vous répondrons dans les plus brefs délais.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      setFormData({ name: '', email: '', phone: '', message: '' });
      setLoading(false);
    }, 1000);
  };

  return (
    <>
      <Nav />
      <Box>
        {/* Hero */}
        <Box bg="brand.600" color="white" py={{ base: 16, md: 24 }}>
          <Container maxW="container.xl">
            <Stack spacing={6} maxW="3xl" mx="auto" textAlign="center">
              <Heading size={{ base: 'xl', md: '2xl' }}>
                Cours et formations à domicile ou en école
              </Heading>
              <Text fontSize={{ base: 'lg', md: 'xl' }}>
                Accompagnement personnalisé pour particuliers et établissements scolaires. Expertise
                pédagogique et suivi adapté à chaque besoin.
              </Text>
              <Box pt={4}>
                <Button
                  as="a"
                  href="#contact"
                  size="lg"
                  colorScheme="whiteAlpha"
                  variant="solid"
                  px={{ base: 6, md: 8 }}
                >
                  Nous contacter
                </Button>
              </Box>
            </Stack>
          </Container>
        </Box>

        {/* Services */}
        <Container maxW="container.xl" py={{ base: 12, md: 20 }}>
          <Stack spacing={12}>
            <Box textAlign="center">
              <Heading size={{ base: 'lg', md: 'xl' }} mb={4}>
                Nos services
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600">
                Un accompagnement sur mesure adapté à vos besoins
              </Text>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
              <Card>
                <CardBody>
                  <Stack spacing={4} align="center" textAlign="center">
                    <Icon as={FiHome} boxSize={{ base: 10, md: 12 }} color="brand.500" />
                    <Heading size="md">Cours à domicile</Heading>
                    <Text color="gray.600">
                      Enseignement personnalisé dans le confort de votre domicile. Horaires
                      flexibles et approche pédagogique individualisée.
                    </Text>
                  </Stack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Stack spacing={4} align="center" textAlign="center">
                    <Icon as={FiBook} boxSize={{ base: 10, md: 12 }} color="brand.500" />
                    <Heading size="md">Formations en école</Heading>
                    <Text color="gray.600">
                      Interventions dans les établissements scolaires. Programmes adaptés aux
                      besoins des élèves et des institutions.
                    </Text>
                  </Stack>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Stack spacing={4} align="center" textAlign="center">
                    <Icon as={FiAward} boxSize={{ base: 10, md: 12 }} color="brand.500" />
                    <Heading size="md">Expertise pédagogique</Heading>
                    <Text color="gray.600">
                      Méthodes d'enseignement éprouvées et suivi régulier. Accompagnement vers la
                      réussite et l'autonomie.
                    </Text>
                  </Stack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </Stack>
        </Container>

        {/* Contact Form */}
        <Box bg="gray.50" py={{ base: 12, md: 20 }} id="contact">
          <Container maxW="container.md">
            <Stack spacing={8}>
              <Box textAlign="center">
                <Heading size={{ base: 'lg', md: 'xl' }} mb={4}>
                  Nous contacter
                </Heading>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.600">
                  Une question ? Un projet ? N'hésitez pas à nous écrire
                </Text>
              </Box>

              <Card>
                <CardBody>
                  <form onSubmit={handleSubmit}>
                    <Stack spacing={4}>
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

                      <Button
                        type="submit"
                        colorScheme="brand"
                        size="lg"
                        width="full"
                        isLoading={loading}
                      >
                        Envoyer le message
                      </Button>
                    </Stack>
                  </form>
                </CardBody>
              </Card>
            </Stack>
          </Container>
        </Box>

        {/* Footer */}
        <Box bg="gray.800" color="white" py={{ base: 8, md: 12 }}>
          <Container maxW="container.xl">
            <Stack spacing={4} textAlign="center">
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold">
                Tutorflow
              </Text>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="gray.400">
                Cours et formations à domicile ou en école
              </Text>
              <Text fontSize="sm" color="gray.500">
                © {new Date().getFullYear()} Tous droits réservés
              </Text>
            </Stack>
          </Container>
        </Box>
      </Box>
    </>
  );
}
