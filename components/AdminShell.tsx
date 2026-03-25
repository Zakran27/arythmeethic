'use client';

import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Image,
  useToast,
} from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const SIDEBAR_W = '220px';

const navItems = [{ label: 'Contacts', href: '/admin/clients' }];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const supabase = createClient();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Erreur de déconnexion', status: 'error', duration: 3000 });
    } else {
      router.push('/admin/login');
    }
  };

  return (
    <Flex minH="100vh">
      {/* ── Sidebar ── */}
      <Box
        w={SIDEBAR_W}
        minW={SIDEBAR_W}
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        display="flex"
        flexDirection="column"
        zIndex={100}
      >
        {/* Logo */}
        <Box px={4} py={5} borderBottom="1px solid" borderColor="gray.100">
          <Link href="/">
            <HStack spacing={3} cursor="pointer" _hover={{ opacity: 0.8 }} transition="opacity 0.2s">
              <Image src="/logo.jpg" alt="A Rythme Ethic" h="36px" borderRadius="md" />
              <Text fontSize="sm" fontWeight="700" color="brand.500" fontFamily="heading" lineHeight="1.2">
                A Rythme Ethic
              </Text>
            </HStack>
          </Link>
        </Box>

        {/* Nav items */}
        <VStack spacing={1} align="stretch" pt={3} px={2} flex={1}>
          {navItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Box
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={isActive ? 'brand.50' : 'transparent'}
                  color={isActive ? 'brand.600' : 'gray.600'}
                  fontWeight={isActive ? '600' : '400'}
                  fontSize="sm"
                  _hover={{ bg: isActive ? 'brand.50' : 'gray.50', color: 'brand.600' }}
                  transition="all 0.15s"
                  cursor="pointer"
                >
                  {item.label}
                </Box>
              </Link>
            );
          })}
        </VStack>
      </Box>

      {/* ── Main area ── */}
      <Box ml={SIDEBAR_W} flex={1} minH="100vh" bg="#fafafa">
        {/* Top bar */}
        <Box
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          px={6}
          py={3}
          position="sticky"
          top={0}
          zIndex={99}
        >
          <HStack justify="flex-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              color="gray.500"
              _hover={{ bg: 'gray.50', color: 'brand.600' }}
            >
              Déconnexion
            </Button>
          </HStack>
        </Box>

        {/* Page content */}
        <Box p={8}>{children}</Box>
      </Box>
    </Flex>
  );
}
