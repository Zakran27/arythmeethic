// Auto-test : `node lib/format.check.mjs` (Node ≥ 23, types TS retirés nativement).
import assert from 'node:assert/strict';
import { formatDateLongFr, formatHeureFr, anneeScolaire, parisDate, daysBetween, weekday } from './format.ts';
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
