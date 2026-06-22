'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  useDisclosure,
} from '@chakra-ui/react';
import { createClient } from '@/lib/supabase-client';

interface SiteMessage {
  key: string;
  enabled: boolean;
  message: string;
}

// Bandeau fixe (sticky en haut, texte centré) + popup central, pilotés depuis /admin/bandeaux.
// Ne rend rien tant que les messages ne sont pas activés.
export function SiteMessages() {
  const [banner, setBanner] = useState<SiteMessage | null>(null);
  const [popup, setPopup] = useState<SiteMessage | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('site_messages')
      .select('key, enabled, message')
      .then(({ data }) => {
        const b = (data ?? []).find(m => m.key === 'banner');
        const p = (data ?? []).find(m => m.key === 'popup');
        if (b && b.enabled && b.message?.trim()) setBanner(b);
        if (p && p.enabled && p.message?.trim()) {
          setPopup(p);
          if (!sessionStorage.getItem('arythme_popup_dismissed')) onOpen();
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closePopup = () => {
    try {
      sessionStorage.setItem('arythme_popup_dismissed', '1');
    } catch {
      /* sessionStorage indisponible : on ferme quand même */
    }
    onClose();
  };

  return (
    <>
      {banner && (
        <Box
          position="sticky"
          top={0}
          zIndex={2000}
          bg="#f6ede2"
          color="#6e3a25"
          borderBottom="1px solid #e2cbb8"
          py={2.5}
          px={4}
          textAlign="center"
          aria-label="Information importante"
        >
          <Text fontSize="sm" fontWeight="500" maxW="container.lg" mx="auto">
            {banner.message}
          </Text>
        </Box>
      )}

      {popup && (
        <Modal isOpen={isOpen} onClose={closePopup} isCentered size="lg">
          <ModalOverlay />
          <ModalContent mx={4}>
            <ModalHeader color="brand.500" fontFamily="heading">
              Information
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Text color="gray.700" fontSize="md" lineHeight="1.7">
                {popup.message}
              </Text>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="accent" onClick={closePopup}>
                J&apos;ai compris
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </>
  );
}
