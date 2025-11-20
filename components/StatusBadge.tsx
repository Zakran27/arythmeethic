'use client';

import { Badge } from '@chakra-ui/react';
import { ProcStatus } from '@/types';

const statusConfig: Record<ProcStatus, { bg: string; color: string }> = {
  DRAFT: { bg: 'grey.200', color: 'brand.600' },
  PDF_GENERATED: { bg: 'accent.100', color: 'accent.700' },
  SIGN_REQUESTED: { bg: 'terracotta.100', color: 'terracotta.700' },
  SIGNED: { bg: 'green.100', color: 'green.700' },
  REFUSED: { bg: 'red.100', color: 'red.700' },
  EXPIRED: { bg: 'red.100', color: 'red.700' },
  CLOSED: { bg: 'grey.200', color: 'brand.600' },
};

export function StatusBadge({ status }: { status: ProcStatus }) {
  const config = statusConfig[status];
  return (
    <Badge bg={config.bg} color={config.color} fontSize="sm" px={3} py={1} borderRadius="md">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
