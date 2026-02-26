import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { Client } from '@/types';

interface ContractParticulierData {
  client: Client;
  anneeScolaire: string;
  dateDebut: string;
  dateFin: string;
  dureePeriodeEssai: string;
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
    dureePeriodeEssai,
    salaireHoraireNet,
    signerFirstName,
    signerLastName,
    signerEmail,
    signerPhone,
  } = data;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const PAGE_W = 595;
  const PAGE_H = 842;
  const MARGIN = 50;
  const BOTTOM_LIMIT = 80;

  let currentPage: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN; // 792

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

  const writeRight = (text: string, size: number, bold = false, atY?: number) => {
    const targetY = atY !== undefined ? atY : y;
    currentPage.drawText(text, {
      x: MARGIN + 250,
      y: targetY,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
  };

  const br = (space = 8) => { y -= space; };

  // ===== TITRE =====
  write('Contrat de travail a duree determinee (CDD)', 14, true);
  write('Salarie du particulier employeur - Code IDCC : 3239', 11);
  br(20);

  // ===== PARTICULIER EMPLOYEUR =====
  write('Entre le particulier employeur :', 11, true);
  br(4);
  write(`Nom de naissance : ${signerLastName}`, 10);
  write(`Nom d'usage : ${signerLastName}   Prenom : ${signerFirstName}`, 10);
  write(`E-mail : ${signerEmail}`, 10);
  write(`Adresse : ${client.adresse_cours || client.address_line1 || ''}`, 10);
  write(`Ville : ${client.city || ''}   Code postal : ${client.postal_code || ''}`, 10);
  write(`N de telephone : ${signerPhone || ''}`, 10);
  write(`N de CESU : ${client.numero_cesu || ''}`, 10);
  br(14);

  // ===== SALARIE (FLORENCE) =====
  write('Et le salarie :', 11, true);
  br(4);
  write('Nom de naissance : LOUAZEL', 10);
  write("Nom d'usage : LOUAZEL   Prenom : FLORENCE", 10);
  write('E-mail : florence.louazel@ARythmeEthic.onmicrosoft.com', 10);
  write('Adresse : 3 RUE ARTHUR RIMBAUD', 10);
  write('Ville : 44470   Code postal : 44 470', 10);
  write('N de telephone : 06 46 75 37 36', 10);
  write('N de Securite sociale : 2 97 04 35 238 643 63', 10);
  br(18);

  // ===== SECTION 1 : ENGAGEMENT =====
  write('1. Engagement', 12, true);
  br(6);

  write('Convention collective', 10, true);
  write('Ce contrat est regi par les dispositions de la Convention collective nationale de la branche du', 9);
  write("secteur des particuliers employeurs et de l'emploi a domicile. Le salarie est informe de la possibilite", 9);
  write('de consulter le texte de la convention collective sur le site www.legifrance.gouv.fr.', 9);
  br(8);

  write('Retraite complementaire et prevoyance', 10, true);
  write('Les institutions competentes en matiere de retraite et de prevoyance sont :', 9);
  write('  Ircem AGIRC/ARRCO', 9);
  write('  Ircem prevoyance', 9);
  write('  Toutes deux domiciliees : 261 avenue des Nations-Unies - BP 593 - 59 060 ROUBAIX Cedex.', 9);
  br(14);

  // ===== SECTION 2 : DATE D'EFFET =====
  write("2. Date d'effet du contrat", 12, true);
  br(6);
  write(
    `Le CDD est conclu en raison d'un besoin en cours particuliers durant l'annee scolaire ${anneeScolaire}.`,
    9
  );
  br(8);

  write('Duree du contrat', 10, true);
  write(`Le contrat est conclu a partir du ${formatDate(dateDebut)} jusqu'au ${formatDate(dateFin)}.`, 9);
  br(8);

  write("Periode d'essai", 10, true);
  write(`Duree de la periode d'essai : ${dureePeriodeEssai}`, 9);
  write("La duree maximale de la periode d'essai depend de la duree du contrat :", 9);
  write('  Pour un CDD inferieur ou egal a 6 mois : 1 jour par semaine, dans la limite de 2 semaines.', 9);
  write("  Pour un CDD superieur a 6 mois : 1 jour par semaine, dans la limite d'1 mois.", 9);
  write('Ces durees sont applicables que le salarie soit embauche a temps plein ou a temps partiel.', 9);
  br(14);

  // ===== SECTION 3 : LIEU HABITUEL DE TRAVAIL =====
  write('3. Lieu habituel de travail', 12, true);
  br(6);
  write("Domicile de l'employeur", 10, true);
  write(`Adresse : ${client.adresse_cours || client.address_line1 || ''}`, 9);
  write(`Ville : ${client.city || ''}   Code postal : ${client.postal_code || ''}`, 9);
  br(14);

  // ===== SECTION 4 : NATURE DE L'EMPLOI =====
  write("4. Nature de l'emploi", 12, true);
  br(6);
  write("Le salarie occupe un emploi d'enseignante a domicile en mathematiques.", 9);
  br(14);

  // ===== SECTION 5 : DUREE ET HORAIRES DE TRAVAIL =====
  write('5. Duree et horaires de travail', 12, true);
  br(6);
  write("La duree de travail est dite irreguliere au sens de l'article 132 de la Convention collective", 9);
  write("nationale de la branche du secteur des particuliers employeurs et de l'emploi a domicile.", 9);
  write('La duree est comprise entre 0 heure et 48 heures maximum par semaine.', 9);
  write("Le particulier employeur informe par ecrit dans le respect d'un delai de prevenance de 5 jours", 9);
  write('calendaires des jours et des horaires de travail. Le planning est remis au salarie par sms.', 9);
  write("Lorsque le salarie a plusieurs particuliers employeurs, il s'engage a ne pas exceder la duree", 9);
  write('maximale de travail hebdomadaire prevue par la Convention collective.', 9);
  br(10);

  write('Repos hebdomadaire', 10, true);
  write(
    "La periode de repos hebdomadaire est fixee au dimanche, auquel s'ajoute le repos quotidien de 11 heures.",
    9
  );
  write(
    'Le travail lors de la periode de repos hebdomadaire est remunere au taux horaire du, majore de 25 %.',
    9
  );
  br(14);

  // ===== SECTION 6 : JOURS FERIES =====
  write('6. Jours feries', 12, true);
  br(6);
  write('Le 1er mai est chome.', 9);
  br(4);
  write(
    'Les jours feries ordinaires suivants sont chomes : 1er janvier, Lundi de Paques, 8 mai,',
    9
  );
  write(
    "Jeudi de l'Ascension, Lundi de Pentecote, 14 juillet, 15 aout, 1er novembre, 11 novembre, 25 decembre.",
    9
  );
  br(4);
  write(
    'Le jour ferie chome qui tombe un jour habituellement travaille par le salarie est remunere.',
    9
  );
  write(
    "En contrepartie du travail un jour ferie ordinaire, le salarie percoit une remuneration majoree de 10 %",
    9
  );
  write('calculee sur la base du salaire habituel fixe au present contrat.', 9);
  br(14);

  // ===== SECTION 7 : REMUNERATION =====
  write('7. Remuneration', 12, true);
  br(6);
  write(
    `Le salaire net est majore de 10 % au titre des conges payes. Le salaire net horaire de base est de : ${salaireHoraireNet.toFixed(2)} EUR.`,
    9
  );
  br(8);

  write('Remuneration ou recuperation des heures supplementaires', 10, true);
  write(
    "Les heures de travail excedant une duree hebdomadaire de 40 heures sont remuneres au taux horaire normal",
    9
  );
  write(
    "majore de 25 % au-dela de la 40e heure et jusqu'a la 48e heure incluse,",
    9
  );
  write('et de 50 % pour la 49e heure et la 50e heure de travail.', 9);
  br(8);

  write('Indemnites kilometriques', 10, true);
  write(
    "Si le salarie est amene a utiliser son vehicule personnel pour les besoins de son activite professionnelle,",
    9
  );
  write("il beneficie d'une indemnite kilometrique calculee sur la base suivante : 0,636 EUR/km.", 9);
  br(14);

  // ===== SECTION 8 : CONFIDENTIALITE =====
  write('8. Confidentialite', 12, true);
  br(6);
  write(
    "Les parties s'engagent a conserver confidentielles les informations personnelles transmises entre elles",
    9
  );
  write(
    "dans le cadre de l'execution du present contrat. Elles prennent les mesures necessaires pour garantir",
    9
  );
  write('cette confidentialite.', 9);
  br(24);

  // ===== SIGNATURES =====
  // Ensure enough room for the full signature block (~130px)
  if (y < 160) newPage();

  const today = new Date().toLocaleDateString('fr-FR');
  write(`Date : ${today}`, 9);
  write('Fait a Thouare-sur-Loire', 9);
  br(28);

  // "Signature salarie :" on the left, "Signature employeur :" on the right — same line
  const sigLabelY = y;
  write('Signature salarie :', 9); // moves y down
  writeRight('Signature employeur :', 9, false, sigLabelY);

  // Record position for Yousign: below "Signature employeur :" label, right column
  const signaturePage = pdfDoc.getPageCount(); // 1-indexed
  const signatureX = MARGIN + 250; // 300 — aligns with "Signature employeur :"
  const signatureY = sigLabelY - 55; // ~55px below the label

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    signaturePage,
    signatureX,
    signatureY,
  };
}
