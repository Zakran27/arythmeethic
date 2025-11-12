'use client';

import { Badge } from '@chakra-ui/react';
import { ProcStatus } from '@/types';

const statusColors: Record<ProcStatus, string> = {
  DRAFT: 'gray',
  PDF_GENERATED: 'blue',
  SIGN_REQUESTED: 'orange',
  SIGNED: 'green',
  REFUSED: 'red',
  EXPIRED: 'red',
  CLOSED: 'gray',
};

export function StatusBadge({ status }: { status: ProcStatus }) {
  return (
    <Badge colorScheme={statusColors[status]} fontSize="sm">
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
