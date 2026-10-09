'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Box,
  Text,
  Icon,
  HStack,
  useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiUpload, FiFile } from 'react-icons/fi';
import { createClient } from '@/lib/supabase-client';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onSuccess: () => void;
}

// Upload direct depuis le navigateur avec la session admin (RLS is_admin() sur le bucket et
// la table documents) : pas de passage par une route API, donc pas de limite de 4,5 Mo Vercel.
export function AddDocumentModal({ isOpen, onClose, clientId, onSuccess }: AddDocumentModalProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleClose = () => {
    setTitle('');
    setFile(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const supabase = createClient();
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin';
    const storagePath = `clients/${clientId}/${crypto.randomUUID()}.${ext}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from('client-files')
        .upload(storagePath, file, { contentType: file.type || undefined, upsert: false });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from('documents').insert({
        client_id: clientId,
        title: title.trim() || file.name,
        kind: 'SUPPORTING_DOC',
        uploaded_by: 'ADMIN',
        storage_path: storagePath,
        original_filename: file.name,
      });
      if (insertError) {
        // Pas de fichier orphelin dans le bucket si la ligne n'a pas pu être créée
        await supabase.storage.from('client-files').remove([storagePath]);
        throw insertError;
      }

      toast({ title: 'Document ajouté', status: 'success', duration: 3000, isClosable: true });
      onSuccess();
      handleClose();
    } catch (err) {
      toast({
        title: "Erreur lors de l'ajout du document",
        description: err instanceof Error ? err.message : undefined,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          Ajouter un document
        </ModalHeader>
        <ModalCloseButton color="brand.500" />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>Titre</FormLabel>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={file?.name || 'Ex : Bilan orthophonique'}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Fichier</FormLabel>
              <Box
                as="label"
                htmlFor="add-document-file"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                p={6}
                border="2px dashed"
                borderColor={file ? 'green.300' : 'gray.300'}
                bg={file ? 'green.50' : undefined}
                borderRadius="lg"
                cursor="pointer"
                _hover={{ borderColor: 'accent.500', bg: 'gray.50' }}
                transition="all 0.2s"
              >
                {file ? (
                  <HStack spacing={2}>
                    <Icon as={FiFile} color="green.500" />
                    <Text fontSize="sm" color="green.700" noOfLines={1}>
                      {file.name}
                    </Text>
                  </HStack>
                ) : (
                  <>
                    <Icon as={FiUpload} boxSize={8} color="gray.400" mb={2} />
                    <Text color="gray.500" fontSize="sm">
                      Cliquez pour sélectionner un fichier
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                      PDF, images, Word, Excel, PowerPoint
                    </Text>
                  </>
                )}
                <Input
                  id="add-document-file"
                  type="file"
                  accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  display="none"
                />
              </Box>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose} color="brand.500">
            Annuler
          </Button>
          <Button
            colorScheme="accent"
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Envoi..."
            isDisabled={!file}
          >
            Ajouter
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
