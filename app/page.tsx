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
        <Box 
          bgGradient="linear(to-b, #f9f3ee, #efe3d7)"
          py={{ base: 16, md: 24 }}
        >
          <Container maxW="container.xl">
            <Stack spacing={6} maxW="3xl" mx="auto" textAlign="center">
              <Box mx="auto" mb={2}>
                <Image 
                  src="/logo.jpg" 
                  alt="A Rythme Ethic" 
                  maxH="120px" 
                  mx="auto" 
                  borderRadius="xl"
                  boxShadow="sm"
                />
              </Box>
              <Heading 
                as="h1"
                size={{ base: '2xl', md: '3xl' }} 
                color="brand.500"
                fontFamily="heading"
                fontWeight="600"
              >
                A Rythme Ethic
              </Heading>
              <Text 
                fontSize={{ base: 'xl', md: '2xl' }} 
                color="terracotta.500"
                fontWeight="400"
              >
                Accompagnement humain et bienveillant
              </Text>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" maxW="2xl" mx="auto">
                Cours de mathématiques • Développement personnel • Éducation financière
              </Text>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="brand.600" maxW="2xl" mx="auto" opacity="0.8">
                Interventions à Nantes Est, Thouaré-sur-Loire et en établissements sur Nantes
              </Text>
              <Button 
                colorScheme="accent" 
                size="md"
                fontSize="md"
                px={8}
                onClick={() => handleContactClick('student')}
                mt={2}
              >
                Prendre contact
              </Button>
            </Stack>
          </Container>
        </Box>

        {/* Services by Client Type */}
        <Box bg="white" py={{ base: 12, md: 20 }}>
          <Container maxW="container.xl">
            <Stack spacing={10}>
              <Box textAlign="center">
                <Heading 
                  as="h2"
                  size={{ base: 'xl', md: '2xl' }} 
                  mb={4} 
                  color="brand.500"
                  fontFamily="heading"
                  fontWeight="600"
                >
                  Mes accompagnements
                </Heading>
                <Text fontSize={{ base: 'lg', md: 'xl' }} color="terracotta.500" fontWeight="400">
                  Une approche personnalisée pour chaque besoin
                </Text>
              </Box>

              <Tabs variant="soft-rounded" colorScheme="accent" align="center">
                <TabList flexWrap="wrap" justifyContent="center" mb={10}>
                  <Tab 
                    fontSize={{ base: 'md', md: 'lg' }} 
                    px={{ base: 4, md: 6 }}
                    fontWeight="500"
                    color="brand.500"
                    _selected={{ bg: 'accent.500', color: 'white' }}
                  >
                    Jeunes & Parents
                  </Tab>
                  <Tab 
                    fontSize={{ base: 'md', md: 'lg' }} 
                    px={{ base: 4, md: 6 }}
                    fontWeight="500"
                    color="brand.500"
                    _selected={{ bg: 'accent.500', color: 'white' }}
                  >
                    Établissements
                  </Tab>
                </TabList>

                <TabPanels>
                  {/* Jeunes & Parents Tab */}
                  <TabPanel>
                    <Card maxW="4xl" mx="auto" variant="beige">
                      <CardBody p={8}>
                        <Stack spacing={6}>
                          <Box textAlign="center">
                            <Icon as={FiUsers} boxSize={12} color="accent.500" mb={4} />
                            <Heading size="lg" mb={4} color="brand.500" fontFamily="heading" fontWeight="600">
                              Accompagnement privé
                            </Heading>
                          </Box>
                          
                          <Text fontSize="md" color="brand.600" fontWeight="500">
                            📍 Secteur : Nantes Est et autour de Thouaré-sur-Loire
                          </Text>
                          
                          <Box>
                            <Heading size="md" color="brand.500" mb={3}>
                              Cours particuliers en mathématiques
                            </Heading>
                            <Text fontSize="md" color="brand.600" mb={3}>
                              Pour les parents d'élèves souhaitant un accompagnement personnalisé (via CESU).
                            </Text>
                            <Stack spacing={2} pl={4}>
                              <Text color="brand.600">• Cours à domicile adaptés au niveau de l'élève</Text>
                              <Text color="brand.600">• Soutien scolaire et aide aux devoirs</Text>
                              <Text color="brand.600">• Préparation aux examens (Brevet, Bac)</Text>
                              <Text color="brand.600">• Accompagnement individuel uniquement</Text>
                            </Stack>
                          </Box>

                          <Box>
                            <Heading size="md" color="brand.500" mb={3}>
                              Parcours Envol - Jeunes actifs
                            </Heading>
                            <Text fontSize="md" color="brand.600" mb={3}>
                              Un accompagnement vers l'autonomie et l'indépendance dans la vie adulte.
                            </Text>
                            <Stack spacing={2} pl={4}>
                              <Text color="brand.600">• Connaissance de soi et développement personnel</Text>
                              <Text color="brand.600">• Gestion du stress et des émotions</Text>
                              <Text color="brand.600">• Éducation financière et autonomie</Text>
                              <Text color="brand.600">• Préparation à l'indépendance</Text>
                            </Stack>
                          </Box>

                          <Button 
                            size="md" 
                            colorScheme="accent" 
                            onClick={() => handleContactClick('parent')}
                            mt={4}
                          >
                            Prendre contact
                          </Button>
                        </Stack>
                      </CardBody>
                    </Card>
                  </TabPanel>

                  {/* Établissements Tab */}
                <TabPanel>
                  <Card maxW="4xl" mx="auto" variant="beige">
                    <CardBody p={8}>
                      <Stack spacing={6}>
                        <Box textAlign="center">
                          <Icon as={FiHome} boxSize={12} color="accent.500" mb={4} />
                          <Heading size="lg" mb={4} color="brand.500" fontFamily="heading" fontWeight="600">
                            Interventions en établissements
                          </Heading>
                        </Box>
                        
                        <Text fontSize="md" color="brand.600" fontWeight="500">
                          📍 Secteur : Nantes (selon récurrence des interventions)
                        </Text>                        <Box>
                          <Heading size="md" color="brand.500" mb={3}>
                            Établissements d'enseignement supérieur
                          </Heading>
                          <Stack spacing={2} pl={4}>
                            <Text color="brand.600">• Cours de mathématiques</Text>
                            <Text color="brand.600">• Modules de développement de compétences psychosociales</Text>
                            <Text color="brand.600">• Modules d'éducation financière</Text>
                          </Stack>
                        </Box>

                        <Box>
                          <Heading size="md" color="brand.500" mb={3}>
                            Collèges, lycées et collectivités
                          </Heading>
                          <Stack spacing={2} pl={4}>
                            <Text color="brand.600">• Modules de développement de compétences psychosociales</Text>
                            <Text color="brand.600">• Modules d'éducation financière</Text>
                            <Text color="brand.600">• Interventions ponctuelles ou régulières</Text>
                            <Text color="brand.600">• Ateliers thématiques adaptés</Text>
                          </Stack>
                        </Box>

                        <Button 
                          size="md" 
                          colorScheme="accent" 
                          onClick={() => handleContactClick('school')}
                          mt={4}
                        >
                          Prendre contact
                        </Button>
                      </Stack>
                    </CardBody>
                  </Card>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Stack>
          </Container>
        </Box>

        {/* Pédagogie Section */}
        <Box bg="#faf6f2" py={{ base: 12, md: 20 }}>
          <Container maxW="container.lg">
            <Stack spacing={8} textAlign="center">
              <Heading 
                as="h2"
                size={{ base: 'xl', md: '2xl' }} 
                color="brand.500"
                fontFamily="heading"
                fontWeight="600"
              >
                Ma pédagogie
              </Heading>
              
              <Card bg="white" maxW="3xl" mx="auto">
                <CardBody p={{ base: 6, md: 10 }}>
                  <Stack spacing={6} textAlign="left">
                    <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.8">
                      J'axe ma pédagogie sur la <strong>qualité de la relation humaine</strong> tissée avec l'apprenant. 
                      J'ancre les apprentissages dans le <strong>réel et le concret</strong>.
                    </Text>
                    
                    <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.8">
                      J'aime <strong>innover</strong> pour trouver le bon angle d'approche avec chaque jeune. 
                      J'aime susciter la <strong>curiosité et l'envie d'en savoir plus</strong> pour leur transmettre 
                      des outils favorisant leur <strong>indépendance et leur autonomie</strong> au sens large.
                    </Text>

                    <Box 
                      bg="#f9f3ee" 
                      p={6} 
                      borderRadius="lg" 
                      borderLeft="3px solid"
                      borderColor="accent.500"
                    >
                      <Text 
                        fontSize={{ base: 'md', md: 'lg' }} 
                        color="terracotta.500" 
                        fontWeight="400"
                        fontStyle="italic"
                        textAlign="center"
                      >
                        "Une approche humaine, bienveillante et concrète pour accompagner chaque jeune vers sa réussite"
                      </Text>
                    </Box>
                  </Stack>
                </CardBody>
              </Card>

              <Button 
                colorScheme="accent" 
                size="md"
                px={8}
                onClick={() => handleContactClick('student')}
                mt={4}
              >
                Découvrir l'accompagnement
              </Button>
            </Stack>
          </Container>
        </Box>

        {/* Footer */}
        <Box bg="brand.500" color="white" py={{ base: 8, md: 12 }}>
          <Container maxW="container.xl">
            <Stack spacing={4} textAlign="center">
              <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" fontFamily="heading">
                A Rythme Ethic
              </Text>
              <Text fontSize={{ base: 'sm', md: 'md' }} color="sand.200">
                Accompagnement personnalisé • Nantes Est & Thouaré-sur-Loire
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
