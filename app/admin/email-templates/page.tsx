'use client';

import {
  Box,
  Heading,
  Stack,
  Text,
  HStack,
  Badge,
  Card,
  CardBody,
  Spinner,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-client';
import { EMAIL_TEMPLATES } from '@/lib/email-templates';

export default function EmailTemplatesPage() {
  const [customKeys, setCustomKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('email_templates')
      .select('key, html')
      .then(({ data }) => {
        const keys = new Set(
          (data ?? []).filter(r => r.html && r.html.trim()).map(r => r.key as string)
        );
        setCustomKeys(keys);
        setLoading(false);
      });
  }, []);

  return (
    <Stack spacing={6}>
      <Box>
        <Heading color="brand.500" fontFamily="heading">
          Templates emails
        </Heading>
        <Text color="gray.600" fontSize="sm" mt={1}>
          Personnalisez le contenu des emails envoyés. Tant qu’un email n’est pas personnalisé, sa
          version par défaut est utilisée.
        </Text>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : (
        <Stack spacing={3}>
          {EMAIL_TEMPLATES.map(t => {
            const isCustom = customKeys.has(t.key);
            const content = (
              <Card
                bg="white"
                shadow="sm"
                _hover={t.wired ? { shadow: 'md', borderColor: 'brand.200' } : undefined}
                border="1px solid"
                borderColor="gray.100"
                cursor={t.wired ? 'pointer' : 'default'}
                opacity={t.wired ? 1 : 0.6}
                transition="all 0.15s"
              >
                <CardBody>
                  <HStack justify="space-between" align="start" spacing={4}>
                    <Box>
                      <Text fontWeight="600" color="brand.600">
                        {t.name}
                      </Text>
                      <Text fontSize="sm" color="gray.500" mt={1}>
                        {t.description}
                      </Text>
                    </Box>
                    <HStack flexShrink={0}>
                      {!t.wired ? (
                        <Badge colorScheme="gray">Bientôt</Badge>
                      ) : isCustom ? (
                        <Badge colorScheme="green">Personnalisé</Badge>
                      ) : (
                        <Badge colorScheme="blue">Par défaut</Badge>
                      )}
                    </HStack>
                  </HStack>
                </CardBody>
              </Card>
            );

            return t.wired ? (
              <Link key={t.key} href={`/admin/email-templates/${t.key}`}>
                {content}
              </Link>
            ) : (
              <Box key={t.key}>{content}</Box>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
