'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  Flex,
  Image,
  HStack,
  useDisclosure,
} from '@chakra-ui/react';
import { Nav } from '@/components/Nav';
import { ContactModal } from '@/components/ContactModal';
import { useState, useRef, type ReactNode, type CSSProperties } from 'react';
import { motion, useInView } from 'framer-motion';

function FadeUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function SlideIn({
  children,
  from = 'left',
  delay = 0,
  style,
}: {
  children: ReactNode;
  from?: 'left' | 'right';
  delay?: number;
  style?: CSSProperties;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: from === 'left' ? -50 : 50 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: 'easeOut' }}
      style={{ height: '100%', ...style }}
    >
      {children}
    </motion.div>
  );
}

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

      {/* ── HERO ── */}
      <Box
        bgGradient="linear(to-br, #f9f3ee, #efe3d7, #e8d5c4)"
        minH={{ base: 'auto', lg: '90vh' }}
        display="flex"
        alignItems="center"
        py={{ base: 14, lg: 0 }}
      >
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            align="center"
            gap={{ base: 10, lg: 16 }}
            py={{ base: 4, lg: 16 }}
          >
            {/* Text */}
            <motion.div
              initial={{ opacity: 0, x: -60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              style={{ flex: 1 }}
            >
              <Stack spacing={6}>
                <Image
                  src="/logo.jpg"
                  alt="A Rythme Ethic"
                  h="72px"
                  borderRadius="lg"
                  alignSelf="flex-start"
                />
                <Heading
                  as="h1"
                  fontSize={{ base: '4xl', md: '5xl', lg: '6xl' }}
                  color="brand.500"
                  fontFamily="heading"
                  fontWeight="700"
                  lineHeight="1.1"
                >
                  A Rythme<br />Ethic
                </Heading>
                <Text fontSize={{ base: 'xl', md: '2xl' }} color="terracotta.500" fontWeight="500">
                  Accompagnement humain et bienveillant
                </Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.8">
                  Cours de mathématiques · Compétences psychosociales · Éducation financière
                </Text>
                <Text fontSize="sm" color="brand.600" opacity={0.65}>
                  📍 Nantes Est · Thouaré-sur-Loire · En établissements
                </Text>
                <Flex gap={4} flexWrap="wrap" pt={2}>
                  <Button
                    colorScheme="accent"
                    size="lg"
                    px={8}
                    onClick={() => handleContactClick('parent')}
                  >
                    Prendre contact
                  </Button>
                  <Button
                    size="lg"
                    px={6}
                    variant="outline"
                    borderColor="brand.400"
                    color="brand.500"
                    _hover={{ bg: 'brand.50' }}
                    onClick={() => handleContactClick('school')}
                  >
                    Je suis un établissement
                  </Button>
                </Flex>
              </Stack>
            </motion.div>

            {/* Photo */}
            <motion.div
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
              style={{ flex: 1, maxWidth: '500px', width: '100%' }}
            >
              <Box
                borderRadius="3xl"
                overflow="hidden"
                boxShadow="2xl"
                position="relative"
              >
                <Image
                  src="/DSC08807.JPG"
                  alt="Florence - A Rythme Ethic"
                  w="100%"
                  h={{ base: '300px', md: '480px', lg: '540px' }}
                  objectFit="cover"
                />
                <Box
                  position="absolute"
                  bottom={5}
                  left={5}
                  bg="white"
                  px={4}
                  py={3}
                  borderRadius="xl"
                  boxShadow="md"
                >
                  <Text fontSize="sm" fontWeight="700" color="brand.500">Florence Louazel</Text>
                  <Text fontSize="xs" color="terracotta.500">Enseignante & formatrice</Text>
                </Box>
              </Box>
            </motion.div>
          </Flex>
        </Container>
      </Box>

      {/* ── SERVICES ── */}
      <Box bg="white" py={{ base: 16, md: 24 }}>
        <Container maxW="container.xl">
          <FadeUp>
            <Box textAlign="center" mb={14}>
              <Text
                fontSize="xs"
                fontWeight="700"
                color="accent.500"
                textTransform="uppercase"
                letterSpacing="widest"
                mb={3}
              >
                Ce que je propose
              </Text>
              <Heading
                as="h2"
                fontSize={{ base: '3xl', md: '4xl' }}
                color="brand.500"
                fontFamily="heading"
                mb={3}
              >
                Mes accompagnements
              </Heading>
              <Text fontSize={{ base: 'lg', md: 'xl' }} color="terracotta.500">
                Une approche personnalisée pour chaque besoin
              </Text>
            </Box>
          </FadeUp>

          <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={8}>
            {/* Jeunes & Parents */}
            <SlideIn from="left" delay={0.1}>
              <Box
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="md"
                border="1px solid"
                borderColor="sand.200"
                bg="white"
                display="flex"
                flexDirection="column"
                h="100%"
              >
                <Box h="220px" overflow="hidden">
                  <Image
                    src="/DSC08964.JPG"
                    alt="Cours particuliers"
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                </Box>
                <Box p={{ base: 6, md: 8 }} flex={1} display="flex" flexDirection="column">
                  <Stack spacing={5} flex={1}>
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        color="accent.500"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        mb={2}
                      >
                        Jeunes & Parents
                      </Text>
                      <Heading size="lg" color="brand.500" fontFamily="heading">
                        Accompagnement privé
                      </Heading>
                    </Box>
                    <Text fontSize="sm" color="brand.500" fontWeight="600">
                      📍 Nantes Est · Thouaré-sur-Loire
                    </Text>

                    <Box>
                      <Text fontSize="md" fontWeight="600" color="brand.500" mb={2}>
                        Cours particuliers en mathématiques
                      </Text>
                      <Text fontSize="sm" color="brand.600" mb={2}>
                        Accompagnement personnalisé à domicile via CESU :
                      </Text>
                      <Stack spacing={1} pl={2}>
                        {[
                          "Cours adaptés au niveau de l'élève",
                          'Soutien scolaire & aide aux devoirs',
                          'Préparation aux examens (Brevet, Bac)',
                          'Accompagnement individuel uniquement',
                        ].map((item) => (
                          <Text key={item} fontSize="sm" color="brand.600">
                            › {item}
                          </Text>
                        ))}
                      </Stack>
                    </Box>

                    <Box>
                      <Text fontSize="md" fontWeight="600" color="brand.500" mb={2}>
                        Parcours Envol — Jeunes actifs
                      </Text>
                      <Stack spacing={1} pl={2}>
                        {[
                          'Connaissance de soi & compétences psychosociales',
                          'Gestion du stress et des émotions',
                          'Éducation financière & autonomie',
                          "Préparation à l'indépendance",
                        ].map((item) => (
                          <Text key={item} fontSize="sm" color="brand.600">
                            › {item}
                          </Text>
                        ))}
                      </Stack>
                    </Box>

                    <Box pt={2}>
                      <Button colorScheme="accent" size="md" onClick={() => handleContactClick('parent')}>
                        Prendre contact
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </SlideIn>

            {/* Établissements */}
            <SlideIn from="right" delay={0.2}>
              <Box
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="md"
                border="1px solid"
                borderColor="sand.200"
                bg="white"
                display="flex"
                flexDirection="column"
                h="100%"
              >
                <Box h="220px" overflow="hidden">
                  <Image
                    src="/DSC08853.JPG"
                    alt="Interventions en établissements"
                    w="100%"
                    h="100%"
                    objectFit="cover"
                  />
                </Box>
                <Box p={{ base: 6, md: 8 }} flex={1} display="flex" flexDirection="column">
                  <Stack spacing={5} flex={1}>
                    <Box>
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        color="accent.500"
                        textTransform="uppercase"
                        letterSpacing="widest"
                        mb={2}
                      >
                        Établissements
                      </Text>
                      <Heading size="lg" color="brand.500" fontFamily="heading">
                        Interventions en établissements
                      </Heading>
                    </Box>
                    <Text fontSize="sm" color="brand.500" fontWeight="600">
                      📍 Nantes (selon récurrence des interventions)
                    </Text>

                    <Box>
                      <Text fontSize="md" fontWeight="600" color="brand.500" mb={2}>
                        Enseignement supérieur
                      </Text>
                      <Stack spacing={1} pl={2}>
                        {[
                          'Cours de mathématiques',
                          'Modules de compétences psychosociales',
                          "Modules d'éducation financière",
                        ].map((item) => (
                          <Text key={item} fontSize="sm" color="brand.600">
                            › {item}
                          </Text>
                        ))}
                      </Stack>
                    </Box>

                    <Box>
                      <Text fontSize="md" fontWeight="600" color="brand.500" mb={2}>
                        Collèges, lycées & collectivités
                      </Text>
                      <Stack spacing={1} pl={2}>
                        {[
                          'Modules de compétences psychosociales',
                          "Modules d'éducation financière",
                          'Interventions ponctuelles ou régulières',
                          'Ateliers thématiques adaptés',
                        ].map((item) => (
                          <Text key={item} fontSize="sm" color="brand.600">
                            › {item}
                          </Text>
                        ))}
                      </Stack>
                    </Box>

                    <Box pt={2}>
                      <Button colorScheme="accent" size="md" onClick={() => handleContactClick('school')}>
                        Prendre contact
                      </Button>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </SlideIn>
          </Grid>
        </Container>
      </Box>

      {/* ── PÉDAGOGIE ── */}
      <Box bg="#faf6f2" py={{ base: 16, md: 24 }} overflow="hidden">
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            align="center"
            gap={{ base: 12, lg: 16 }}
          >
            <SlideIn from="left" style={{ flex: 1 }}>
              <Box
                borderRadius="3xl"
                overflow="hidden"
                boxShadow="xl"
                maxW={{ base: '100%', lg: '460px' }}
              >
                <Image
                  src="/DSC08870.JPG"
                  alt="Pédagogie A Rythme Ethic"
                  w="100%"
                  h={{ base: '280px', md: '440px' }}
                  objectFit="cover"
                />
              </Box>
            </SlideIn>

            <SlideIn from="right" delay={0.1} style={{ flex: 1 }}>
              <Stack spacing={6}>
                <Box>
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color="accent.500"
                    textTransform="uppercase"
                    letterSpacing="widest"
                    mb={3}
                  >
                    Ma philosophie
                  </Text>
                  <Heading
                    as="h2"
                    fontSize={{ base: '3xl', md: '4xl' }}
                    color="brand.500"
                    fontFamily="heading"
                  >
                    Ma pédagogie
                  </Heading>
                </Box>

                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.9">
                  J'axe ma pédagogie sur la{' '}
                  <strong>qualité de la relation humaine</strong> tissée avec l'apprenant.
                  J'ancre les apprentissages dans le <strong>réel et le concret</strong>.
                </Text>

                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.9">
                  J'aime <strong>innover</strong> pour trouver le bon angle d'approche avec
                  chaque jeune. J'aime susciter la{' '}
                  <strong>curiosité et l'envie d'en savoir plus</strong> pour leur transmettre
                  des outils favorisant leur{' '}
                  <strong>indépendance et leur autonomie</strong> au sens large.
                </Text>

                <Box
                  bg="white"
                  p={{ base: 5, md: 6 }}
                  borderRadius="xl"
                  borderLeft="4px solid"
                  borderColor="terracotta.400"
                  boxShadow="sm"
                >
                  <Text
                    fontSize={{ base: 'md', md: 'lg' }}
                    color="terracotta.600"
                    fontStyle="italic"
                    lineHeight="1.7"
                  >
                    "Une approche humaine, bienveillante et concrète pour accompagner chaque
                    jeune vers sa réussite"
                  </Text>
                </Box>

                <Box>
                  <Button
                    colorScheme="accent"
                    size="lg"
                    px={8}
                    onClick={() => handleContactClick('student')}
                  >
                    Découvrir l'accompagnement
                  </Button>
                </Box>
              </Stack>
            </SlideIn>
          </Flex>
        </Container>
      </Box>

      {/* ── CTA ── */}
      <Box bg="brand.500" py={{ base: 14, md: 20 }}>
        <Container maxW="container.md">
          <FadeUp>
            <Stack spacing={6} textAlign="center" align="center">
              <Heading
                as="h2"
                fontSize={{ base: '3xl', md: '4xl' }}
                color="white"
                fontFamily="heading"
              >
                Prêt(e) à commencer ?
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="sand.200" maxW="lg">
                Chaque parcours commence par une rencontre. Contactez-moi pour échanger sur vos
                besoins.
              </Text>
              <Flex gap={4} flexWrap="wrap" justify="center" pt={2}>
                <Button
                  size="lg"
                  bg="white"
                  color="brand.500"
                  _hover={{ bg: 'sand.50', transform: 'translateY(-2px)', shadow: 'lg' }}
                  transition="all 0.2s"
                  px={8}
                  onClick={() => handleContactClick('parent')}
                >
                  Je suis parent / jeune
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  borderColor="whiteAlpha.600"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.200', transform: 'translateY(-2px)' }}
                  transition="all 0.2s"
                  px={8}
                  onClick={() => handleContactClick('school')}
                >
                  Je représente un établissement
                </Button>
              </Flex>
            </Stack>
          </FadeUp>
        </Container>
      </Box>

      {/* ── FOOTER ── */}
      <Box bg="brand.700" color="white" py={{ base: 8, md: 10 }}>
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align="center"
            gap={4}
          >
            <HStack spacing={3}>
              <Image src="/logo.jpg" alt="A Rythme Ethic" h="36px" borderRadius="md" />
              <Text fontSize="lg" fontWeight="600" fontFamily="heading">
                A Rythme Ethic
              </Text>
            </HStack>
            <Text fontSize="sm" color="sand.300" textAlign="center">
              Accompagnement personnalisé · Nantes Est & Thouaré-sur-Loire
            </Text>
            <Text fontSize="xs" color="sand.400">
              © {new Date().getFullYear()} A Rythme Ethic
            </Text>
          </Flex>
        </Container>
      </Box>
    </>
  );
}
