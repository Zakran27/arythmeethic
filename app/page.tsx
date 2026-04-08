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
import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from 'react';

const PARTICULIER_STEPS = [
  { title: "Prise d'informations via le formulaire en ligne" },
  { title: "Appel découverte de 30 min offert" },
  { title: "RDV Bilan", subtitle: "1h à 1h30 avec le jeune · 30 min de restitution avec les parents" },
  { title: "Contractualisation", subtitle: "Signature d'un contrat · Compte CESU et activation CESU+" },
  { title: "Suivi régulier du jeune" },
  { title: "Déclaration mensuelle CESU", subtitle: "Virement automatique du salaire" },
  { title: "Bilan de trimestre sur demande (30 min)" },
  { title: "Poursuite dans la classe supérieure", subtitle: "ou fin de l'accompagnement" },
];

const ECOLE_STEPS = [
  { title: "Prise d'informations via le formulaire en ligne" },
  { title: "Appel visio ou RDV en présentiel sur site" },
  { title: "Contractualisation", subtitle: "Signature d'un contrat de prestation" },
  { title: "Planification" },
  { title: "Réalisation du module" },
  { title: "Facturation mensuelle", subtitle: "Paiement par virement" },
  { title: "Bilan annuel" },
  { title: "Poursuite l'année scolaire suivante", subtitle: "ou fin de prestation" },
];

function ProcessStep({
  step,
  index,
  isLast,
}: {
  step: { title: string; subtitle?: string };
  index: number;
  isLast: boolean;
}) {
  const isFirst = index === 0;
  return (
    <Flex position="relative" align="flex-start">
      {!isLast && (
        <Box
          position="absolute"
          left="15px"
          top="34px"
          bottom="-4px"
          w="2px"
          bg="sand.200"
          zIndex={0}
        />
      )}
      <Box
        w="32px"
        h="32px"
        borderRadius="full"
        bg={isFirst ? 'accent.500' : 'white'}
        border="2px solid"
        borderColor={isFirst ? 'accent.500' : 'sand.300'}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        zIndex={1}
        mt="2px"
      >
        {isFirst ? (
          <Text color="white" fontSize="xs" fontWeight="700" lineHeight={1}>✓</Text>
        ) : (
          <Text color="brand.400" fontSize="xs" fontWeight="700" lineHeight={1}>{index + 1}</Text>
        )}
      </Box>
      <Box ml={3} pb={isLast ? 0 : 5}>
        <Text fontSize="sm" fontWeight={600} color="brand.600">{step.title}</Text>
        {step.subtitle && (
          <Text fontSize="xs" color="brand.400" mt={0.5} fontStyle="italic">{step.subtitle}</Text>
        )}
      </Box>
    </Flex>
  );
}
import { motion, useInView, AnimatePresence } from 'framer-motion';

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

const REVIEWS = [
  {
    name: 'Isabelle M.',
    note: 5,
    text: "Florence accompagne ma fille depuis plusieurs mois en mathématiques. Les résultats sont au rendez-vous et surtout ma fille a retrouvé confiance en elle. Je recommande vivement !",
  },
  {
    name: 'Thomas L.',
    note: 5,
    text: "Accompagnement sérieux, bienveillant et très professionnel. Florence a su cerner rapidement les difficultés de mon fils et adapter sa méthode. Excellent suivi.",
  },
  {
    name: 'Camille D.',
    note: 5,
    text: "J'ai fait appel à A Rythme Ethic pour un module de compétences psycho-sociales dans notre lycée. L'intervention a été très bien accueillie par les élèves. Merci Florence !",
  },
  {
    name: 'Sophie R.',
    note: 5,
    text: "Ma fille était en grande difficulté en terminale. Grâce à Florence, elle a pu décrocher son bac avec mention. Un vrai soutien humain et pédagogique.",
  },
  {
    name: 'Antoine B.',
    note: 5,
    text: "Florence est une formatrice remarquable. Pédagogie adaptée, écoute attentive, et résultats tangibles. Je n'hésiterai pas à faire appel à elle à nouveau.",
  },
];

