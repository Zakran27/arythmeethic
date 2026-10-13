// Auto-test : `node lib/fin-de-contrat-spots.check.mjs` (Node ≥ 23, types TS retirés nativement).
// PDF synthétiques (aucune donnée réelle) reproduisant la mise en page des modèles Urssaf / France Travail.
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { SPOTS, locateSignatureAreas } from './fin-de-contrat-spots.ts';

const A4 = [595.28, 841.89];

// Une page A4 par entrée ; chaque texte posé en (x, yHaut) en points depuis le haut de la page
async function pdf(pages) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const texts of pages) {
    const page = doc.addPage(A4);
    for (const [text, x, yTop] of texts) {
      page.drawText(text, { x, y: A4[1] - yTop, size: 10, font });
    }
  }
  return Buffer.from(await doc.save());
}
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.005, `${msg} : ${a} ≠ ${b}`);
const solde = SPOTS.FIN_DE_CONTRAT_SOLDE_TOUT_COMPTE;
const certif = SPOTS.FIN_DE_CONTRAT_CERTIFICAT_TRAVAIL;
const attest = SPOTS.FIN_DE_CONTRAT_ATTESTATION_EMPLOYEUR;

// Reçu pour solde de tout compte : deux libellés sur la même ligne (y = 0.670 sur le modèle)
{
  const file = await pdf([
    [
      ['RECU POUR SOLDE DE TOUT COMPTE', 200, 100],
      ['SIGNATURE DU SALARIE :', 20, 564],
      ['SIGNATURE DE L’EMPLOYEUR :', 300, 564],
    ],
  ]);
  const { areas, anchored } = await locateSignatureAreas(file, [solde.florence, solde.client]);
  assert.deepEqual(anchored, [true, true]);
  near(areas[0].x, 20 / A4[0], 'salarié x');
  near(areas[1].x, 300 / A4[0], 'employeur x');
  near(areas[0].y, 564 / A4[1] + 0.01, 'case sous le libellé');
  assert.equal(areas[0].page, 1);
}

// Lignes en plus : le libellé descend de 60 pt, la case suit
{
  const file = await pdf([[['SIGNATURE DE L’EMPLOYEUR :', 20, 488 + 60]]]);
  const { areas, anchored } = await locateSignatureAreas(file, [certif.client]);
  assert.deepEqual(anchored, [true]);
  near(areas[0].y, (488 + 60) / A4[1] + 0.01, 'case décalée avec le texte');
}

// Libellé découpé en plusieurs morceaux de texte + apostrophe droite
{
  const file = await pdf([
    [
      ['SIGNATURE', 20, 488],
      ["DE L'EMPLOYEUR :", 80, 488],
    ],
  ]);
  const { anchored } = await locateSignatureAreas(file, [certif.client]);
  assert.deepEqual(anchored, [true]);
}

// Attestation France Travail : « Signature » seul, sur la dernière page ; la mention « signature »
// dans une phrase de la page 2 ne compte pas
{
  const file = await pdf([
    [['Attestation employeur', 200, 100]],
    [['de la démission ou de signature de la convention de rupture', 47, 111]],
    [['Signature', 460, 431]],
  ]);
  const { areas, anchored } = await locateSignatureAreas(file, [attest.client]);
  assert.deepEqual(anchored, [true]);
  assert.equal(areas[0].page, 3);
  near(areas[0].x, 460 / A4[0] - 0.09, 'cadre décalé à gauche');
}

// Scan / autre modèle (aucun texte) : position des modèles + marge, dernière page
{
  const file = await pdf([[], []]);
  const { areas, anchored } = await locateSignatureAreas(file, [solde.florence, solde.client]);
  assert.deepEqual(anchored, [false, false]);
  assert.equal(areas[1].page, 2);
  assert.equal(areas[1].x, solde.client.fallback.x);
  assert.equal(areas[1].y, solde.client.fallback.y);
}

// Libellé tout en bas de page : la case reste dans la page
{
  const file = await pdf([[['SIGNATURE DE L’EMPLOYEUR :', 20, 835]]]);
  const { areas } = await locateSignatureAreas(file, [certif.client]);
  assert.ok(areas[0].y + areas[0].h <= 1, 'case dans la page');
}

console.log('fin-de-contrat-spots : OK');
