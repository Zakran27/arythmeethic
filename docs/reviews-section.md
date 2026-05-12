# Section Avis - Documentation

## Emplacement dans la page

Dans `app/page.tsx`, la section s'insère entre la section **À propos** et la section **CTA** (bouton "Prêt(e) à commencer ?").

## Code complet à remettre en place

### 1. Tableau de données (à placer avant les fonctions, après `FadeUp`)

```tsx
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
```

### 2. Composant `StarRating`

```tsx
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
```

### 3. Composant `ReviewsCarousel`

```tsx
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
```

### 4. Section JSX (à insérer entre la section À propos et la section CTA)

```tsx
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
```

## Structure d'un avis

Chaque avis dans `REVIEWS` a cette forme :

```ts
{
  name: string;   // Prénom + initiale du nom, ex: "Isabelle M."
  note: number;   // Note sur 5, ex: 5
  text: string;   // Texte du témoignage
}
```

## Comportement du carrousel

- Défilement automatique toutes les **5 secondes**
- Navigation manuelle via boutons **‹ ›** (positionnés en absolu sur les côtés)
- **Points de navigation** en bas : le point actif est plus large (20px vs 8px) et coloré en `brand.500`
- Animation **slide** avec Framer Motion : entrée/sortie à ±40px en X, durée 0.4s, easing `easeInOut`
- La direction (gauche/droite) s'inverse selon le sens de navigation

## Dépendances requises

Ces imports doivent être présents dans `app/page.tsx` :

```tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Button, Container, Heading, HStack, Stack, Text } from '@chakra-ui/react';
```

(Tous déjà présents dans le fichier.)
