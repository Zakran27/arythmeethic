import type { Metadata } from 'next';
import { Box, Container, Heading, Stack, Text, Card, CardBody, HStack, Badge, Flex, Button } from '@chakra-ui/react';
import { Nav } from '@/components/Nav';
import { createServiceRoleClient } from '@/lib/supabase-server';
import Link from 'next/link';

export const revalidate = 600; // 10 min

export const metadata: Metadata = {
  title: 'A Rythme Ethic se forme pour mieux vous accompagner',
  description:
    'Florence Louazel se forme continuellement pour offrir un accompagnement de qualité aux jeunes de 11 à 25 ans. Découvrez les formations et conférences suivies.',
};

async function getFormations() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('formations')
      .select('id, titre, contenu, annee, display_order')
      .eq('is_published', true)
      .order('display_order', { ascending: false })
      .order('annee', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('formations fetch error', e);
    return [];
  }
}

export default async function FormationsPage() {
  const formations = await getFormations();

  return (
    <>
      <Nav />
      <Box bg="#faf6f2" minH="100vh" py={{ base: 12, md: 20 }}>
        <Container maxW="container.lg">
          <Stack spacing={10}>
            <Box textAlign="center">
              <Text
                fontSize="xs"
                fontWeight="700"
                color="accent.500"
                textTransform="uppercase"
                letterSpacing="widest"
                mb={3}
              >
                Mon parcours
              </Text>
              <Heading
                as="h1"
                fontSize={{ base: '2xl', md: '4xl' }}
                color="brand.500"
                fontFamily="heading"
                mb={4}
                lineHeight="1.2"
              >
                A Rythme Ethic se forme pour mieux vous accompagner
              </Heading>
              <Text fontSize={{ base: 'md', md: 'lg' }} color="brand.600" maxW="700px" mx="auto" lineHeight="1.7">
                Parce qu&apos;accompagner des jeunes demande de constamment se remettre en question et
                d&apos;élargir ses compétences, je me forme régulièrement pour vous offrir un suivi
                toujours plus pertinent et bienveillant.
              </Text>
            </Box>

            {formations.length === 0 ? (
              <Card bg="white">
                <CardBody py={10} textAlign="center">
                  <Text color="brand.500">Les formations seront bientôt en ligne.</Text>
                </CardBody>
              </Card>
            ) : (
              <Stack spacing={5}>
                {formations.map(f => (
                  <Card
                    key={f.id}
                    bg="white"
                    borderRadius="2xl"
                    boxShadow="md"
                    border="1px solid"
                    borderColor="sand.200"
                    _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)' }}
                    transition="all 0.2s"
                  >
                    <CardBody p={{ base: 6, md: 8 }}>
                      <HStack justify="space-between" align="start" mb={3} flexWrap="wrap">
                        <Heading
                          size="md"
                          color="brand.500"
                          fontFamily="heading"
                          flex={1}
                          minW="0"
                        >
                          {f.titre}
                        </Heading>
                        <Badge
                          colorScheme="brand"
                          bg="sand.200"
                          color="brand.700"
                          fontSize="sm"
                          px={3}
                          py={1}
                          borderRadius="full"
                        >
                          {f.annee}
                        </Badge>
                      </HStack>
                      <Text
                        color="brand.600"
                        lineHeight="1.8"
                        fontSize={{ base: 'sm', md: 'md' }}
                        whiteSpace="pre-wrap"
                      >
                        {f.contenu}
                      </Text>
                    </CardBody>
                  </Card>
                ))}
              </Stack>
            )}

            <Flex justify="center" pt={4}>
              <Link href="/">
                <Button colorScheme="accent" variant="outline" size="lg">
                  ← Retour à l&apos;accueil
                </Button>
              </Link>
            </Flex>
          </Stack>
        </Container>
      </Box>
    </>
  );
}
