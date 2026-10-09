// Auto-test du compteur de report : `node lib/heures-report.check.mjs` (Node ≥ 23, types TS retirés nativement).
import assert from 'node:assert/strict';
import { computeReports } from './heures-report.ts';

const m = n => `2026-${String(n).padStart(2, '0')}-01`;
const at = (rows, mois, force) => computeReports(rows, force).find(l => l.mois === mois);

// Dérive des flottants : 0.1 + 0.2 + 0.7 = 1 h facturée (et non 0).
assert.equal(
  at(
    [1, 2, 3].map((n, i) => ({ mois: m(n), heures: 1, temps_a_reporter: [0.1, 0.2, 0.7][i] })),
    m(3)
  ).reportIn,
  1
);

// Règle actuelle inchangée : heures entières facturées, reste conservé.
const base = [
  { mois: m(1), heures: 4, temps_a_reporter: 0.75, report_in: 0 },
  { mois: m(2), heures: 3, temps_a_reporter: 0.15 },
  { mois: m(3), heures: 2, temps_a_reporter: 0.17 },
];
assert.deepEqual(
  computeReports(base).map(l => [l.reportIn, l.auto, l.soldeApres]),
  [
    [0, false, 0.75],
    [0, true, 0.9],
    [1, true, 0.07],
  ]
);

// Envoi dans le désordre (bug « Test Florence ») : septembre a déjà pris l'heure,
// juillet envoyé ensuite ne la refacture pas.
assert.equal(
  at(
    [
      { mois: m(6), heures: 0, temps_a_reporter: 1.52 },
      { mois: m(7), heures: 0 },
      { mois: m(9), heures: 1, temps_a_reporter: 0.18, report_in: 1 },
    ],
    m(7),
    m(7)
  ).reportIn,
  0
);

// Renvoi idempotent : une valeur figée n'est jamais recalculée.
assert.equal(
  at([{ mois: m(9), heures: 2, temps_a_reporter: 3, report_in: 2 }], m(9), m(9)).reportIn,
  2
);

// 1er RDV : pas facturé son mois, part (arrondi) avec le prochain mois déclaré, mentionné dans ce récap.
const rdv = computeReports([
  { mois: m(9), heures: 2, premier_rdv_heures: 1.5, premier_rdv_date: '2026-09-03' },
  { mois: m(10), heures: 0 },
  { mois: m(11), heures: 4 },
]);
assert.deepEqual(
  rdv.map(l => [l.reportIn, l.soldeApres, l.premiersRdv.map(p => p.date)]),
  [
    [0, 1.5, []],
    [0, 1.5, []],
    [1, 0.5, ['2026-09-03']],
  ]
);

// La mention suit le mois qui facture le report, pas un mois déclaré à +0 h.
assert.deepEqual(
  computeReports([
    { mois: m(9), heures: 1, premier_rdv_heures: 0.5, premier_rdv_date: '2026-09-03' },
    { mois: m(10), heures: 2, temps_a_reporter: 0.2 },
    { mois: m(11), heures: 2, temps_a_reporter: 0.4 },
  ]).map(l => [l.reportIn, l.premiersRdv.map(p => p.date)]),
  [
    [0, []],
    [0, []],
    [1, ['2026-09-03']],
  ]
);

// « Pas de déclaration » : n'absorbe jamais le report, même si le mois est forcé.
const sd = [
  { mois: m(9), heures: 2, temps_a_reporter: 1.2, sans_declaration: true },
  { mois: m(10), heures: 1 },
];
assert.deepEqual(
  computeReports(sd, m(9)).map(l => l.reportIn),
  [0, 1]
);

// Mois sans heures (non déclaré) : rien ; forcé (on l'envoie) : il absorbe.
assert.equal(at([{ mois: m(5), heures: 0, temps_a_reporter: 1.4 }], m(5)).reportIn, 0);
assert.equal(at([{ mois: m(5), heures: 0, temps_a_reporter: 1.4 }], m(5), m(5)).reportIn, 1);

// Saisie manuelle qui dépasse le solde : solde négatif affiché, pas de report en plus ensuite.
assert.deepEqual(
  computeReports([
    { mois: m(1), heures: 1, temps_a_reporter: 0.5, report_in: 1 },
    { mois: m(2), heures: 1, temps_a_reporter: 1 },
  ]).map(l => [l.reportIn, l.soldeApres]),
  [
    [1, -0.5],
    [0, 0.5],
  ]
);

console.log('heures-report OK');
