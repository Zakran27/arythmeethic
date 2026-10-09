'use client';

import {
  Box,
  Button,
  Card,
  CardBody,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Link,
  type LinkProps,
  Progress,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { anneeScolaire, debutCampagne, formatHeureFr } from '@/lib/format';
import { JOURS_DISPO } from '@/lib/validators';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { Client } from '@/types';

type Noms = Pick<
  Client,
  'id' | 'first_name_jeune' | 'last_name_jeune' | 'first_name_parent1' | 'last_name_parent1'
>;
type Fiche = Noms & Pick<Client, 'jours_disponibles' | 'disponibilites'>;
type Demande = {
  id: string;
  client_id: string;
  status: string;
  created_at: string;
  deadline_at: string | null;
  client: Noms | null;
};
const NOMS = 'id, first_name_jeune, last_name_jeune, first_name_parent1, last_name_parent1';
type Suivi = { demande: Demande; repondu: boolean; relanceLe?: string };

const PALETTE = ['blue', 'green', 'purple', 'orange', 'teal', 'pink', 'cyan', 'red', 'yellow'];
const SLOT_H = 22; // px par demi-heure
const COLONNES = [...JOURS_DISPO, 'Dimanche']; // dimanche seulement si quelqu'un l'a choisi

// Jeune (prénom + nom), sinon le parent 1
const nom = (c: Noms | null) =>
  [c?.first_name_jeune || c?.first_name_parent1, c?.last_name_jeune || c?.last_name_parent1]
    .filter(Boolean)
    .join(' ') || 'Sans nom';
const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const dateFr = (d: string) =>
  new Date(d.length === 10 ? `${d}T00:00:00` : d).toLocaleDateString('fr-FR');

// Pastille colorée (une couleur par jeune) menant à la fiche
function Chip({ c, color, children, ...props }: { c: Noms; color: string } & LinkProps) {
  return (
    <Link
      as={NextLink}
      href={`/admin/clients/${c.id}`}
      display="block"
      bg={`${color}.100`}
      color={`${color}.900`}
      borderLeft="3px solid"
      borderColor={`${color}.400`}
      borderRadius="md"
      px={1.5}
      py={0.5}
      fontSize="xs"
      lineHeight="short"
      overflow="hidden"
      _hover={{ bg: `${color}.200`, textDecoration: 'none' }}
      {...props}
    >
      <Text fontWeight="600" noOfLines={1}>
        {nom(c)}
      </Text>
      {children}
    </Link>
  );
}

export default function DisponibilitesPage() {
  const toast = useToast();
  const [fiches, setFiches] = useState<Fiche[]>([]);
  const [suivis, setSuivis] = useState<Suivi[]>([]);
  const [prospects, setProspects] = useState(false);
  const [loading, setLoading] = useState(true);
  const [relance, setRelance] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: clients }, { data: demandes }] = await Promise.all([
      supabase
        .from('clients')
        .select(`${NOMS}, jours_disponibles, disponibilites`)
        .eq('type_client', 'Particulier')
        .in('client_status', prospects ? ['Client', 'Prospect'] : ['Client'])
        .order('first_name_jeune'),
      supabase
        .from('procedures')
        .select(
          `id, client_id, status, created_at, deadline_at, procedure_types!inner(code), client:clients(${NOMS})`
        )
        .eq('procedure_types.code', 'PREPARATION_ACCOMPAGNEMENT')
        .gte('created_at', debutCampagne())
        .order('created_at', { ascending: false }),
    ]);
    const procs = (demandes ?? []) as unknown as Demande[];

    // Une ligne par famille : sa demande la plus récente ; répondu = au moins un formulaire envoyé
    // (statut SIGNED, posé seulement par le formulaire et annulé s'il n'a pas pu tout enregistrer)
    const parClient = new Map<string, Suivi>();
    for (const p of procs) {
      const s = parClient.get(p.client_id) ?? { demande: p, repondu: false };
      if (p.status === 'SIGNED') s.repondu = true;
      parClient.set(p.client_id, s);
    }
    const suivisList = [...parClient.values()];
    const { data: history } = suivisList.length
      ? await supabase
          .from('procedure_status_history')
          .select('procedure_id, created_at')
          .in(
            'procedure_id',
            suivisList.map(s => s.demande.id)
          )
          .eq('status', 'RELANCE_ENVOYEE')
      : { data: [] };
    for (const h of history ?? []) {
      const s = suivisList.find(x => x.demande.id === h.procedure_id);
      if (s && (!s.relanceLe || h.created_at > s.relanceLe)) s.relanceLe = h.created_at;
    }
    setFiches((clients ?? []) as Fiche[]);
    setSuivis(suivisList);
    setLoading(false);
  }, [prospects]);
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const relancer = async (clientId: string) => {
    setRelance(clientId);
    try {
      const res = await fetch('/api/procedures/preparation-accompagnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, relance: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur lors de la relance');
      toast({ title: 'Relance envoyée', description: data.sentTo, status: 'success' });
      fetchData();
    } catch (err) {
      toast({
        title: 'Erreur',
        description: err instanceof Error ? err.message : 'Erreur lors de la relance',
        status: 'error',
      });
    } finally {
      setRelance(null);
    }
  };

  // Créneaux par jour, en « couloirs » côte à côte quand ils se chevauchent ; jours sans horaire
  const grille = useMemo(() => {
    const creneaux = fiches.flatMap((c, i) =>
      (c.disponibilites || []).map(d => ({ ...d, c, color: PALETTE[i % PALETTE.length] }))
    );
    const sansHoraire = fiches.flatMap((c, i) =>
      (c.jours_disponibles || [])
        .filter(j => !c.disponibilites?.some(d => d.jour === j))
        .map(jour => ({ jour, c, color: PALETTE[i % PALETTE.length] }))
    );
    const jours = COLONNES.filter(
      j => JOURS_DISPO.includes(j) || [...creneaux, ...sansHoraire].some(x => x.jour === j)
    );
    const debut = Math.min(8, ...creneaux.map(d => Math.floor(minutes(d.debut) / 60)));
    const fin = Math.max(21, ...creneaux.map(d => Math.ceil(minutes(d.fin) / 60)));
    const parJour = jours.map(jour => {
      const fins: number[] = []; // fin du dernier créneau de chaque couloir
      const items = creneaux
        .filter(d => d.jour === jour)
        .map(d => {
          const a = Math.floor((minutes(d.debut) - debut * 60) / 30) + 1;
          return { ...d, a, b: Math.max(a + 1, Math.ceil((minutes(d.fin) - debut * 60) / 30) + 1) };
        })
        .sort((x, y) => x.a - y.a)
        .map(d => {
          // ponytail: couloirs gloutons sur toute la journée (un créneau isolé reste étroit si la
          // journée a des chevauchements ailleurs) ; grouper par chevauchement si ça gêne
          let lane = fins.findIndex(f => f <= d.a);
          if (lane < 0) lane = fins.length;
          fins[lane] = d.b;
          return { ...d, lane };
        });
      const lanes = Math.max(1, fins.length);
      return { jour, items, lanes, w: Math.max(150, lanes * 100) }; // colonne élargie si chevauchements
    });
    return { jours, debut, fin, parJour, sansHoraire };
  }, [fiches]);

  const repondus = suivis.filter(s => s.repondu).length;
  const enAttente = suivis.filter(s => !s.repondu);
  const rows = (grille.fin - grille.debut) * 2;

  return (
    <Stack spacing={6}>
      <Box>
        <Heading color="brand.500" fontFamily="heading">
          Synthèse des disponibilités
        </Heading>
        <Text color="gray.600" fontSize="sm" mt={1}>
          Créneaux déclarés par les familles (procédure Préparation accompagnement) et jours
          disponibles sans horaire (recueil des informations).
        </Text>
      </Box>

      {loading ? (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="accent.500" />
        </Box>
      ) : (
        <>
          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={3}>
                <HStack justify="space-between" flexWrap="wrap">
                  <Heading size="sm" color="brand.500" fontFamily="heading">
                    Préparation accompagnement {anneeScolaire()}
                  </Heading>
                  <Text fontWeight="700" color="brand.600">
                    {repondus} / {suivis.length} ont répondu
                  </Text>
                </HStack>
                {suivis.length === 0 ? (
                  <Text fontSize="sm" color="gray.500">
                    Aucune demande envoyée depuis le {dateFr(debutCampagne())}.
                  </Text>
                ) : (
                  <Progress
                    value={(repondus / suivis.length) * 100}
                    colorScheme="accent"
                    size="sm"
                    borderRadius="full"
                  />
                )}
                {enAttente.map(({ demande: d, relanceLe }) => (
                  <Flex
                    key={d.id}
                    justify="space-between"
                    align={{ base: 'flex-start', md: 'center' }}
                    direction={{ base: 'column', md: 'row' }}
                    gap={2}
                    py={2}
                    px={3}
                    bg="gray.50"
                    borderRadius="md"
                  >
                    <Box>
                      <Text fontWeight="medium" fontSize="sm">
                        {nom(d.client)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Envoyé le {dateFr(d.created_at)}
                        {relanceLe
                          ? ` · relancé le ${dateFr(relanceLe)}`
                          : d.deadline_at
                            ? ` · relance prévue le ${dateFr(d.deadline_at)}`
                            : ''}
                      </Text>
                    </Box>
                    <HStack spacing={2}>
                      <ConfirmDialog
                        title="Relancer la famille"
                        message="Un email de relance (avec le même lien vers le formulaire) sera envoyé au parent 1."
                        confirmLabel="Relancer"
                        cancelLabel="Annuler"
                        onConfirm={() => relancer(d.client_id)}
                        trigger={open => (
                          <Button
                            size="xs"
                            colorScheme="accent"
                            onClick={open}
                            isLoading={relance === d.client_id}
                          >
                            Relancer
                          </Button>
                        )}
                      />
                      <Button
                        as={NextLink}
                        href={`/admin/clients/${d.client_id}`}
                        size="xs"
                        variant="outline"
                        colorScheme="brand"
                      >
                        Voir la fiche
                      </Button>
                    </HStack>
                  </Flex>
                ))}
              </Stack>
            </CardBody>
          </Card>

          <Card bg="white" shadow="sm">
            <CardBody>
              <Stack spacing={4}>
                <FormControl display="flex" alignItems="center">
                  <Switch
                    id="prospects"
                    colorScheme="accent"
                    isChecked={prospects}
                    onChange={e => setProspects(e.target.checked)}
                    mr={2}
                  />
                  <FormLabel htmlFor="prospects" mb={0} fontSize="sm" color="gray.600">
                    Inclure les prospects (par défaut : clients seulement)
                  </FormLabel>
                </FormControl>
                <Box overflowX="auto">
                  <Grid
                    templateColumns={`56px ${grille.parJour.map(d => `minmax(${d.w}px, 1fr)`).join(' ')}`}
                    minW={`${grille.parJour.reduce((s, d) => s + d.w + 8, 56)}px`}
                    columnGap={2}
                  >
                    <Box position="sticky" left={0} zIndex={1} bg="white" />
                    {grille.jours.map(j => (
                      <Text key={j} fontWeight="600" color="brand.500" textAlign="center" pb={2}>
                        {j}
                      </Text>
                    ))}

                    {grille.sansHoraire.length > 0 && (
                      <>
                        <Text
                          fontSize="2xs"
                          color="gray.500"
                          py={2}
                          lineHeight="short"
                          position="sticky"
                          left={0}
                          zIndex={1}
                          bg="white"
                        >
                          Jours sans horaire
                        </Text>
                        {grille.jours.map(j => (
                          <Flex
                            key={j}
                            direction="column"
                            gap={1}
                            py={2}
                            borderBottom="1px solid"
                            borderColor="gray.200"
                          >
                            {grille.sansHoraire
                              .filter(x => x.jour === j)
                              .map(x => (
                                <Chip key={x.c.id} c={x.c} color={x.color} />
                              ))}
                          </Flex>
                        ))}
                      </>
                    )}

                    {/* Colonne des heures figée au défilement horizontal (mobile) */}
                    <Grid
                      templateRows={`repeat(${rows}, ${SLOT_H}px)`}
                      position="sticky"
                      left={0}
                      zIndex={1}
                      bg="white"
                    >
                      {Array.from({ length: grille.fin - grille.debut }, (_, i) => (
                        <Text
                          key={i}
                          gridRow={`${i * 2 + 1} / span 2`}
                          fontSize="2xs"
                          color="gray.500"
                          mt="-0.5em"
                        >
                          {grille.debut + i}h
                        </Text>
                      ))}
                    </Grid>
                    {grille.parJour.map(({ jour, items, lanes }) => (
                      <Grid
                        key={jour}
                        templateRows={`repeat(${rows}, ${SLOT_H}px)`}
                        templateColumns={`repeat(${lanes}, minmax(0, 1fr))`}
                        columnGap="2px"
                        bgImage="linear-gradient(to bottom, var(--chakra-colors-gray-200) 1px, transparent 1px)"
                        bgSize={`100% ${SLOT_H * 2}px`}
                      >
                        {items.map(d => (
                          <Chip
                            key={d.c.id}
                            c={d.c}
                            color={d.color}
                            gridRow={`${d.a} / ${d.b}`}
                            gridColumn={d.lane + 1}
                            title={`${nom(d.c)} — ${jour} ${formatHeureFr(d.debut)}–${formatHeureFr(d.fin)}`}
                          >
                            <Text fontSize="2xs" noOfLines={1}>
                              {formatHeureFr(d.debut)}–{formatHeureFr(d.fin)}
                            </Text>
                          </Chip>
                        ))}
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Stack>
            </CardBody>
          </Card>
        </>
      )}
    </Stack>
  );
}
