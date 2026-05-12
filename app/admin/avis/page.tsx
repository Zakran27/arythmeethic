'use client';

import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  NumberInput,
  NumberInputField,
  Switch,
  IconButton,
  useDisclosure,
  useToast,
  Badge,
  Spinner,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2, FiPlus, FiStar } from 'react-icons/fi';
import { useEffect, useState } from 'react';

interface Review {
  id: string;
  author_name: string;
  author_avatar_url: string | null;
  rating: number;
  comment: string;
  visited_at: string | null;
  relative_time: string | null;
  google_review_id: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

interface FormState {
  author_name: string;
  author_avatar_url: string;
  rating: number;
  comment: string;
  visited_at: string;
  relative_time: string;
  google_review_id: string;
  display_order: number;
  is_published: boolean;
}

const emptyForm: FormState = {
  author_name: '',
  author_avatar_url: '',
  rating: 5,
  comment: '',
  visited_at: '',
  relative_time: '',
  google_review_id: '',
  display_order: 0,
  is_published: true,
};

export default function AvisPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google-reviews?all=1');
      const data = await res.json();
      if (data.success) setReviews(data.reviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    onOpen();
  };

  const openEdit = (r: Review) => {
    setEditing(r);
    setForm({
      author_name: r.author_name,
      author_avatar_url: r.author_avatar_url ?? '',
      rating: r.rating,
      comment: r.comment,
      visited_at: r.visited_at ?? '',
      relative_time: r.relative_time ?? '',
      google_review_id: r.google_review_id ?? '',
      display_order: r.display_order,
      is_published: r.is_published,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.author_name.trim() || !form.comment.trim()) {
      toast({ title: 'Auteur et commentaire requis', status: 'warning', duration: 2500 });
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PATCH' : 'POST';
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch('/api/google-reviews', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({ title: editing ? 'Avis modifié' : 'Avis ajouté', status: 'success', duration: 2000 });
      onClose();
      fetchReviews();
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet avis ?')) return;
    const res = await fetch(`/api/google-reviews?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      toast({ title: 'Avis supprimé', status: 'success', duration: 2000 });
      fetchReviews();
    }
  };

  const togglePublished = async (r: Review) => {
    const res = await fetch('/api/google-reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, is_published: !r.is_published }),
    });
    if ((await res.json()).success) fetchReviews();
  };

  const renderStars = (n: number) => (
    <HStack spacing={0.5}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FiStar
          key={i}
          fill={i < n ? '#f59e0b' : 'none'}
          color={i < n ? '#f59e0b' : '#d1d5db'}
          size={14}
        />
      ))}
    </HStack>
  );

  return (
    <Stack spacing={6}>
      <Stack
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        spacing={3}
      >
        <Box>
          <Heading color="brand.500" fontFamily="heading">
            Avis Google
          </Heading>
          <Text fontSize="sm" color="gray.500" mt={1}>
            Avis collés manuellement depuis la fiche Google de Florence.
          </Text>
        </Box>
        <Button colorScheme="accent" leftIcon={<FiPlus />} onClick={openCreate}>
          Ajouter un avis
        </Button>
      </Stack>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner />
        </Box>
      ) : reviews.length === 0 ? (
        <Card>
          <CardBody>
            <Text textAlign="center" color="gray.500" py={6}>
              Aucun avis pour le moment.
            </Text>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Desktop : tableau */}
          <Box display={{ base: 'none', md: 'block' }} bg="white" borderRadius="md" overflow="hidden">
            <Table size="sm">
              <Thead bg="gray.50">
                <Tr>
                  <Th>Ordre</Th>
                  <Th>Auteur</Th>
                  <Th>Note</Th>
                  <Th>Commentaire</Th>
                  <Th>Publié</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {reviews.map(r => (
                  <Tr key={r.id}>
                    <Td>{r.display_order}</Td>
                    <Td fontWeight="600">{r.author_name}</Td>
                    <Td>{renderStars(r.rating)}</Td>
                    <Td maxW="400px">
                      <Text noOfLines={2} fontSize="sm">
                        {r.comment}
                      </Text>
                    </Td>
                    <Td>
                      <Switch
                        size="sm"
                        isChecked={r.is_published}
                        onChange={() => togglePublished(r)}
                      />
                    </Td>
                    <Td>
                      <HStack spacing={1}>
                        <IconButton
                          aria-label="Éditer"
                          icon={<FiEdit2 />}
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(r)}
                        />
                        <IconButton
                          aria-label="Supprimer"
                          icon={<FiTrash2 />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleDelete(r.id)}
                        />
                      </HStack>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {/* Mobile : cards */}
          <Stack spacing={3} display={{ base: 'flex', md: 'none' }}>
            {reviews.map(r => (
              <Card key={r.id}>
                <CardBody>
                  <Stack spacing={2}>
                    <HStack justify="space-between">
                      <Text fontWeight="600">{r.author_name}</Text>
                      <Badge colorScheme={r.is_published ? 'green' : 'gray'}>
                        {r.is_published ? 'Publié' : 'Masqué'}
                      </Badge>
                    </HStack>
                    {renderStars(r.rating)}
                    <Text fontSize="sm" color="gray.700" noOfLines={3}>
                      {r.comment}
                    </Text>
                    <HStack spacing={2}>
                      <Button size="xs" leftIcon={<FiEdit2 />} onClick={() => openEdit(r)}>
                        Éditer
                      </Button>
                      <Button
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        leftIcon={<FiTrash2 />}
                        onClick={() => handleDelete(r.id)}
                      >
                        Supprimer
                      </Button>
                    </HStack>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </Stack>
        </>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            {editing ? 'Modifier un avis' : 'Ajouter un avis'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Auteur</FormLabel>
                <Input
                  value={form.author_name}
                  onChange={e => setForm({ ...form, author_name: e.target.value })}
                  placeholder="Marie D."
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Note (1-5)</FormLabel>
                <NumberInput
                  min={1}
                  max={5}
                  value={form.rating}
                  onChange={(_, n) => setForm({ ...form, rating: isNaN(n) ? 5 : n })}
                >
                  <NumberInputField />
                </NumberInput>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Commentaire</FormLabel>
                <Textarea
                  value={form.comment}
                  onChange={e => setForm({ ...form, comment: e.target.value })}
                  rows={5}
                  placeholder="Florence est une professeure formidable…"
                />
              </FormControl>

              <HStack spacing={3} align="start">
                <FormControl>
                  <FormLabel fontSize="sm">Période de visite</FormLabel>
                  <Input
                    size="sm"
                    value={form.visited_at}
                    onChange={e => setForm({ ...form, visited_at: e.target.value })}
                    placeholder="Visité en février"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Il y a…</FormLabel>
                  <Input
                    size="sm"
                    value={form.relative_time}
                    onChange={e => setForm({ ...form, relative_time: e.target.value })}
                    placeholder="il y a 2 mois"
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontSize="sm">URL avatar (optionnel)</FormLabel>
                <Input
                  size="sm"
                  value={form.author_avatar_url}
                  onChange={e => setForm({ ...form, author_avatar_url: e.target.value })}
                  placeholder="https://..."
                />
              </FormControl>

              <HStack spacing={3}>
                <FormControl>
                  <FormLabel fontSize="sm">Ordre d&apos;affichage</FormLabel>
                  <NumberInput
                    size="sm"
                    value={form.display_order}
                    onChange={(_, n) => setForm({ ...form, display_order: isNaN(n) ? 0 : n })}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl display="flex" alignItems="center">
                  <FormLabel fontSize="sm" mb={0}>
                    Publié
                  </FormLabel>
                  <Switch
                    isChecked={form.is_published}
                    onChange={e => setForm({ ...form, is_published: e.target.checked })}
                  />
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel fontSize="sm">ID Google (optionnel, pour éviter les doublons)</FormLabel>
                <Input
                  size="sm"
                  value={form.google_review_id}
                  onChange={e => setForm({ ...form, google_review_id: e.target.value })}
                  placeholder="ChdDSUhNMG9nS0VJQ0FnSUR..."
                />
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Annuler
            </Button>
            <Button colorScheme="accent" onClick={handleSave} isLoading={saving}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Stack>
  );
}
