'use client';

import { Heading, SimpleGrid, Card, CardBody, Stack, Text, Button, HStack } from '@chakra-ui/react';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();

  // Redirect to clients page (dashboard removed for simplicity)
  useEffect(() => {
    router.push('/admin/clients');
  }, [router]);

  return null;
}
