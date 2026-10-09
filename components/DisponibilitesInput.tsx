'use client';

import { Checkbox, Grid, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { JOURS_DISPO } from '@/lib/validators';
import type { Disponibilite } from '@/types';

// Un créneau « de … à … » par jour coché, du lundi au samedi (validé par parseDisponibilites).
// `showErrors` : signale en rouge les créneaux incomplets ou dont la fin n'est pas après le début.
export function DisponibilitesInput({
  value,
  onChange,
  showErrors = false,
}: {
  value: Disponibilite[];
  onChange: (value: Disponibilite[]) => void;
  showErrors?: boolean;
}) {
  const update = (jour: string, patch: Partial<Disponibilite>) =>
    onChange(value.map(d => (d.jour === jour ? { ...d, ...patch } : d)));

  return (
    <Stack spacing={3}>
      {JOURS_DISPO.map(jour => {
        const slot = value.find(d => d.jour === jour);
        const invalid =
          showErrors && !!slot && (!slot.debut || !slot.fin || slot.fin <= slot.debut);
        return (
          <Grid
            key={jour}
            templateColumns={{ base: '1fr', sm: '130px 1fr' }}
            gap={2}
            alignItems="center"
          >
            <Checkbox
              colorScheme="accent"
              isChecked={!!slot}
              onChange={e =>
                onChange(
                  e.target.checked
                    ? [...value, { jour, debut: '', fin: '' }]
                    : value.filter(d => d.jour !== jour)
                )
              }
            >
              {jour}
            </Checkbox>
            {slot && (
              <Stack spacing={1}>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="brand.600">
                    de
                  </Text>
                  <Input
                    type="time"
                    size="sm"
                    maxW="130px"
                    value={slot.debut}
                    isInvalid={invalid}
                    onChange={e => update(jour, { debut: e.target.value })}
                    aria-label={`${jour} : heure de début`}
                  />
                  <Text fontSize="sm" color="brand.600">
                    à
                  </Text>
                  <Input
                    type="time"
                    size="sm"
                    maxW="130px"
                    value={slot.fin}
                    isInvalid={invalid}
                    onChange={e => update(jour, { fin: e.target.value })}
                    aria-label={`${jour} : heure de fin`}
                  />
                </HStack>
                {invalid && (
                  <Text fontSize="xs" color="red.500">
                    {!slot.debut || !slot.fin
                      ? 'Indiquez une heure de début et de fin.'
                      : "L'heure de fin doit être après l'heure de début."}
                  </Text>
                )}
              </Stack>
            )}
          </Grid>
        );
      })}
    </Stack>
  );
}
