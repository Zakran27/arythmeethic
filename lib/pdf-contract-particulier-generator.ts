import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from '@/types';

interface ContractParticulierData {
  client: Client;
  anneeScolaire: string;
  dateDebut: string;
  dateFin: string;
  salaireHoraireNet: number;
  signerFirstName: string;
  signerLastName: string;
  signerEmail: string;
  signerPhone?: string;
}

export interface ContractParticulierResult {
  buffer: Buffer;
  signaturePage: number; // 1-indexed
  signatureX: number;
  signatureY: number;
  florenceSignatureX: number;
  florenceSignatureY: number;
}

function formatDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export async function generateContractParticulierPDF(
  data: ContractParticulierData
): Promise<ContractParticulierResult> {
  const {
    client,
    anneeScolaire,
    dateDebut,
    dateFin,
    salaireHoraireNet,
    signerFirstName,
    signerLastName,
    signerEmail,
    signerPhone,
  } = data;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontsDir = join(process.cwd(), 'public', 'fonts');
  const fontBytes = readFileSync(join(fontsDir, 'NotoSans-Regular.ttf'));
  const fontBoldBytes = readFileSync(join(fontsDir, 'NotoSans-Bold.ttf'));

  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 50;
  const BOTTOM_LIMIT = 80;

  let currentPage: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const write = (text: string, size: number, bold = false, indent = 0) => {
    if (y < BOTTOM_LIMIT) newPage();
    currentPage.drawText(text, {
      x: MARGIN + indent,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 4;
  };

  const writeRight = (text: string, size: number, atY: number) => {
    currentPage.drawText(text, {
      x: MARGIN + 250,
      y: atY,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const br = (space = 8) => {
    y -= space;
  };

  // ===== TITRE =====
  write('Contrat de travail à durée déterminée (CDD)', 14, true);
  write('Salarié du particulier employeur - Code IDCC : 3239', 11);
  br(20);

  // ===== PARTICULIER EMPLOYEUR =====
  write('Entre le particulier employeur :', 11, true);
  br(4);
  write(`Nom de naissance : ${signerLastName}`, 10);
  write(`Nom d'usage : ${signerLastName}   Prénom : ${signerFirstName}`, 10);
  write(`E-mail : ${signerEmail}`, 10);
  write(`Adresse : ${client.adresse_cours || client.address_line1 || ''}`, 10);
  write(`Ville : ${client.city || ''}   Code postal : ${client.postal_code || ''}`, 10);
  write(`N° de téléphone : ${signerPhone || ''}`, 10);
  write(`N° de CESU : ${client.numero_cesu || ''}`, 10);
  br(14);

  // ===== SALARIÉ (FLORENCE) =====
  write('Et le salarié :', 11, true);
  br(4);
  write('Nom de naissance : LOUAZEL', 10);
  write("Nom d'usage : LOUAZEL   Prénom : FLORENCE", 10);
  write('E-mail : florence.louazel@arythmeethic.fr', 10);
  write('Adresse : 3 RUE ARTHUR RIMBAUD', 10);
  write('Ville : THOUARÉ-SUR-LOIRE   Code postal : 44 470', 10);
  write('N° de téléphone : 06 46 75 37 36', 10);
  write('N° de Sécurité sociale : 2 97 04 35 238 643 63', 10);
  br(18);

  // ===== SECTION 1 : ENGAGEMENT =====
  write('1. Engagement', 12, true);
  br(6);

  write('Convention collective', 10, true);
  write(
    'Ce contrat est régi par les dispositions de la Convention collective nationale de la branche du',
    9
  );
  write(
    "secteur des particuliers employeurs et de l'emploi à domicile. Le salarié est informé de la",
    9
  );
  write('possibilité de consulter le texte sur le site www.legifrance.gouv.fr.', 9);
  br(8);

  write('Retraite complémentaire et prévoyance', 10, true);
  write('Les institutions compétentes en matière de retraite et de prévoyance sont :', 9);
  write('  Ircem AGIRC/ARRCO', 9);
  write('  Ircem prévoyance', 9);
  write(
    '  Toutes deux domiciliées : 261 avenue des Nations-Unies - BP 593 - 59 060 ROUBAIX Cedex.',
    9
  );
  br(14);

  // ===== SECTION 2 : DATE D'EFFET =====
  write("2. Date d'effet du contrat", 12, true);
  br(6);
  write(
    `Le CDD est conclu en raison d'un besoin en cours particuliers durant l'année scolaire ${anneeScolaire}.`,
    9
  );
  br(8);

  write('Durée du contrat', 10, true);
  write(
    `Le contrat est conclu à partir du ${formatDate(dateDebut)} jusqu'au ${formatDate(dateFin)}.`,
    9
  );
  br(8);

  br(14);

  // ===== SECTION 3 : LIEU DE TRAVAIL =====
  write('3. Lieu habituel de travail', 12, true);
  br(6);
  write("Domicile de l'employeur", 10, true);
  write(`Adresse : ${client.adresse_cours || client.address_line1 || ''}`, 9);
  write(`Ville : ${client.city || ''}   Code postal : ${client.postal_code || ''}`, 9);
  br(14);

  // ===== SECTION 4 : NATURE DE L'EMPLOI =====
  write("4. Nature de l'emploi", 12, true);
  br(6);
  write("Le salarié occupe un emploi d'enseignante à domicile en mathématiques.", 9);
  br(14);

  // ===== SECTION 5 : DURÉE ET HORAIRES =====
  write('5. Durée et horaires de travail', 12, true);
  br(6);
  write(
    "La durée de travail est dite irrégulière au sens de l'article 132 de la Convention collective",
    9
  );
  write(
    "nationale de la branche du secteur des particuliers employeurs et de l'emploi à domicile.",
    9
  );
  write('La durée est comprise entre 0 heure et 48 heures maximum par semaine.', 9);
  write(
    "Le particulier employeur informe par écrit dans le respect d'un délai de prévenance de",
    9
  );
  write(
    '5 jours calendaires des jours et des horaires de travail. Le planning est remis au salarié par sms.',
    9
  );
  write(
    "Lorsque le salarié a plusieurs particuliers employeurs, il s'engage à ne pas excéder la durée",
    9
  );
  write('maximale de travail hebdomadaire prévue par la Convention collective.', 9);
  br(10);

  write('Repos hebdomadaire', 10, true);
  write(
    "La période de repos hebdomadaire est fixée au dimanche, à laquelle s'ajoute le repos quotidien de 11 heures.",
    9
  );
  write(
    'Le travail lors de la période de repos hebdomadaire est rémunéré au taux horaire majoré de 25 %.',
    9
  );
  br(14);

  // ===== SECTION 6 : JOURS FÉRIÉS =====
  write('6. Jours fériés', 12, true);
  br(6);
  write('Le 1er mai est chômé.', 9);
  br(4);
  write(
    'Les jours fériés ordinaires suivants sont chômés : 1er janvier, Lundi de Pâques, 8 mai,',
    9
  );
  write(
    "Jeudi de l'Ascension, Lundi de Pentecôte, 14 juillet, 15 août, 1er novembre, 11 novembre, 25 décembre.",
    9
  );
  br(4);
  write(
    'Le jour férié chômé qui tombe un jour habituellement travaillé par le salarié est rémunéré.',
    9
  );
  write(
    'En contrepartie du travail un jour férié ordinaire, le salarié perçoit une rémunération majorée de 10 %',
    9
  );
  write('calculée sur la base du salaire habituel fixé au présent contrat.', 9);
  br(14);

  // ===== SECTION 7 : RÉMUNÉRATION =====
  write('7. Rémunération', 12, true);
  br(6);
  write(
    `Le salaire net est majoré de 10 % au titre des congés payés. Le salaire net horaire de base est de : ${salaireHoraireNet.toFixed(2)} €.`,
    9
  );
  br(8);

  write('Rémunération ou récupération des heures supplémentaires', 10, true);
  write(
    'Les heures de travail excédant une durée hebdomadaire de 40 heures sont rémunérées au taux horaire',
    9
  );
  write("normal majoré de 25 % au-delà de la 40e heure et jusqu'à la 48e heure incluse,", 9);
  write('et de 50 % pour la 49e heure et la 50e heure de travail.', 9);
  br(8);

  write('Indemnités kilométriques', 10, true);
  write(
    'Si le salarié est amené à utiliser son véhicule personnel pour les besoins de son activité',
    9
  );
  write(
    "professionnelle, il bénéficie d'une indemnité kilométrique sur la base suivante : 0,636 €/km.",
    9
  );
  br(14);

  // ===== SECTION 8 : CONFIDENTIALITÉ =====
  write('8. Confidentialité', 12, true);
  br(6);
  write(
    "Les parties s'engagent à conserver confidentielles les informations personnelles transmises entre elles",
    9
  );
  write(
    "dans le cadre de l'exécution du présent contrat. Elles prennent les mesures nécessaires pour garantir",
    9
  );
  write('cette confidentialité.', 9);
  br(24);

  // ===== SIGNATURES =====
  if (y < 160) newPage();

  const today = new Date().toLocaleDateString('fr-FR');
  write(`Date : ${today}`, 9);
  write('Fait à Thouaré-sur-Loire', 9);
  br(28);

  const sigLabelY = y;
  write('Signature salarié :', 9);
  writeRight('Signature employeur :', 9, sigLabelY);

  // DocuSeal fields: Florence (salarié) on left, client (employeur) on right
  const signaturePage = pdfDoc.getPageCount();
  const signatureX = MARGIN + 250; // right column - employeur
  const signatureY = sigLabelY - 80;
  const florenceSignatureX = MARGIN; // left column - salarié
  const florenceSignatureY = sigLabelY - 80;

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    signaturePage,
    signatureX,
    signatureY,
    florenceSignatureX,
    florenceSignatureY,
  };
}