function StarRating({ note }: { note: number }) {
  return (
    <HStack spacing={0.5}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Text key={i} color={i < note ? 'accent.400' : 'gray.300'} fontSize="lg">
          ★
        </Text>
      ))}
    </HStack>
  );
}

function ReviewsCarousel() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent(c => (c + 1) % REVIEWS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const paginate = (dir: number) => {
    setDirection(dir);
    setCurrent(c => (c + dir + REVIEWS.length) % REVIEWS.length);
  };

  const review = REVIEWS[current];

  return (
    <Box position="relative" w="100%" maxW="600px" mx="auto">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <Box
            bg="white"
            borderRadius="2xl"
            boxShadow="md"
            p={{ base: 6, md: 8 }}
            textAlign="center"
          >
            <StarRating note={review.note} />
            <Text mt={4} fontSize={{ base: 'md', md: 'lg' }} color="gray.700" fontStyle="italic">
              &ldquo;{review.text}&rdquo;
            </Text>
            <Text mt={4} fontWeight="600" color="brand.500">
              {review.name}
            </Text>
          </Box>
        </motion.div>
      </AnimatePresence>

      {/* Navigation dots */}
      <HStack justify="center" mt={5} spacing={2}>
        {REVIEWS.map((_, i) => (
          <Box
            key={i}
            as="button"
            w={i === current ? '20px' : '8px'}
            h="8px"
            borderRadius="full"
            bg={i === current ? 'brand.500' : 'gray.300'}
            transition="all 0.3s"
            onClick={() => {
              setDirection(i > current ? 1 : -1);
              setCurrent(i);
            }}
          />
        ))}
      </HStack>

      {/* Prev/Next */}
      <Button
        position="absolute"
        left="-16px"
        top="45%"
        transform="translateY(-50%)"
        borderRadius="full"
        size="sm"
        variant="ghost"
        colorScheme="brand"
        onClick={() => paginate(-1)}
        aria-label="Précédent"
        fontSize="xl"
      >
        ‹
      </Button>
      <Button
        position="absolute"
        right="-16px"
        top="45%"
        transform="translateY(-50%)"
        borderRadius="full"
        size="sm"
        variant="ghost"
        colorScheme="brand"
        onClick={() => paginate(1)}
        aria-label="Suivant"
        fontSize="xl"
      >
        ›
      </Button>
    </Box>
  );
}

