'use client';

import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Link,
  Spinner,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useClients } from '@/lib/hooks/useClients';
import { SendRecapModal } from '@/app/admin/clients/[id]/SendRecapModal';
import type { Client, HeureRealisee } from '@/types';

// Mois précédent par défaut : le récap porte sur le mois écoulé.
const moisPrecedent = () => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STATUTS = {
  sans: { label: 'Pas de déclaration', color: 'gray' },
  aDeclarer: { label: 'À déclarer', color: 'red' },
  recap: { label: 'Récap à envoyer', color: 'orange' },
  salaire: { label: 'En attente du salaire', color: 'blue' },
  ok: { label: 'OK', color: 'green' },
} as const;

function statut(row?: HeureRealisee): keyof typeof STATUTS {
  if (row?.sans_declaration) return 'sans';
  // Récap envoyé ou compteur figé sans e-mail (« Compteur validé » sur la fiche) = déclaré
  if (row && (row.recap_email_sent_at || row.report_in != null))
    return row.salaire_recu_le ? 'ok' : 'salaire';
  // Pas de ligne, ou ligne à 0 h = rien de déclaré
  if (!row || Number(row.heures) + Number(row.heures_annulation ?? 0) === 0) return 'aDeclarer';
  return 'recap';
}

const nom = (prenom?: string, nomFamille?: string) =>
  `${prenom || ''} ${nomFamille || ''}`.trim() || '-';

