'use client';

import { Badge, Box, Flex, HStack, Icon, IconButton, Link, Stack, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import type { IconType } from 'react-icons';
import {
  FiClock,
  FiEdit3,
  FiMail,
  FiMessageSquare,
  FiMic,
  FiMoreHorizontal,
  FiPhone,
  FiUsers,
} from 'react-icons/fi';
import type { ContactCanal, ContactLog } from '@/types';
import { formatDateTime, formatMinutes } from '@/lib/format';

export const CANAL_ICONS: Record<ContactCanal, IconType> = {
  Appel: FiPhone,
  SMS: FiMessageSquare,
  'Message vocal': FiMic,
  Email: FiMail,
  'Rendez-vous': FiUsers,
  Autre: FiMoreHorizontal,
};
export const CANAUX = Object.keys(CANAL_ICONS) as ContactCanal[];

// ponytail: seuil en dur et affichage seul (aucune facturation) ; à passer dans settings si besoin.
export const SEUIL_TEMPS_ADMIN_MIN = 30;

// 'YYYY-MM' local d'un horodatage
export const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Un rappel « à recontacter » reste en attente tant qu'aucune prise de contact plus récente
// n'existe pour ce contact : la suivante le solde (pas de case « fait »). `logs` = TOUT
// l'historique des contacts concernés, pas une liste filtrée.
export function pendingReminders(logs: ContactLog[]): Set<string> {
  const latest = new Map<string, number>();
  for (const l of logs) {
    const t = Date.parse(l.contacted_at);
    if (t > (latest.get(l.client_id) ?? -Infinity)) latest.set(l.client_id, t);
  }
  return new Set(
    logs
      .filter(l => l.a_recontacter_le && Date.parse(l.contacted_at) === latest.get(l.client_id))
      .map(l => l.id)
  );
}

interface ContactTimelineProps {
  logs: ContactLog[];
  pending: Set<string>;
  // Onglet global : nom du contact + lien vers sa fiche
  clientNames?: Record<string, string>;
  // Box de la fiche : une seule colonne, même sur grand écran
  compact?: boolean;
  onEdit: (log: ContactLog) => void;
}

export function ContactTimeline({
  logs,
  pending,
  clientNames,
  compact,
  onEdit,
}: ContactTimelineProps) {
  // Grand écran : ligne centrale et cartes en alternance ; mobile/tablette (ou compact) : une colonne.
  const r = <T,>(base: T, lg: T) => (compact ? base : { base, lg });
  const lineX = r('18px', '50%');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <Box position="relative">
      <Box position="absolute" top={0} bottom={0} left={lineX} w="2px" ml="-1px" bg="brand.200" />
      <Stack spacing={4}>
        {logs.map((l, i) => {
          const rappel =
            pending.has(l.id) && l.a_recontacter_le ? new Date(l.a_recontacter_le) : null;
          const CanalIcon = CANAL_ICONS[l.canal] ?? FiMoreHorizontal;
          return (
            <Flex
              key={l.id}
              position="relative"
              justify={r('flex-end', i % 2 ? 'flex-end' : 'flex-start')}
            >
              <Flex
                position="absolute"
                left={lineX}
                top={3}
                ml="-18px"
                boxSize="36px"
                borderRadius="full"
                bg="brand.700"
                color="white"
                align="center"
                justify="center"
                zIndex={1}
              >
                <Icon as={CanalIcon} />
              </Flex>
              <Box
                w={r('calc(100% - 52px)', 'calc(50% - 32px)')}
                bg="white"
                border="1px solid"
                borderColor="sand.200"
                borderRadius="md"
                shadow="sm"
                p={compact ? 3 : 4}
              >
                <HStack justify="space-between" align="flex-start" spacing={2}>
                  <Box minW={0}>
                    <HStack spacing={2} color="brand.600" fontWeight="600" flexWrap="wrap">
                      <Icon as={CanalIcon} />
                      <Text>{l.canal}</Text>
                      {clientNames && (
                        <Link
                          as={NextLink}
                          href={`/admin/clients/${l.client_id}`}
                          color="accent.600"
                          overflowWrap="anywhere"
                        >
                          {clientNames[l.client_id] ?? 'Contact'}
                        </Link>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.500">
                      {formatDateTime(l.contacted_at)}
                      {l.duree_minutes > 0 && ` · ${formatMinutes(l.duree_minutes)}`}
                    </Text>
                  </Box>
                  <IconButton
                    aria-label="Modifier la prise de contact"
                    icon={<FiEdit3 />}
                    size="xs"
                    variant="ghost"
                    onClick={() => onEdit(l)}
                  />
                </HStack>
                {l.notes && (
                  <Text fontSize="sm" mt={2} whiteSpace="pre-wrap" overflowWrap="anywhere">
                    {l.notes}
                  </Text>
                )}
                {rappel && (
                  <Badge
                    mt={2}
                    colorScheme={rappel < today ? 'red' : 'orange'}
                    display="inline-flex"
                    alignItems="center"
                    gap={1}
                  >
                    <Icon as={FiClock} />À recontacter le {rappel.toLocaleDateString('fr-FR')}
                  </Badge>
                )}
              </Box>
            </Flex>
          );
        })}
      </Stack>
    </Box>
  );
}
