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
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Image,
} from '@chakra-ui/react';
import { Nav } from '@/components/Nav';
import { ContactModal } from '@/components/ContactModal';
import { FiHome, FiBook, FiAward, FiUsers } from 'react-icons/fi';
import { useState } from 'react';

export default function HomePage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [defaultClientType, setDefaultClientType] = useState<'student' | 'parent' | 'school'>('student');

  const handleContactClick = (type: 'student' | 'parent' | 'school') => {
    setDefaultClientType(type);
    onOpen();
  };

  return (
    <>
      <Nav />
      <ContactModal isOpen={isOpen} onClose={onClose} defaultClientType={defaultClientType} />
      <Box>
        {/* Hero */}
        <Box bg="sand.100" color="graphite.500" py={{ base: 16, md: 24 }}>
          <Container maxW="container.xl">
            <Stack spacing={6} maxW="3xl" mx="auto" textAlign="center">
              <Box mx="auto" mb={4}>
                <Image src="/logo.jpg" alt="A Rythme Ethic" maxH="120px" mx="auto" />
              </Box>
              <Heading size={{ base: 'xl', md: '2xl' }} color="graphite.500">
                A Rythme Ethic
              </Heading>
              <Text fontSize={{ base: 'lg', md: 'xl' }} color="graphite.600">
                Accompagnement personnalisé en mathématiques - Cours à domicile et interventions en établissement
              </Text>
            </Stack>
          </Container>
        </Box>

        {/* Services by Client Type */}
        <Container maxW="container.xl" py={{ base: 12, md: 20 }}>
          <Stack spacing={8}>
            <Box textAlign="center">
              <Heading size={{ base: 'lg', md: 'xl' }} mb={4} color="graphite.500">
                Nos accompagnements
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="graphite.600">
                Des solutions adaptées à chaque profil
              </Text>
            </Box>

            <Tabs variant="soft-rounded" colorScheme="brand" align="center">
              <TabList flexWrap="wrap" justifyContent="center" mb={8}>
                <Tab fontSize={{ base: 'md', md: 'lg' }} px={{ base: 4, md: 6 }}>Élève</Tab>
                <Tab fontSize={{ base: 'md', md: 'lg' }} px={{ base: 4, md: 6 }}>Parent</Tab>
                <Tab fontSize={{ base: 'md', md: 'lg' }} px={{ base: 4, md: 6 }}>École / Centre de formation</Tab>
              </TabList>

              <TabPanels>
                {/* Élève Tab */}
                <TabPanel>
                  <Card maxW="4xl" mx="auto">
                    <CardBody>
                      <Stack spacing={6}>
                        <Box textAlign="center">
                          <Icon as={FiBook} boxSize={12} color="teal.500" mb={4} />
                          <Heading size="lg" mb={4} color="graphite.500">Pour les élèves</Heading>
                        </Box>
                        <Text fontSize="lg" color="graphite.600">
                          Besoin d'aide en mathématiques ? A Rythme Ethic propose des <strong>cours à domicile</strong> et un <strong>accompagnement personnalisé</strong> pour t'aider à progresser à ton rythme.
                        </Text>
                        <Stack spacing={3} pl={4}>
                          <Text color="graphite.600">• Cours particuliers adaptés à ton niveau</Text>
                          <Text color="graphite.600">• Soutien scolaire et aide aux devoirs</Text>
                          <Text color="graphite.600">• Préparation aux examens (Brevet, Bac)</Text>
                          <Text color="graphite.600">• Méthodologie et confiance en soi</Text>
                        </Stack>
                        <Button 
                          size="lg" 
                          colorScheme="brand" 
                          onClick={() => handleContactClick('student')}
                          mt={4}
                        >
                          Prendre contact avec A Rythme Ethic
                        </Button>
                      </Stack>
                    </CardBody>
                  </Card>
                </TabPanel>

                {/* Parent Tab */}
                <TabPanel>
                  <Card maxW="4xl" mx="auto">
                    <CardBody>
                      <Stack spacing={6}>
                        <Box textAlign="center">
                          <Icon as={FiUsers} boxSize={12} color="teal.500" mb={4} />
                          <Heading size="lg" mb={4} color="graphite.500">Pour les parents</Heading>
                        </Box>
                        <Text fontSize="lg" color="graphite.600">
                          Vous souhaitez offrir à votre enfant un accompagnement de qualité en mathématiques ? A Rythme Ethic propose des <strong>cours à domicile</strong> et un <strong>suivi personnalisé</strong> pour l'aider à réussir.
                        </Text>
                        <Stack spacing={3} pl={4}>
                          <Text color="graphite.600">• Cours à domicile dans un cadre familier</Text>
                          <Text color="graphite.600">• Pédagogie adaptée au profil de votre enfant</Text>
                          <Text color="graphite.600">• Suivi régulier et bilan de progression</Text>
                          <Text color="graphite.600">• Horaires flexibles selon vos contraintes</Text>
                        </Stack>
                        <Button 
                          size="lg" 
                          colorScheme="brand" 
                          onClick={() => handleContactClick('parent')}
                          mt={4}
                        >
                          Prendre contact avec A Rythme Ethic
                        </Button>
                      </Stack>
                    </CardBody>
                  </Card>
                </TabPanel>

                {/* École/Centre Tab */}
                <TabPanel>
                  <Card maxW="4xl" mx="auto">
                    <CardBody>
                      <Stack spacing={6}>
                        <Box textAlign="center">
                          <Icon as={FiHome} boxSize={12} color="teal.500" mb={4} />
                          <Heading size="lg" mb={4} color="graphite.500">Pour les écoles et centres de formation</Heading>
                        </Box>
                        <Text fontSize="lg" color="graphite.600">
                          Vous recherchez un intervenant qualifié en mathématiques ? A Rythme Ethic propose des <strong>interventions dans votre établissement</strong> adaptées aux besoins de vos élèves.
                        </Text>
                        <Stack spacing={3} pl={4}>
                          <Text color="graphite.600">• Interventions ponctuelles ou régulières</Text>
                          <Text color="graphite.600">• Cours de soutien et remise à niveau</Text>
                          <Text color="graphite.600">• Ateliers thématiques en mathématiques</Text>
                          <Text color="graphite.600">• Préparation aux examens et concours</Text>
                        </Stack>
                        <Button 
                          size="lg" 
                          colorScheme="brand" 
                          onClick={() => handleContactClick('school')}
                          mt={4}
                        >
                          Prendre contact avec A Rythme Ethic
                        </Button>
                      </Stack>
                    </CardBody>
                  </Card>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Stack>
        </Container>



        {/* Footer */}
        <Box bg="graphite.500" color="white" py={{ base: 8, md: 12 }}>
          <Container maxW="container.xl">
            <Stack spacing={4} textAlign="center">
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold">
                A Rythme Ethic
              </Text>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="sand.200">
                Accompagnement en mathématiques - Cours à domicile et interventions en établissement
              </Text>
              <Text fontSize="sm" color="sand.300">
                © {new Date().getFullYear()} A Rythme Ethic - Tous droits réservés
              </Text>
            </Stack>
          </Container>
        </Box>
      </Box>
    </>
  );
}
