'use client';

import {
  Box,
  Button,
  Heading,
  HStack,
  Stack,
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
import { FiTrash2, FiDownload } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/DataTable';

interface Formation {
  id: string;
  titre: string;
  contenu: string;
  annee: string;
  duree: string | null;
  display_order: number;
  is_published: boolean;
  created_at: string;
}

interface FormState {
  titre: string;
  contenu: string;
  annee: string;
  duree: string;
  display_order: number;
  is_published: boolean;
}

const emptyForm: FormState = {
  titre: '',
  contenu: '',
  annee: String(new Date().getFullYear()),
  duree: '',
  display_order: 0,
  is_published: true,
};

export default function FormationsAdminPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Formation | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchFormations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/formations?all=1');
      const data = await res.json();
      if (data.success) setFormations(data.formations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormations();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    onOpen();
  };

  const openEdit = (f: Formation) => {
    setEditing(f);
    setForm({
      titre: f.titre,
      contenu: f.contenu,
      annee: f.annee,
      duree: f.duree ?? '',
      display_order: f.display_order,
      is_published: f.is_published,
    });
    onOpen();
  };

  const handleSave = async () => {
    if (!form.titre.trim() || !form.contenu.trim() || !form.annee.trim()) {
      toast({ title: 'Tous les champs requis', status: 'warning', duration: 2500 });
      return;
    }
    setSaving(true);
    try {
      const method = editing ? 'PATCH' : 'POST';
      const body = editing ? { id: editing.id, ...form } : form;
      const res = await fetch('/api/formations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast({
        title: editing ? 'Formation modifiée' : 'Formation ajoutée',
        status: 'success',
        duration: 2000,
      });
      onClose();
      fetchFormations();
    } catch (e) {
      toast({ title: 'Erreur', description: String(e), status: 'error', duration: 3000 });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette formation ?')) return;
    const res = await fetch(`/api/formations?id=${id}`, { method: 'DELETE' });
    if ((await res.json()).success) {
      toast({ title: 'Formation supprimée', status: 'success', duration: 2000 });
      fetchFormations();
    }
  };

  const togglePublished = async (f: Formation) => {
    const res = await fetch('/api/formations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, is_published: !f.is_published }),
    });
    if ((await res.json()).success) fetchFormations();
  };

  const handleDownloadPdf = () => {
    window.open('/api/formations/pdf', '_blank');
  };

  return (
    <Stack spacing={6}>
      <Stack
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        spacing={3}
      >
        <Heading color="brand.500" fontFamily="heading">
          Formations & Conférences
        </Heading>
        <HStack spacing={2}>
          <Button
            leftIcon={<FiDownload />}
            variant="outline"
            colorScheme="brand"
            onClick={handleDownloadPdf}
          >
            Télécharger en PDF
          </Button>
          <Button colorScheme="accent" onClick={openCreate}>
            + Nouvelle formation
          </Button>
        </HStack>
      </Stack>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : formations.length === 0 ? (
        <Card bg="white">
          <CardBody>
            <Text color="brand.600" textAlign="center">
              Aucune formation enregistrée
            </Text>
          </CardBody>
        </Card>
      ) : (
        <DataTable
          columns={[
            {
              key: 'display_order',
              label: 'Ordre',
              sortable: true,
              render: (f: Formation) => f.display_order,
            },
            {
              key: 'titre',
              label: 'Titre',
              sortable: true,
              render: (f: Formation) => (
                <Text fontWeight="600" noOfLines={1}>
                  {f.titre}
                </Text>
              ),
            },
            {
              key: 'annee',
              label: 'Année',
              sortable: true,
              render: (f: Formation) => f.annee,
            },
            {
              key: 'duree',
              label: 'Durée',
              sortable: true,
              render: (f: Formation) => f.duree || '-',
            },
            {
              key: 'contenu',
              label: 'Contenu',
              render: (f: Formation) => (
                <Text noOfLines={2} fontSize="sm" whiteSpace="normal">
                  {f.contenu}
                </Text>
              ),
            },
            {
              key: 'is_published',
              label: 'Statut',
              sortable: true,
              render: (f: Formation) => (
                <Badge
                  colorScheme={f.is_published ? 'brand' : 'gray'}
                  bg={f.is_published ? 'sand.200' : 'gray.100'}
                  color={f.is_published ? 'brand.700' : 'gray.600'}
                  cursor="pointer"
                  onClick={e => {
                    e.stopPropagation();
                    togglePublished(f);
                  }}
                >
                  {f.is_published ? 'Publié' : 'Masqué'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (f: Formation) => (
                <IconButton
                  aria-label="Supprimer"
                  icon={<FiTrash2 />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(f.id);
                  }}
                />
              ),
            },
          ]}
          data={formations}
          onRowClick={openEdit}
        />
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader color="brand.500" fontFamily="heading">
            {editing ? 'Modifier la formation' : 'Ajouter une formation'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Titre</FormLabel>
                <Input
                  value={form.titre}
                  onChange={e => setForm({ ...form, titre: e.target.value })}
                  placeholder="Formation aux compétences psychosociales"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Contenu / description</FormLabel>
                <Textarea
                  value={form.contenu}
                  onChange={e => setForm({ ...form, contenu: e.target.value })}
                  rows={6}
                  placeholder="Description de la formation : durée, organisme, contenu pédagogique…"
                />
              </FormControl>

              <HStack spacing={3}>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Année</FormLabel>
                  <Input
                    size="sm"
                    value={form.annee}
                    onChange={e => setForm({ ...form, annee: e.target.value })}
                    placeholder="2025"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Durée</FormLabel>
                  <Input
                    size="sm"
                    value={form.duree}
                    onChange={e => setForm({ ...form, duree: e.target.value })}
                    placeholder="Ex : 3 jours, 21h, 2 semaines…"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="sm">Ordre (plus grand = plus haut)</FormLabel>
                  <NumberInput
                    size="sm"
                    value={form.display_order}
                    onChange={(_, n) => setForm({ ...form, display_order: isNaN(n) ? 0 : n })}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
              </HStack>

              <FormControl display="flex" alignItems="center">
                <FormLabel fontSize="sm" mb={0}>
                  Publié sur le site
                </FormLabel>
                <Switch
                  isChecked={form.is_published}
                  onChange={e => setForm({ ...form, is_published: e.target.checked })}
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
