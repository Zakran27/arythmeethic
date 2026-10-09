// Auto-test : `node lib/validators.check.mjs` (Node ≥ 23, types TS retirés nativement).
import assert from 'node:assert/strict';
import {
  normalizePhone,
  findDuplicateContacts,
  findRecueilContactErrors,
  uploadExtension,
  UPLOAD_MIME,
  parseDisponibilites,
} from './validators.ts';
import { splitSituation, joinSituation } from '../types/index.ts';

assert.equal(normalizePhone('06 12 34 56 78'), '0612345678');
assert.equal(normalizePhone('+33 6 12 34 56 78'), '0612345678');
assert.equal(normalizePhone('0033612345678'), '0612345678');
assert.equal(normalizePhone('33612345678'), '0612345678');
assert.equal(normalizePhone(''), '');
assert.equal(normalizePhone(null), '');

// Doublons : formats différents du même numéro, emails insensibles à la casse
assert.deepEqual(
  Object.keys(
    findDuplicateContacts({
      phone_parent1: '06 12 34 56 78',
      phone_parent2: '+33612345678',
      phone_jeune: '06.12.34.56.78',
      email_parent1: 'Papa@Mail.fr',
      email_jeune: ' papa@mail.fr ',
    })
  ).sort(),
  ['email_jeune', 'phone_jeune', 'phone_parent2']
);
// Parents avec le même email : autorisé ; valeurs vides ignorées
assert.deepEqual(
  findDuplicateContacts({
    email_parent1: 'famille@mail.fr',
    email_parent2: 'famille@mail.fr',
    phone_parent1: '',
    phone_jeune: '',
  }),
  {}
);
assert.deepEqual(
  Object.keys(findDuplicateContacts({ email_jeune: 'x@y.fr', email_parent2: 'X@Y.FR' })),
  ['email_jeune']
);

const famille = {
  first_name_parent1: 'Anne',
  last_name_parent1: 'Martin',
  phone_parent1: '0611111111',
  email_parent1: 'anne@mail.fr',
  first_name_parent2: 'Paul',
  last_name_parent2: 'Martin',
  phone_parent2: '0622222222',
  email_parent2: 'anne@mail.fr',
  first_name_jeune: 'Léa',
  last_name_jeune: 'Martin',
  phone_jeune: '0633333333',
  email_jeune: 'lea@mail.fr',
};
assert.deepEqual(findRecueilContactErrors(famille, true), {});
// Parent 2 obligatoire seulement avec deux parents ; ignoré (même en doublon) sinon
const seul = { ...famille, first_name_parent2: '', phone_parent2: '0611111111' };
assert.deepEqual(Object.keys(findRecueilContactErrors(seul, true)).sort(), [
  'first_name_parent2',
  'phone_parent2',
]);
assert.deepEqual(findRecueilContactErrors(seul, false), {});
// Tél + email du jeune obligatoires, formats vérifiés
const errs = findRecueilContactErrors(
  { ...famille, phone_jeune: '', email_parent1: 'anne@' },
  true
);
assert.equal(errs.phone_jeune, 'Champ obligatoire');
assert.equal(errs.email_parent1, 'Email invalide');

assert.equal(uploadExtension('Bilan Ortho.PDF'), 'pdf');
assert.equal(uploadExtension('photo.jpeg'), 'jpeg');
assert.equal(uploadExtension('script.html'), null);
assert.equal(uploadExtension('pdf'), null);
assert.equal(uploadExtension(undefined), null);
assert.equal(uploadExtension('x.constructor'), null);
assert.equal(UPLOAD_MIME[uploadExtension('IMG_0001.HEIC')], 'image/heic');

// situation_familiale : aller-retour formulaire public ↔ modale admin
assert.deepEqual(splitSituation('Un seul parent — garde — alternée'), {
  choix: 'Un seul parent',
  precisions: 'garde — alternée',
});
assert.deepEqual(splitSituation('Garde alternée'), { choix: '', precisions: 'Garde alternée' });
assert.deepEqual(splitSituation(null), { choix: '', precisions: '' });
assert.equal(joinSituation('Un seul parent', 'garde'), 'Un seul parent — garde');
assert.equal(joinSituation('Un seul parent', '  '), 'Un seul parent');
assert.equal(joinSituation('', 'texte libre'), 'texte libre');
const s = joinSituation('Autre situation', 'tutelle — jugement');
assert.equal(joinSituation(splitSituation(s).choix, splitSituation(s).precisions), s);

// Disponibilités : ≥ 2 jours, HH:MM, fin > début ; jours inconnus / doublons ignorés, tri lundi → samedi
const ok = parseDisponibilites([
  { jour: 'Jeudi', debut: '16:30', fin: '18:00' },
  { jour: 'Lundi', debut: '17:00', fin: '19:00' },
  { jour: 'Lundi', debut: '08:00', fin: '09:00' },
  { jour: 'Dimanche', debut: '10:00', fin: '12:00' },
]);
assert.equal(ok.error, null);
assert.deepEqual(ok.slots, [
  { jour: 'Lundi', debut: '17:00', fin: '19:00' },
  { jour: 'Jeudi', debut: '16:30', fin: '18:00' },
]);
assert.match(
  parseDisponibilites([{ jour: 'Lundi', debut: '17:00', fin: '19:00' }]).error,
  /2 jours/
);
assert.match(
  parseDisponibilites([
    { jour: 'Lundi', debut: '17:00', fin: '19:00' },
    { jour: 'Mardi', debut: '', fin: '19:00' },
  ]).error,
  /début et de fin/
);
assert.match(
  parseDisponibilites([
    { jour: 'Lundi', debut: '17:00', fin: '17:00' },
    { jour: 'Mardi', debut: '18:00', fin: '19:00' },
  ]).error,
  /après/
);
assert.match(
  parseDisponibilites([
    { jour: 'Lundi', debut: '24:00', fin: '25:00' },
    { jour: 'Mardi', debut: '18:00', fin: '19:00' },
  ]).error,
  /début et de fin/
);
assert.match(parseDisponibilites('x').error, /2 jours/);
assert.match(parseDisponibilites([null, 3, { jour: 'Lundi' }]).error, /2 jours/);

console.log('validators.check OK');
