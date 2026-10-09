'use client';

import { Box, Button, Heading, Spinner, Stack, Text, useToast } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { formatPhone } from '@/lib/format';
import { DataTable } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Client } from '@/types';

type Ligne = Client & { rang: number };

const nom = (prenom?: string, nomFamille?: string) =>
  `${prenom || ''} ${nomFamille || ''}`.trim() || '-';

export default function ListeAttentePage() {
  const router = useRouter();
  const toast = useToast();
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchListe = useCallback(async () => {
    // ponytail: filtrer sur Prospect suffit — passé Client ou archivé, il sort de la liste.
    const { data } = await createClient()
      .from('clients')
      .select('*')
      .eq('type_client', 'Particulier')
      .eq('client_status', 'Prospect')
      .not('liste_attente_depuis', 'is', null)
      .order('liste_attente_depuis', { ascending: true });
    setLignes((data ?? []).map((c: Client, i: number) => ({ ...c, rang: i + 1 })));
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchListe();
  }, [fetchListe]);

  const retirer = async (id: string) => {
    const { error } = await createClient()
      .from('clients')
      .update({ liste_attente_depuis: null })
      .eq('id', id);
    if (error) toast({ title: 'Erreur', description: error.message, status: 'error' });
    else toast({ title: "Retiré de la liste d'attente", status: 'success', duration: 3000 });
    fetchListe();
  };

  return (
    <Stack spacing={6}>
      <Box>
        <Heading color="brand.500" fontFamily="heading">
          Liste d&apos;attente
        </Heading>
        <Text color="gray.600" fontSize="sm" mt={1}>
          Demandes reçues pendant que le bandeau « complet » est actif, ou ajoutées depuis la fiche
          d&apos;un prospect. Du plus ancien au plus récent.
        </Text>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : (
        <DataTable<Ligne>
          columns={[
            { key: 'rang', label: '#', render: c => <Text fontWeight="700">#{c.rang}</Text> },
            {
              key: 'parent',
              label: 'Parent',
              render: c => (
                <>
                  <Text>{nom(c.first_name_parent1, c.last_name_parent1)}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatPhone(c.phone_parent1) || c.email_parent1 || ''}
                  </Text>
                </>
              ),
            },
            {
              key: 'jeune',
              label: 'Jeune',
              render: c => (
                <>
                  <Text>{nom(c.first_name_jeune, c.last_name_jeune)}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {/* Formulaire « Jeune » : coordonnées dans les champs jeune, parent vide */}
                    {[c.niveau_eleve, formatPhone(c.phone_jeune) || c.email_jeune]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </>
              ),
            },
            { key: 'demande_type', label: 'Demande', render: c => c.demande_type || '-' },
            {
              key: 'liste_attente_depuis',
              label: 'Inscrit le',
              render: c => new Date(c.liste_attente_depuis!).toLocaleDateString('fr-FR'),
            },
            {
              key: 'attente',
              label: 'Attente',
              render: c => {
                const jours = Math.floor(
                  (Date.now() - Date.parse(c.liste_attente_depuis!)) / 864e5
                );
                return `${jours} jour${jours > 1 ? 's' : ''}`;
              },
            },
            {
              key: 'actions',
              label: '',
              render: c => (
                // stopPropagation : la ligne ouvre la fiche (le dialogue est un enfant React de la ligne)
                <Box onClick={e => e.stopPropagation()}>
                  <ConfirmDialog
                    title="Retirer de la liste d'attente"
                    message="Ce contact perdra son rang dans la liste d'attente."
                    confirmLabel="Retirer"
                    cancelLabel="Annuler"
                    onConfirm={() => retirer(c.id)}
                    trigger={open => (
                      <Button size="xs" variant="outline" colorScheme="red" onClick={open}>
                        Retirer
                      </Button>
                    )}
                  />
                </Box>
              ),
            },
          ]}
          data={lignes}
          onRowClick={c => router.push(`/admin/clients/${c.id}`)}
        />
      )}
    </Stack>
  );
}
