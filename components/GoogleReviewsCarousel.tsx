'use client';

import { Box, Container, Flex, Heading, HStack, Stack, Text, IconButton } from '@chakra-ui/react';
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useEffect, useMemo, useState, useRef } from 'react';

interface Review {
  id: string;
  author_name: string;
  author_avatar_url: string | null;
  rating: number;
  comment: string;
  visited_at: string | null;
  relative_time: string | null;
}

function Stars({ n, size = 16 }: { n: number; size?: number }) {
  return (
    <HStack spacing={0.5}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FiStar
          key={i}
          fill={i < n ? '#f59e0b' : 'none'}
          color={i < n ? '#f59e0b' : '#d1d5db'}
          size={size}
        />
      ))}
    </HStack>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const colors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444'];
  const bg = colors[(name.charCodeAt(0) + name.length) % colors.length];

  if (url) {
    return (
      <Box
        as="img"
        src={url}
        alt={name}
        w="44px"
        h="44px"
        borderRadius="full"
        objectFit="cover"
      />
    );
  }
  return (
    <Flex
      w="44px"
      h="44px"
      borderRadius="full"
      bg={bg}
      color="white"
      fontWeight="700"
      align="center"
      justify="center"
      fontSize="lg"
      flexShrink={0}
    >
      {initial}
    </Flex>
  );
}

export function GoogleReviewsCarousel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    fetch('/api/google-reviews')
      .then(r => r.json())
      .then(data => {
        if (data.success) setReviews(data.reviews);
      })
      .finally(() => setLoading(false));
  }, []);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const next = () => setIndex(i => (i + 1) % Math.max(reviews.length, 1));
  const prev = () => setIndex(i => (i - 1 + reviews.length) % Math.max(reviews.length, 1));

  useEffect(() => {
    if (reviews.length <= 1) return;
    timerRef.current = setTimeout(() => next(), 6000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, reviews.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 40) prev();
    else if (dx < -40) next();
    touchStartX.current = null;
  };

  if (loading || reviews.length === 0) return null;

  const current = reviews[index];

  return (
    <Box bg="#faf6f2" py={{ base: 16, md: 24 }}>
      <Container maxW="container.xl">
        <Box textAlign="center" mb={{ base: 8, md: 10 }}>
          <Text
            fontSize="xs"
            fontWeight="700"
            color="accent.500"
            textTransform="uppercase"
            letterSpacing="widest"
            mb={3}
          >
            Avis Google
          </Text>
          <Heading
            as="h2"
            fontSize={{ base: '2xl', md: '3xl' }}
            color="brand.500"
            fontFamily="heading"
            mb={3}
          >
            Ce qu&apos;ils en disent
          </Heading>
          <HStack spacing={3} justify="center">
            <Stars n={Math.round(avg)} size={18} />
            <Text fontSize="md" color="brand.600" fontWeight="600">
              {avg.toFixed(1)} / 5
            </Text>
            <Text fontSize="sm" color="gray.500">
              ({reviews.length} avis)
            </Text>
          </HStack>
        </Box>

        <Box
          position="relative"
          maxW="700px"
          mx="auto"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Box
            bg="white"
            borderRadius="2xl"
            p={{ base: 6, md: 8 }}
            boxShadow="md"
            minH={{ base: '260px', md: '240px' }}
          >
            <Stack spacing={4}>
              <HStack spacing={3}>
                <Avatar name={current.author_name} url={current.author_avatar_url} />
                <Stack spacing={0}>
                  <Text fontWeight="700" color="brand.700">
                    {current.author_name}
                  </Text>
                  {current.relative_time && (
                    <Text fontSize="xs" color="gray.500">
                      {current.relative_time}
                    </Text>
                  )}
                </Stack>
              </HStack>
              <Stars n={current.rating} />
              <Text
                fontSize={{ base: 'sm', md: 'md' }}
                color="brand.600"
                lineHeight="1.7"
                whiteSpace="pre-wrap"
              >
                {current.comment}
              </Text>
              {current.visited_at && (
                <Text fontSize="xs" color="gray.500">
                  {current.visited_at}
                </Text>
              )}
            </Stack>
          </Box>

          {reviews.length > 1 && (
            <>
              <IconButton
                aria-label="Avis précédent"
                icon={<FiChevronLeft />}
                onClick={prev}
                position="absolute"
                top="50%"
                left={{ base: '-8px', md: '-50px' }}
                transform="translateY(-50%)"
                size="md"
                isRound
                bg="white"
                boxShadow="md"
                _hover={{ bg: 'sand.50' }}
              />
              <IconButton
                aria-label="Avis suivant"
                icon={<FiChevronRight />}
                onClick={next}
                position="absolute"
                top="50%"
                right={{ base: '-8px', md: '-50px' }}
                transform="translateY(-50%)"
                size="md"
                isRound
                bg="white"
                boxShadow="md"
                _hover={{ bg: 'sand.50' }}
              />
            </>
          )}

          <HStack spacing={2} justify="center" mt={5}>
            {reviews.map((_, i) => (
              <Box
                key={i}
                as="button"
                onClick={() => setIndex(i)}
                w={i === index ? '24px' : '8px'}
                h="8px"
                borderRadius="full"
                bg={i === index ? 'accent.500' : 'gray.300'}
                transition="all 0.2s"
                aria-label={`Avis ${i + 1}`}
              />
            ))}
          </HStack>
        </Box>
      </Container>
    </Box>
  );
}
