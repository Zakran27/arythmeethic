'use client';

import { Box, Container, Button, HStack, useToast } from '@chakra-ui/react';
import { Nav } from './Nav';
import { createClient } from '@/lib/supabase-client';
import { useRouter } from 'next/navigation';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: 'Erreur de déconnexion',
        status: 'error',
        duration: 3000,
      });
    } else {
      router.push('/admin/login');
    }
  };

  return (
    <Box minH="100vh">
      <Nav isAdmin />
      <Box bg="gray.50" borderBottom="1px" borderColor="gray.200" py={2}>
        <Container maxW="container.xl">
          <HStack justify="flex-end">
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              Déconnexion
            </Button>
          </HStack>
        </Container>
      </Box>
      <Container maxW="container.xl" py={8}>
        {children}
      </Container>
    </Box>
  );
}
