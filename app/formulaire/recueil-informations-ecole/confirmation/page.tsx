'use client';

import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Card,
  CardBody,
  Image,
  Icon,
} from '@chakra-ui/react';
import { FiCheckCircle } from 'react-icons/fi';

export default function ConfirmationEcolePage() {
  return (
    <Box bg="#fafafa" minH="100vh" py={8}>
      <Container maxW="container.md">
        <Stack spacing={6}>
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Image
              src="/logo.jpg"
              alt="A Rythme Ethic"
              maxH="80px"
              mx="auto"
              borderRadius="xl"
              boxShadow="sm"
              mb={4}
            />
          </Box>

          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={6} textAlign="center" py={8}>
                <Icon
                  as={FiCheckCircle}
                  boxSize={16}
                  color="green.500"
                  mx="auto"
                />
                <Heading as="h1" size="xl" color="brand.500" fontFamily="heading">
                  Merci !
                </Heading>
                <Text fontSize="lg" color="brand.600">
                  Vos informations ont bien été enregistrées.
                </Text>
                <Text color="brand.600">
                  Je reviendrai vers vous très prochainement pour vous
                  transmettre une proposition tarifaire et organiser la suite.
                </Text>
                <Box pt={4}>
                  <Text fontSize="sm" color="gray.500">
                    Vous pouvez fermer cette page.
                  </Text>
                </Box>
              </Stack>
            </CardBody>
          </Card>

          {/* Contact info */}
          <Box textAlign="center" pt={4}>
            <Text fontSize="sm" color="brand.600">
              Une question ? Contactez-nous à{' '}
              <Text as="span" color="accent.500">
                Florence.LOUAZEL@arythmeethic.onmicrosoft.com
              </Text>
            </Text>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