export default function HomePage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [defaultClientType, setDefaultClientType] = useState<'student' | 'parent' | 'school'>(
    'student'
  );
  const [activeTab, setActiveTab] = useState<'particulier' | 'accompagnement' | 'ecole'>('particulier');

  const handleNavServiceClick = (tab: 'particulier' | 'accompagnement' | 'ecole') => {
    setActiveTab(tab);
    setTimeout(() => {
      document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  const handleContactClick = (type: 'student' | 'parent' | 'school') => {
    setDefaultClientType(type);
    onOpen();
  };

  return (
    <>
      <Nav onServiceClick={handleNavServiceClick} />
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
                  A Rythme
                  <br />
                  Ethic
                </Heading>
                <Text fontSize={{ base: 'xl', md: '2xl' }} color="terracotta.500" fontWeight="500">
                  Accompagnement humain et bienveillant
                </Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.8">
                  Enseignement de matières techniques · Compétences psychosociales · Éducation financière
                </Text>
                <Text fontSize="sm" color="brand.600" opacity={0.65}>
                  📍 Nantes Est · Thouaré-sur-Loire · En établissements
                </Text>
                <Flex gap={4} flexWrap="wrap" pt={2}>
                  <Button
                    colorScheme="accent"
                    size="lg"
                    px={8}
                    onClick={onOpen}
                  >
                    Prendre contact
                  </Button>
                  <Button
                    variant="outline"
                    borderColor="brand.500"
                    color="brand.500"
                    size="lg"
                    px={8}
                    _hover={{ bg: 'brand.50' }}
                    onClick={() => document.getElementById('decouvrir')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Découvrez qui je suis
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
              <Box borderRadius="3xl" overflow="hidden" boxShadow="2xl" position="relative">
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
                  <Text fontSize="sm" fontWeight="700" color="brand.500">
                    Florence Louazel
                  </Text>
                  <Text fontSize="xs" color="terracotta.500">
                    Formatrice
                  </Text>
                </Box>
              </Box>
            </motion.div>
          </Flex>
        </Container>
      </Box>

      {/* ── SERVICES ── */}
      <Box id="services" bg="white" py={{ base: 16, md: 24 }}>
        <Container maxW="container.xl">
          <FadeUp>
            <Box textAlign="center" mb={10}>
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
              <Text fontSize={{ base: 'lg', md: 'xl' }} color="terracotta.500" mb={8}>
                Une approche personnalisée pour chaque besoin
              </Text>

              {/* Tab selector */}
              <Flex justify="center">
                <HStack
                  bg="sand.100"
                  borderRadius="full"
                  p="4px"
                  spacing={1}
                  flexWrap={{ base: 'wrap', md: 'nowrap' }}
                  justify="center"
                >
                  {([
                    { key: 'particulier', label: 'Cours particuliers' },
                    { key: 'accompagnement', label: 'Accompagnement' },
                    { key: 'ecole', label: 'Établissements & associations' },
                  ] as const).map(({ key, label }) => (
                    <Button
                      key={key}
                      borderRadius="full"
                      size="sm"
                      bg={activeTab === key ? 'brand.500' : 'transparent'}
                      color={activeTab === key ? 'white' : 'brand.500'}
                      _hover={{ bg: activeTab === key ? 'brand.600' : 'sand.200' }}
                      onClick={() => setActiveTab(key)}
                      fontWeight="600"
                      px={5}
                      transition="all 0.2s"
                    >
                      {label}
                    </Button>
                  ))}
                </HStack>
              </Flex>
            </Box>
          </FadeUp>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* ── Cours particuliers ── */}
              {activeTab === 'particulier' && (
                <Box
                  borderRadius="2xl"
                  overflow="hidden"
                  boxShadow="md"
                  border="1px solid"
                  borderColor="sand.200"
                  bg="white"
                  maxW="860px"
                  mx="auto"
                >
                  <Flex direction={{ base: 'column', lg: 'row' }}>
                    <Box
                      w={{ base: '100%', lg: '42%' }}
                      h={{ base: '240px', lg: 'auto' }}
                      minH={{ lg: '520px' }}
                      overflow="hidden"
                      flexShrink={0}
                    >
                      <Image
                        src="/DSC08964.JPG"
                        alt="Cours particuliers"
                        w="100%"
                        h="100%"
                        objectFit="cover"
                        objectPosition="center 45%"
                      />
                    </Box>
                    <Box p={{ base: 6, md: 8 }} flex={1}>
                      <Box mb={5}>
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          color="accent.500"
                          textTransform="uppercase"
                          letterSpacing="widest"
                          mb={1}
                        >
                          Collège & lycée
                        </Text>
                        <Heading size="md" color="brand.500" fontFamily="heading" mb={2}>
                          Cours particuliers
                        </Heading>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={4}>
                          Chaque élève est unique et possède un fonctionnement qui lui est propre. En cours particuliers
                          de mathématiques, mon objectif est d&apos;identifier ce fonctionnement afin de créer des
                          conditions d&apos;apprentissage sereines, efficaces… et même agréables.
                        </Text>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={4}>
                          Dès la première rencontre, je prends le temps de comprendre la personnalité, le parcours et
                          les besoins du jeune que j&apos;accompagne. Manque de confiance, méthode de travail à
                          construire, besoin d&apos;entraînement ou de sens : nous avançons ensemble pas à pas pour
                          redonner confiance, clarifier les notions et installer des bases solides et durables.
                        </Text>
                        <Text fontSize="xs" color="brand.400" fontWeight="500">
                          📍 Nantes et ses alentours · prendre contact pour d&apos;autres localisations
                        </Text>
                      </Box>
                      <Stack spacing={0}>
                        {PARTICULIER_STEPS.map((step, i, arr) => (
                          <ProcessStep key={i} step={step} index={i} isLast={i === arr.length - 1} />
                        ))}
                      </Stack>
                    </Box>
                  </Flex>
                </Box>
              )}

              {/* ── Accompagnement ── */}
              {activeTab === 'accompagnement' && (
                <Box maxW="860px" mx="auto">
                  <Flex direction={{ base: 'column', lg: 'row' }} gap={6}>
                    {/* Entrée en école d'ingénieur */}
                    <Box
                      flex={1}
                      borderRadius="2xl"
                      boxShadow="md"
                      border="1px solid"
                      borderColor="sand.200"
                      bg="white"
                      overflow="hidden"
                    >
                      <Box h="200px" overflow="hidden">
                        <Image
                          src="/DSC08964.JPG"
                          alt="Accompagnement entrée en école d'ingénieur"
                          w="100%"
                          h="100%"
                          objectFit="cover"
                          objectPosition="center 30%"
                        />
                      </Box>
                      <Box p={{ base: 6, md: 7 }}>
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          color="accent.500"
                          textTransform="uppercase"
                          letterSpacing="widest"
                          mb={1}
                        >
                          Prépa & concours
                        </Text>
                        <Heading size="sm" color="brand.500" fontFamily="heading" mb={3}>
                          Accompagnement entrée en école d&apos;ingénieur
                        </Heading>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={3}>
                          Entrer en école d&apos;ingénieur est un projet ambitieux qui peut susciter autant
                          d&apos;enthousiasme que d&apos;incertitudes. Je propose un accompagnement modulable, adapté
                          aux besoins de chacun : préparation aux épreuves de mathématiques, entraînement aux
                          entretiens individuels, travail sur la confiance en soi et la gestion du stress.
                        </Text>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={4}>
                          Apprendre à identifier ses atouts et à les valoriser est un véritable levier de réussite.
                          Mon objectif est d&apos;aider votre jeune à aborder ces changements sereinement, avec
                          confiance et clarté.
                        </Text>
                        <Button
                          colorScheme="accent"
                          size="sm"
                          onClick={() => handleContactClick('student')}
                        >
                          Prendre contact
                        </Button>
                      </Box>
                    </Box>

                    {/* Parcours Envol */}
                    <Box
                      flex={1}
                      borderRadius="2xl"
                      boxShadow="md"
                      border="1px solid"
                      borderColor="sand.200"
                      bg="white"
                      overflow="hidden"
                    >
                      <Box h="200px" overflow="hidden">
                        <Image
                          src="/DSC08853.JPG"
                          alt="Parcours Envol"
                          w="100%"
                          h="100%"
                          objectFit="cover"
                        />
                      </Box>
                      <Box p={{ base: 6, md: 7 }}>
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          color="accent.500"
                          textTransform="uppercase"
                          letterSpacing="widest"
                          mb={1}
                        >
                          Fin de lycée & autonomie
                        </Text>
                        <Heading size="sm" color="brand.500" fontFamily="heading" mb={3}>
                          Parcours Envol
                        </Heading>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={3}>
                          La fin du lycée marque une étape clé : celle de l&apos;envol et des premiers pas vers
                          l&apos;autonomie. Je propose un accompagnement complet autour de trois piliers essentiels :
                          la connaissance de soi, l&apos;éducation financière et la cuisine du quotidien.
                        </Text>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={4}>
                          L&apos;objectif est d&apos;aider votre jeune à devenir autonome, organisé et serein dans sa
                          nouvelle vie, pour prendre son envol avec confiance, liberté et plaisir.
                        </Text>
                        <Button
                          colorScheme="accent"
                          size="sm"
                          onClick={() => handleContactClick('parent')}
                        >
                          Prendre contact
                        </Button>
                      </Box>
                    </Box>
                  </Flex>
                </Box>
              )}

              {/* ── Établissements & associations ── */}
              {activeTab === 'ecole' && (
                <Box
                  borderRadius="2xl"
                  overflow="hidden"
                  boxShadow="md"
                  border="1px solid"
                  borderColor="sand.200"
                  bg="white"
                  maxW="860px"
                  mx="auto"
                >
                  <Flex direction={{ base: 'column', lg: 'row' }}>
                    <Box
                      w={{ base: '100%', lg: '42%' }}
                      h={{ base: '240px', lg: 'auto' }}
                      minH={{ lg: '520px' }}
                      overflow="hidden"
                      flexShrink={0}
                    >
                      <Image
                        src="/DSC08853.JPG"
                        alt="Interventions en établissements et associations étudiantes"
                        w="100%"
                        h="100%"
                        objectFit="cover"
                      />
                    </Box>
                    <Box p={{ base: 6, md: 8 }} flex={1}>
                      <Box mb={5}>
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          color="accent.500"
                          textTransform="uppercase"
                          letterSpacing="widest"
                          mb={1}
                        >
                          Clients professionnels
                        </Text>
                        <Heading size="md" color="brand.500" fontFamily="heading" mb={2}>
                          Établissements et associations étudiantes
                        </Heading>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={3}>
                          La santé mentale et l&apos;accompagnement à l&apos;autonomie sont aujourd&apos;hui des enjeux
                          majeurs pour les établissements scolaires et les associations étudiantes. Je propose des
                          prestations clés en main ainsi que des ateliers sur mesure, construits selon vos besoins et
                          votre projet.
                        </Text>
                        <Text fontSize="sm" color="brand.600" lineHeight="1.8" mb={4}>
                          L&apos;objectif est de développer les compétences psychosociales : émotionnelles, cognitives,
                          sociales, interpersonnelles et de communication, dans un espace de parole libre et
                          sécurisant.
                        </Text>
                        <Text fontSize="xs" color="brand.400" fontWeight="500" mb={5}>
                          📍 Nantes et ses alentours · prendre contact pour d&apos;autres localisations
                        </Text>
                      </Box>
                      <Stack spacing={0}>
                        {ECOLE_STEPS.map((step, i, arr) => (
                          <ProcessStep key={i} step={step} index={i} isLast={i === arr.length - 1} />
                        ))}
                      </Stack>
                    </Box>
                  </Flex>
                </Box>
              )}
            </motion.div>
          </AnimatePresence>
        </Container>
      </Box>

      {/* ── DÉCOUVREZ QUI JE SUIS ── */}
      <Box id="decouvrir" bg="#faf6f2" py={{ base: 16, md: 24 }}>
        <Container maxW="container.xl">
          <FadeUp>
            <Box textAlign="center" mb={10}>
              <Text
                fontSize="xs"
                fontWeight="700"
                color="accent.500"
                textTransform="uppercase"
                letterSpacing="widest"
                mb={3}
              >
                En vidéo
              </Text>
              <Heading
                as="h2"
                fontSize={{ base: '3xl', md: '4xl' }}
                color="brand.500"
                fontFamily="heading"
              >
                Découvrez qui je suis
              </Heading>
            </Box>
            <Flex direction={{ base: 'column', lg: 'row' }} gap={{ base: 10, lg: 16 }} align="center">
              {/* Placeholder vidéo — remplacer l'URL ci-dessous par l'URL YouTube/Vimeo */}
              <Box
                flex="1"
                w="100%"
                borderRadius="2xl"
                overflow="hidden"
                boxShadow="xl"
                bg="brand.100"
                aspectRatio={16 / 9}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="brand.400" fontSize="lg" fontWeight="500">
                  Vidéo à venir
                </Text>
              </Box>
              {/* Description */}
              <Stack flex="1" spacing={5}>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.9">
                  Ingénieure généraliste de formation, je suis passionnée par la transmission depuis le début de mes
                  études. J&apos;ai créé A Rythme Ethic avec l&apos;envie de proposer un accompagnement à la fois
                  complet, humain et profondément personnalisé pour les jeunes de 11 à 25 ans.
                </Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.9">
                  Depuis mes débuts en tant que formatrice, mon objectif est de transmettre bien plus que des
                  connaissances : aider les jeunes à mieux se connaître, développer leur autonomie intellectuelle et
                  retrouver le plaisir d&apos;apprendre. J&apos;accorde une place essentielle à une approche ludique
                  et enthousiasmante, pour que la curiosité et la joie restent au cœur de chaque parcours.
                </Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.9">
                  Le lien humain a toujours été une grande source d&apos;inspiration pour moi. Aujourd&apos;hui, je
                  souhaite offrir aux jeunes cet espace de confiance et de soutien pour les accompagner dans les
                  étapes clés de leur vie.
                </Text>
                <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" lineHeight="1.9">
                  Je suis formatrice en matières techniques dans l&apos;enseignement supérieur et j&apos;anime
                  également des ateliers de compétences psychosociales, en individuel ou en groupe, pour les
                  particuliers, les établissements et les associations étudiantes.
                </Text>
              </Stack>
            </Flex>
          </FadeUp>
        </Container>
      </Box>

      {/* ── MATIÈRES ENSEIGNÉES ── */}
      <Box bg="sand.50" py={{ base: 16, md: 24 }}>
        <Container maxW="container.xl">
          <FadeUp>
            <Box textAlign="center" mb={10}>
              <Text
                fontSize="xs"
                fontWeight="700"
                color="accent.500"
                textTransform="uppercase"
                letterSpacing="widest"
                mb={3}
              >
                Mon offre
              </Text>
              <Heading
                as="h2"
                fontSize={{ base: '3xl', md: '4xl' }}
                color="brand.500"
                fontFamily="heading"
                mb={3}
              >
                Matières enseignées
              </Heading>
            </Box>
            <Flex flexWrap="wrap" gap={4} justify="center">
              {[
                { label: 'Mathématiques', icon: '📐' },
                { label: 'Dessin industriel', icon: '📏' },
                { label: 'Rhétorique', icon: '🗣️' },
                { label: 'Éducation financière', icon: '💰' },
                { label: 'Management de projets', icon: '📋' },
              ].map(m => (
                <Box
                  key={m.label}
                  bg="white"
                  borderRadius="xl"
                  px={6}
                  py={5}
                  boxShadow="sm"
                  border="1px solid"
                  borderColor="sand.200"
                  textAlign="center"
                  minW="160px"
                >
                  <Text fontSize="2xl">{m.icon}</Text>
                  <Text fontWeight="600" color="brand.500" mt={2}>{m.label}</Text>
                </Box>
              ))}
              {/* Ateliers */}
              <Box
                bg="white"
                borderRadius="xl"
                px={6}
                py={5}
                boxShadow="sm"
                border="1px solid"
                borderColor="sand.200"
                minW="220px"
                maxW="280px"
              >
                <Text fontSize="2xl" textAlign="center">🎯</Text>
                <Text fontWeight="600" color="brand.500" mt={2} textAlign="center">Ateliers</Text>
                <Stack spacing={1} mt={3}>
                  {['Connaissance de soi', 'Posture professionnelle', 'Communication professionnelle', 'Méthodologie de travail'].map(item => (
                    <Text key={item} fontSize="xs" color="brand.400">· {item}</Text>
                  ))}
                </Stack>
              </Box>
              {/* Et d'autres */}
              <Box
                bg="brand.50"
                borderRadius="xl"
                px={6}
                py={5}
                boxShadow="sm"
                border="1px solid"
                borderColor="brand.100"
                textAlign="center"
                minW="160px"
              >
                <Text fontSize="2xl">✉️</Text>
                <Text fontWeight="600" color="brand.500" mt={2}>Et d'autres…</Text>
                <Text fontSize="xs" color="brand.400" mt={1}>Me contacter pour en savoir plus</Text>
              </Box>
            </Flex>
          </FadeUp>
        </Container>
      </Box>

      {/* ── AVIS GOOGLE ── */}
      <Box bg="white" py={{ base: 16, md: 24 }}>
        <Container maxW="container.md">
          <FadeUp>
            <Stack spacing={10} align="center" textAlign="center">
              <Box>
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="accent.500"
                  textTransform="uppercase"
                  letterSpacing="widest"
                  mb={3}
                >
                  Ils témoignent
                </Text>
                <Heading
                  as="h2"
                  fontSize={{ base: '3xl', md: '4xl' }}
                  color="brand.500"
                  fontFamily="heading"
                >
                  Ils m'ont fait confiance
                </Heading>
              </Box>
              <ReviewsCarousel />
            </Stack>
          </FadeUp>
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
                  onClick={onOpen}
                >
                  Prendre contact
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
