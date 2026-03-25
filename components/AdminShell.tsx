'use client';

import {
  Box,
  Flex,
  HStack,
  VStack,
  Text,
  Button,
  Image,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';

const SIDEBAR_W = '220px';

const navItems = [{ label: 'Contacts', href: '/admin/clients' }];

function NavLinks({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <VStack spacing={1} align="stretch" pt={3} px={2}>
      {navItems.map(item => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onClose}>
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
  );
}

function SidebarLogo() {
  return (
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
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const supabase = createClient();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Erreur de déconnexion', status: 'error', duration: 3000 });
    } else {
      router.push('/admin/login');
    }
  };

  return (
    <Flex minH="100vh" maxW="100vw" overflow="hidden">
      {/* ── Sidebar — desktop only ── */}
      <Box
        display={{ base: 'none', md: 'flex' }}
        w={SIDEBAR_W}
        minW={SIDEBAR_W}
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        flexDirection="column"
        zIndex={100}
      >
        <SidebarLogo />
        <NavLinks pathname={pathname} />
      </Box>

      {/* ── Mobile drawer ── */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerBody px={0} pt={0}>
            {/* Drawer header : logo + close button côte à côte */}
            <HStack
              px={4}
              py={4}
              borderBottom="1px solid"
              borderColor="gray.100"
              justify="space-between"
            >
              <HStack spacing={3}>
                <Image src="/logo.jpg" alt="A Rythme Ethic" h="32px" borderRadius="md" />
                <Text fontSize="sm" fontWeight="700" color="brand.500" fontFamily="heading">
                  A Rythme Ethic
                </Text>
              </HStack>
              <IconButton
                aria-label="Fermer le menu"
                icon={<Text fontSize="lg" lineHeight={1}>✕</Text>}
                variant="ghost"
                size="sm"
                onClick={onClose}
                color="gray.400"
                _hover={{ color: 'gray.700', bg: 'gray.100' }}
              />
            </HStack>

            <NavLinks pathname={pathname} onClose={onClose} />

            <Box px={4} pt={4} borderTop="1px solid" borderColor="gray.100" mt={4}>
              <Button
                w="full"
                size="sm"
                variant="ghost"
                onClick={() => { onClose(); handleLogout(); }}
                color="gray.500"
                justifyContent="flex-start"
              >
                Déconnexion
              </Button>
            </Box>
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── Main area ── */}
      <Box ml={{ base: 0, md: SIDEBAR_W }} flex={1} minH="100vh" bg="#fafafa" minW={0} overflow="hidden">
        {/* Top bar */}
        <Box
          bg="white"
          borderBottom="1px solid"
          borderColor="gray.200"
          px={{ base: 4, md: 6 }}
          py={3}
          position="sticky"
          top={0}
          zIndex={99}
        >
          <HStack justify="space-between">
            {/* Burger — mobile only */}
            <IconButton
              display={{ base: 'flex', md: 'none' }}
              aria-label="Menu"
              icon={
                <Box>
                  <Box w="18px" h="2px" bg="gray.600" mb="4px" borderRadius="full" />
                  <Box w="18px" h="2px" bg="gray.600" mb="4px" borderRadius="full" />
                  <Box w="18px" h="2px" bg="gray.600" borderRadius="full" />
                </Box>
              }
              variant="ghost"
              onClick={onOpen}
              size="sm"
            />

            {/* Logo — mobile only (center) */}
            <HStack
              display={{ base: 'flex', md: 'none' }}
              spacing={2}
              position="absolute"
              left="50%"
              transform="translateX(-50%)"
            >
              <Image src="/logo.jpg" alt="A Rythme Ethic" h="28px" borderRadius="md" />
              <Text fontSize="sm" fontWeight="700" color="brand.500" fontFamily="heading">
                A Rythme Ethic
              </Text>
            </HStack>

            {/* Spacer on mobile to push Déconnexion right */}
            <Box display={{ base: 'block', md: 'none' }} flex={1} />

            {/* Déconnexion — desktop */}
            <Button
              display={{ base: 'none', md: 'flex' }}
              size="sm"
              variant="ghost"
              onClick={handleLogout}
              color="gray.500"
              _hover={{ bg: 'gray.50', color: 'brand.600' }}
              ml="auto"
            >
              Déconnexion
            </Button>
          </HStack>
        </Box>

        {/* Page content */}
        <Box p={{ base: 4, md: 8 }}>{children}</Box>
      </Box>
    </Flex>
  );
}