export default function SuiviCesuPage() {
  const toast = useToast();
  const { clients, loading: clientsLoading } = useClients();
  const [heures, setHeures] = useState<HeureRealisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [mois, setMois] = useState(moisPrecedent);
  const [recapClient, setRecapClient] = useState<Client | null>(null);

  const fetchHeures = useCallback(async () => {
    // ponytail: table entière (quelques dizaines de lignes/an) ; SendRecapModal a besoin de
    // tout l'historique du client pour le compteur de report.
    const { data } = await createClient().from('heures_realisees').select('*');
    setHeures(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => {
    fetchHeures();
  }, [fetchHeures]);

  const moisIso = `${mois}-01`;
  const rowByClient = new Map(heures.filter(h => h.mois === moisIso).map(h => [h.client_id, h]));
  // Particuliers CESU (ou non renseigné) actifs + ceux qui ont une ligne ce mois (archivés depuis)
  const lignes = clients
    .filter(
      c =>
        c.type_client === 'Particulier' &&
        c.mode_facturation !== 'Ponctuel' &&
        (c.client_status === 'Client' || rowByClient.has(c.id))
    )
    .sort((a, b) =>
      nom(a.first_name_jeune, a.last_name_jeune).localeCompare(
        nom(b.first_name_jeune, b.last_name_jeune),
        'fr'
      )
    );
  const compte = (k: keyof typeof STATUTS) =>
    lignes.filter(c => statut(rowByClient.get(c.id)) === k).length;

  const save = async (op: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await op;
    if (error)
      toast({ title: 'Erreur', description: error.message, status: 'error', isClosable: true });
    fetchHeures();
  };

  const setSalaire = (row: HeureRealisee, value: string) => {
    if ((row.salaire_recu_le ?? '') === value) return;
    save(
      createClient()
        .from('heures_realisees')
        .update({ salaire_recu_le: value || null })
        .eq('id', row.id)
    );
  };

  // Jamais d'upsert : il écraserait les heures déjà saisies du mois.
  const setSansDeclaration = (client: Client, row: HeureRealisee | undefined, value: boolean) => {
    const table = createClient().from('heures_realisees');
    // Décocher une ligne à 0 h restée vierge (créée ici) la supprime : retour à « aucune ligne ».
    const vierge =
      row &&
      !Number(row.heures) &&
      !Number(row.heures_annulation) &&
      !Number(row.temps_a_reporter) &&
      !Number(row.premier_rdv_heures) &&
      row.report_in == null &&
      !row.recap_email_sent_at &&
      !row.salaire_recu_le;
    save(
      row
        ? !value && vierge
          ? table.delete().eq('id', row.id)
          : table.update({ sans_declaration: value }).eq('id', row.id)
        : table.insert({
            client_id: client.id,
            mois: moisIso,
            heures: 0,
            tarif_horaire: client.tarif_horaire ?? 0,
            sans_declaration: true,
          })
    );
  };

  return (
    <Stack spacing={6}>
      <Stack
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'flex-end' }}
        spacing={3}
      >
        <Box>
          <Heading color="brand.500" fontFamily="heading">
            Suivi CESU
          </Heading>
          <Text color="gray.600" fontSize="sm" mt={1}>
            Déclaration mensuelle des particuliers en CESU : récap envoyé, salaire reçu. « Pas de
            déclaration » crée au besoin une ligne à 0 h pour le mois, sans toucher aux heures déjà
            saisies.
          </Text>
        </Box>
        <FormControl w={{ base: 'full', md: '200px' }}>
          <FormLabel fontSize="sm">Mois</FormLabel>
          <Input
            type="month"
            bg="white"
            value={mois}
            onChange={e => e.target.value && setMois(e.target.value)}
          />
        </FormControl>
      </Stack>

      <HStack spacing={2} flexWrap="wrap">
        {(Object.keys(STATUTS) as (keyof typeof STATUTS)[]).map(k => (
          <Badge key={k} colorScheme={STATUTS[k].color} px={2} py={1}>
            {STATUTS[k].label} : {compte(k)}
          </Badge>
        ))}
      </HStack>

      {loading || clientsLoading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : lignes.length === 0 ? (
        <Box textAlign="center" py={10} bg="white" borderRadius="md">
          <Text color="gray.500">Aucun client particulier en CESU</Text>
        </Box>
      ) : (
        <Card bg="white">
          <TableContainer>
            <Table size="sm" sx={{ 'th, td': { px: 3 } }}>
              <Thead bg="#faf6f2">
                <Tr>
                  <Th color="brand.600" textTransform="none">
                    Élève / Parent
                  </Th>
                  <Th color="brand.600" textTransform="none" isNumeric>
                    Heures
                  </Th>
                  <Th color="brand.600" textTransform="none">
                    Récap
                  </Th>
                  <Th color="brand.600" textTransform="none">
                    Salaire reçu le
                  </Th>
                  <Th color="brand.600" textTransform="none">
                    Pas de déclaration
                  </Th>
                  <Th color="brand.600" textTransform="none">
                    Statut
                  </Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {lignes.map(c => {
                  const row = rowByClient.get(c.id);
                  const s = statut(row);
                  return (
                    <Tr key={c.id}>
                      <Td>
                        <Link
                          as={NextLink}
                          href={`/admin/clients/${c.id}`}
                          color="accent.600"
                          fontWeight="600"
                        >
                          {nom(c.first_name_jeune, c.last_name_jeune)}
                        </Link>
                        <Text fontSize="xs" color="gray.500">
                          {nom(c.first_name_parent1, c.last_name_parent1)}
                        </Text>
                      </Td>
                      <Td isNumeric>{row ? `${row.heures} h` : '-'}</Td>
                      <Td>
                        {row?.recap_email_sent_at ? (
                          <>
                            <Text fontSize="sm">
                              Envoyé le{' '}
                              {new Date(row.recap_email_sent_at).toLocaleDateString('fr-FR')}
                            </Text>
                            {row.recap_email_to && (
                              <Text fontSize="xs" color="gray.500">
                                à {row.recap_email_to}
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text fontSize="sm" color="gray.400">
                            {row?.report_in != null
                              ? 'Compteur validé (sans e-mail)'
                              : 'Non envoyé'}
                          </Text>
                        )}
                      </Td>
                      <Td>
                        <Input
                          key={`${row?.id}-${row?.salaire_recu_le}`}
                          type="date"
                          size="sm"
                          w="150px"
                          defaultValue={row?.salaire_recu_le ?? ''}
                          isDisabled={!row || row.sans_declaration}
                          onBlur={e => row && setSalaire(row, e.target.value)}
                        />
                      </Td>
                      <Td>
                        <Checkbox
                          isChecked={!!row?.sans_declaration}
                          // Mois déjà déclaré (récap envoyé ou report figé) : on ne peut que décocher
                          isDisabled={
                            !row?.sans_declaration &&
                            (!!row?.recap_email_sent_at || row?.report_in != null)
                          }
                          onChange={e => setSansDeclaration(c, row, e.target.checked)}
                          colorScheme="accent"
                        />
                      </Td>
                      <Td>
                        <Badge colorScheme={STATUTS[s].color}>{STATUTS[s].label}</Badge>
                      </Td>
                      <Td>
                        {s === 'aDeclarer' ? (
                          <Button
                            as={NextLink}
                            href={`/admin/clients/${c.id}`}
                            size="xs"
                            variant="outline"
                            colorScheme="brand"
                          >
                            Déclarer
                          </Button>
                        ) : (
                          s !== 'sans' && (
                            <Button
                              size="xs"
                              variant="outline"
                              colorScheme="brand"
                              onClick={() => setRecapClient(c)}
                            >
                              {row?.recap_email_sent_at ? 'Renvoyer' : 'Envoyer'}
                            </Button>
                          )
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {recapClient && (
        <SendRecapModal
          isOpen
          onClose={() => setRecapClient(null)}
          client={recapClient}
          heures={heures.filter(h => h.client_id === recapClient.id)}
          initialMois={moisIso}
          onSuccess={fetchHeures}
        />
      )}
    </Stack>
  );
}
