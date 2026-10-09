// Auto-test : `node lib/format.check.mjs` (Node ≥ 23, types TS retirés nativement).
import assert from 'node:assert/strict';
import {
  formatDateLongFr,
  formatHeureFr,
  anneeScolaire,
  parisDate,
  daysBetween,
  weekday,
  debutCampagne,
  preparationRelanceDate,
  formatCreneau,
} from './format.ts';
import { substituteVars } from './email-templates.ts';

assert.equal(formatDateLongFr('2026-10-14'), 'mercredi 14 octobre 2026');
assert.equal(formatDateLongFr('2026-10-01'), 'jeudi 1er octobre 2026');
assert.equal(formatHeureFr('17:30'), '17h30');
assert.equal(formatHeureFr('09:00'), '9h');
assert.equal(anneeScolaire(new Date(2026, 4, 31)), '2025-2026');
assert.equal(anneeScolaire(new Date(2026, 5, 1)), '2026-2027');
assert.equal(anneeScolaire(new Date(2027, 0, 15)), '2026-2027');

// Dates murales à Paris (relances du cron signatures) : 23h30 UTC = lendemain à Paris
assert.equal(parisDate(new Date('2026-10-12T23:30:00Z')), '2026-10-13');
assert.equal(parisDate(new Date('2026-12-31T22:59:00Z')), '2026-12-31');
assert.equal(parisDate(new Date('2026-12-31T23:00:00Z')), '2027-01-01');
assert.equal(daysBetween('2026-10-22', '2026-10-29'), 7); // passage à l'heure d'hiver le 25/10
assert.equal(daysBetween('2026-03-26', '2026-03-29'), 3);
assert.equal(weekday('2026-10-12'), 1); // lundi
assert.equal(weekday('2026-10-18'), 0); // dimanche

// Préparation accompagnement : relance = max(2e vendredi de septembre, J+7)
assert.equal(preparationRelanceDate('2026-08-20'), '2026-09-11'); // campagne auto
assert.equal(preparationRelanceDate('2027-08-20'), '2027-09-10');
assert.equal(preparationRelanceDate('2026-09-04'), '2026-09-11'); // J+7 = le vendredi
assert.equal(preparationRelanceDate('2026-09-08'), '2026-09-15'); // trop proche → J+7
assert.equal(preparationRelanceDate('2026-10-09'), '2026-10-16'); // lancement manuel tardif
assert.equal(preparationRelanceDate('2026-06-05'), '2026-09-11'); // déjà l'année suivante
assert.equal(preparationRelanceDate('2027-03-01'), '2027-03-08'); // vendredi 2026 passé
assert.equal(preparationRelanceDate('2026-12-28'), '2027-01-04'); // passage d'année
assert.equal(debutCampagne(new Date(2026, 9, 9)), '2026-06-01');
assert.equal(debutCampagne(new Date(2027, 4, 31)), '2026-06-01');
assert.equal(debutCampagne(new Date(2027, 5, 1)), '2027-06-01');
assert.equal(formatCreneau({ jour: 'Mardi', debut: '17:00', fin: '18:30' }), 'Mardi 17h–18h30');

// Sections {{#var}}…{{/var}} : gardées si la variable est non vide
const t =
  '<p>Bonjour {{ recipientName }},</p><p>{{#premierCours}}Cours le {{premierCours}}.{{/premierCours}}</p>{{inconnue}}';
assert.equal(
  substituteVars(t, { recipientName: 'Léa', premierCours: 'mardi 14 octobre 2026 à 17h30' }),
  '<p>Bonjour Léa,</p><p>Cours le mardi 14 octobre 2026 à 17h30.</p>'
);
assert.equal(
  substituteVars(t, { recipientName: 'Léa', premierCours: '' }),
  '<p>Bonjour Léa,</p><p></p>'
);
// Section mal fermée : laissée telle quelle (visible, donc repérable par Florence)
assert.equal(substituteVars('{{#a}}x{{/b}}', { a: '1' }), '{{#a}}x{{/b}}');

console.log('format.check OK');
