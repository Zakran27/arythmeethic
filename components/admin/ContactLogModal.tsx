'use client';

import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Textarea,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CANAUX } from './ContactTimeline';
import type { ContactCanal, ContactLog } from '@/types';

interface ContactLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  log?: ContactLog | null; // édition (sinon création)
  clientId?: string; // contact imposé (box de la fiche) : pas de sélecteur
  clientOptions?: { id: string; label: string }[];
}

// Date → valeur d'un <input type="datetime-local"> / « date » (heure locale)
const pad = (n: number) => String(n).padStart(2, '0');
const toLocalDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toLocalDateTime = (d: Date) =>
  `${toLocalDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function ContactLogModal({
  isOpen,
  onClose,
  onSaved,
  log,
  clientId,
  clientOptions = [],
}: ContactLogModalProps) {
  const toast = useToast();
  const [form, setForm] = useState({
    client_id: '',
    canal: 'Appel' as ContactCanal,
    contacted_at: '',
    duree_minutes: '',
    notes: '',
    a_recontacter_le: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      client_id: log?.client_id ?? clientId ?? '',
      canal: log?.canal ?? 'Appel',
      contacted_at: toLocalDateTime(log ? new Date(log.contacted_at) : new Date()),
      duree_minutes: log ? String(log.duree_minutes) : '',
      notes: log?.notes ?? '',
      a_recontacter_le: log?.a_recontacter_le ? toLocalDate(new Date(log.a_recontacter_le)) : '',
    });
  }, [isOpen, log, clientId]);

  const run = async (op: PromiseLike<{ error: { message: string } | null }>, title: string) => {
    setSaving(true);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast({ title: 'Erreur', description: error.message, status: 'error', isClosable: true });
      return;
    }
    toast({ title, status: 'success', duration: 3000 });
    onSaved();
    onClose();
  };

  const handleSave = () => {
    if (!form.client_id || !form.contacted_at) {
      toast({ title: 'Choisissez le contact et la date', status: 'warning', duration: 3000 });
      return;
    }
    const row = {
      client_id: form.client_id,
      canal: form.canal,
      contacted_at: new Date(form.contacted_at).toISOString(),
      duree_minutes: Math.max(0, parseInt(form.duree_minutes, 10) || 0),
      notes: form.notes.trim() || null,
      // Date seule (minuit, heure locale) : « en retard » à partir du lendemain
      a_recontacter_le: form.a_recontacter_le
        ? new Date(`${form.a_recontacter_le}T00:00`).toISOString()
        : null,
    };
    const table = createClient().from('contact_logs');
    run(
      log ? table.update(row).eq('id', log.id) : table.insert(row),
      log ? 'Prise de contact modifiée' : 'Prise de contact enregistrée'
    );
  };

  const handleDelete = () => {
    if (log)
      run(
        createClient().from('contact_logs').delete().eq('id', log.id),
        'Prise de contact supprimée'
      );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader color="brand.500" fontFamily="heading">
          {log ? 'Modifier la prise de contact' : 'Nouvelle prise de contact'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Stack spacing={4}>
            {!clientId && (
              <FormControl isRequired>
                <FormLabel>Contact</FormLabel>
                <Select
                  placeholder="Sélectionner un contact"
                  value={form.client_id}
                  onChange={e => set('client_id', e.target.value)}
                >
                  {clientOptions.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Canal</FormLabel>
                <Select value={form.canal} onChange={e => set('canal', e.target.value)}>
                  {CANAUX.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Date et heure</FormLabel>
                <Input
                  type="datetime-local"
                  value={form.contacted_at}
                  onChange={e => set('contacted_at', e.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Durée (minutes)</FormLabel>
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={form.duree_minutes}
                  onChange={e => set('duree_minutes', e.target.value)}
                  placeholder="0"
                />
              </FormControl>
              <FormControl>
                <FormLabel>À recontacter le</FormLabel>
                <Input
                  type="date"
                  value={form.a_recontacter_le}
                  onChange={e => set('a_recontacter_le', e.target.value)}
                />
                <FormHelperText fontSize="xs">
                  Le rappel disparaît dès la prise de contact suivante.
                </FormHelperText>
              </FormControl>
            </SimpleGrid>
            <FormControl>
              <FormLabel>Notes</FormLabel>
              <Textarea
                rows={4}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Résumé de l'échange…"
              />
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter gap={3}>
          {log && (
            <ConfirmDialog
              title="Supprimer la prise de contact"
              message="Cette prise de contact sera définitivement supprimée."
              confirmLabel="Supprimer"
              cancelLabel="Annuler"
              onConfirm={handleDelete}
              trigger={open => (
                <Button variant="ghost" colorScheme="red" mr="auto" onClick={open}>
                  Supprimer
                </Button>
              )}
            />
          )}
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button colorScheme="accent" onClick={handleSave} isLoading={saving}>
            Enregistrer
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
