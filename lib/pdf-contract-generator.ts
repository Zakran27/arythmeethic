import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from '@/types';

interface ContractData {
  client: Client;
  anneeScolaire: string;
  tarifHoraireHT?: number;
}

export interface ContractEcoleResult {
  buffer: Buffer;
  signaturePage: number; // 1-indexed
  signatureX: number;
  signatureY: number;
  florenceSignatureX: number;
  florenceSignatureY: number;
}

export async function generateContractPDF(data: ContractData): Promise<ContractEcoleResult> {
  const { client, anneeScolaire, tarifHoraireHT = 44.8 } = data;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const fontsDir = join(process.cwd(), 'public', 'fonts');
  const fontBytes = readFileSync(join(fontsDir, 'NotoSans-Regular.ttf'));
  const fontBoldBytes = readFileSync(join(fontsDir, 'NotoSans-Bold.ttf'));
  const fontItalicBytes = readFileSync(join(fontsDir, 'NotoSans-Italic.ttf'));

  const font = await pdfDoc.embedFont(fontBytes);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  const fontItalic = await pdfDoc.embedFont(fontItalicBytes);

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

  const write = (text: string, size: number, bold = false, indent = 0, italic = false) => {
    if (y < BOTTOM_LIMIT) newPage();
    currentPage.drawText(text, {
      x: MARGIN + indent,
      y,
      size,
      font: italic ? fontItalic : bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 4;
  };

  const writeRed = (text: string, size: number) => {
    if (y < BOTTOM_LIMIT) newPage();
    currentPage.drawText(text, {
      x: MARGIN,
      y,
      size,
      font: font,
      color: rgb(0.8, 0, 0),
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
  write(`PROPOSITION DE SERVICE - Enseignement`, 14, true);
  write(`${client.organisation || ''} – ${anneeScolaire}`, 12, true);
  br(20);

  // ===== PARTIES =====
  write('Entre les soussignés :', 11, true);
  br(8);

  write(
    `1 – Le donneur d'ordre : ${client.organisation || ''} – ${client.ecole_statut_juridique || ''}`,
    10
  );
  write(`  ${client.address_line1 || ''}`, 10);
  write(`  ${client.postal_code || ''} - ${client.city || ''}`, 10);
  write(`  N° SIRET ${client.ecole_siret || ''}`, 10);
  write(
    `  Organisme de formation enregistré sous le numéro ${client.ecole_nda || ''} auprès du Préfet`,
    10
  );
  write(`  de la région ${client.ecole_nda_region || ''}`, 10);
  br(8);

  write('Et', 10);
  br(8);

  write('2 – Le sous-traitant : A Rythme Ethic – Entreprise individuelle', 10, true);
  write('  3 rue Arthur Rimbaud', 10);
  write('  44 470 THOUARÉ SUR LOIRE', 10);
  write('  N° SIRET 990 194 763 00019', 10);
  write(
    '  Organisme de formation enregistré sous le numéro 52 44 12563 44 auprès du Préfet de la',
    10
  );
  write('  région Pays de la Loire', 10);
  br(14);

  write('Il a été convenu ce qui suit :', 10);
  br(14);

  // ===== ARTICLE 1 =====
  write('Article 1 : Nature du contrat', 11, true);
  br(6);
  write(
    "Le présent contrat est conclu dans le cadre d'une prestation de formation réalisée par le sous-",
    9
  );
  write("traitant au bénéfice du donneur d'ordre.", 9);
  write(
    'Le sous-traitant intervient en toute indépendance, sans exclusivité, et organise librement ses',
    9
  );
  write("méthodes pédagogiques dans le respect du cadre fixé par le donneur d'ordre.", 9);
  br(12);

  // ===== ARTICLE 2 =====
  write('Article 2 : Objet du contrat', 11, true);
  br(6);
  write(`  Enseignement dont le thème est : ${client.ecole_module_nom || ''}`, 9);
  write(`  Formation à destination ${client.ecole_classes_noms || ''}`, 9);
  write(
    `  Période : année scolaire ${anneeScolaire} à compter du 1er septembre et jusqu'au 31 août`,
    9
  );
  write(`  de l'année suivante`, 9);
  write(
    `  Volume horaire de face à face pédagogique : ${client.ecole_module_heures || ''} heures`,
    9
  );
  write(`  Nombre prévisionnel d'apprenants : ${client.ecole_groupe_taille || ''}`, 9);
  write(`  Intervenant(e) : Florence LOUAZEL`, 9);
  write(
    `  Diplôme de l'intervenant(e) : Diplôme d'ingénieur généraliste – ECAM Louis de Broglie`,
    9
  );
  br(8);
  writeRed(
    "Toute réévaluation fera l'objet d'un avenant précisant le nouveau tarif horaire HT et prendra",
    9
  );
  writeRed('effet après signature des deux parties.', 9);
  br(12);

  // ===== ARTICLE 3 =====
  write(
    'Article 3 : Contenu des actions / modalités / moyens techniques et pédagogiques mobilisés',
    11,
    true
  );
  br(6);
  write('Objectifs pédagogiques généraux :', 9, false, 0, true);
  br(20);
  write('Actions et modalités pédagogiques :', 9, false, 0, true);
  br(20);
  write('Moyens techniques mobilisés :', 9, false, 0, true);
  br(20);
  write(
    'Le sous-traitant est tenu à une obligation de moyens dans la réalisation de la formation.',
    9
  );
  br(12);

  // ===== ARTICLE 4 =====
  write('Article 4 : Durée du contrat', 11, true);
  br(6);
  write(
    "Le présent contrat est strictement limité à la prestation de formation visée à l'article 2.",
    9
  );
  write(
    "Il cesse de plein droit à son terme. Le présent contrat ne fait l'objet d'aucune reconduction tacite.",
    9
  );
  br(12);

  // ===== ARTICLE 5 =====
  write('Article 5 : Obligations du sous-traitant', 11, true);
  br(6);
  write("Le sous-traitant s'engage à :", 9);
  write(
    "  - Communiquer au donneur d'ordre une copie de son attestation d'immatriculation au registre",
    9
  );
  write('    national des entreprises ;', 9);
  write('  - Préparer les cours ;', 9);
  write(
    "  - Animer les cours dans le respect des objectifs fixés par le donneur d'ordre et le syllabus ;",
    9
  );
  write(
    '  - Mettre à disposition des apprenants les supports pédagogiques via une plateforme en ligne ;',
    9
  );
  write("  - La validation de la présence des élèves sur l'ERP du donneur d'ordre ;", 9);
  write("  - Réaliser les évaluations écrites ou orales selon l'usage dans l'établissement ;", 9);
  write("  - Corriger les copies et saisir les notes sur l'ERP du donneur d'ordre.", 9);
  br(6);
  write(
    'Le sous-traitant peut se faire remplacer par un intervenant de qualification équivalente, sous',
    9
  );
  write("réserve d'information préalable du donneur d'ordre.", 9);
  br(6);
  write(
    'Ces obligations sont exécutées librement par le sous-traitant, sans contrôle hiérarchique ni',
    9
  );
  write("pouvoir disciplinaire du donneur d'ordre.", 9);
  br(6);
  write(
    "L'utilisation des outils du donneur d'ordre est strictement limitée aux nécessités pédagogiques et",
    9
  );
  write('administratives de la mission et ne saurait constituer un indice de subordination.', 9);
  br(12);

  // ===== ARTICLE 6 =====
  write("Article 6 : Obligations du donneur d'ordre", 11, true);
  br(6);
  write("Le donneur d'ordre s'engage à :", 9);
  write("  - Confier au sous-traitant la formation prévue à l'article 2 ;", 9);
  write('  - Prendre en charge la gestion administrative et logistique de la formation ;', 9);
  write(
    '  - Transmettre au sous-traitant une copie des questionnaires de satisfaction remplis par les',
    9
  );
  write("    élèves à l'issue de la formation ;", 9);
  write(
    "  - Prévenir le sous-traitant au moins 8 jours à l'avance en cas d'annulation ou de report.",
    9
  );
  br(6);
  write(
    "Pour des raisons de contraintes d'organisation, les dates d'intervention peuvent être modifiées",
    9
  );
  write('selon des modalités convenues et validées par les deux parties.', 9);
  br(6);
  write(
    "Toute annulation moins de 10 jours avant l'intervention donnera lieu à facturation de 25 % des",
    9
  );
  write(
    "heures prévues si aucun report n'est envisageable. Le report devra intervenir dans un délai",
    9
  );
  write(
    'maximum de deux (2) mois à compter de la date initialement prévue. À défaut, la facturation',
    9
  );
  write("prévue s'appliquera.", 9);
  br(12);

  // ===== ARTICLE 7 =====
  write('Article 7 : Modalités financières', 11, true);
  br(6);
  write(
    `Le sous-traitant percevra une rémunération de ${tarifHoraireHT.toFixed(2)} euros HT par heure de face à face pédagogique.`,
    9
  );
  br(6);
  if (client.ecole_frais_km_prix) {
    write(
      `Des frais de déplacement seront appliqués pour ${Number(client.ecole_frais_km_prix).toFixed(3)} euros/kilomètre.`,
      9
    );
    br(6);
  }
  write(
    "Le sous-traitant s'engage à éditer une facture mensuelle pour les heures réellement effectuées",
    9
  );
  write('durant le mois, pendant toute la durée du contrat.', 9);
  br(4);
  write('Le paiement sera effectué selon les modalités suivantes :', 9);
  write('  paiement sous 30 jours à la réception de la facture ;', 9);
  write('  paiement par virement.', 9);
  br(6);
  write(
    'En cas de défaut de paiement, des pénalités de retard seront appliquées pour chaque jour de',
    9
  );
  write(
    'retard (calculées à partir du lendemain de la date de règlement indiquée sur la facture) ainsi',
    9
  );
  write("qu'une indemnité forfaitaire de recouvrement.", 9);
  write(
    "Les pénalités de retard sont calculées au taux de trois (3) fois le taux d'intérêt légal, ainsi",
    9
  );
  write(
    "qu'une indemnité forfaitaire pour frais de recouvrement de 40 euros, conformément à l'article",
    9
  );
  write('L.441-10 du Code de commerce.', 9);
  br(12);

  // ===== ARTICLE 8 =====
  write('Article 8 : Résiliation anticipée', 11, true);
  br(6);
  write(
    "En cas de manquement grave à l'une des obligations contractuelles ou en cas de force majeure",
    9
  );
  write(
    'dûment reconnue, chaque partie pourra résilier le présent contrat de manière anticipée, par',
    9
  );
  write('lettre recommandée avec accusé de réception, moyennant un préavis de 2 semaines.', 9);
  write(
    "Les prestations effectuées jusqu'à la date de résiliation devront être intégralement réglées. Les",
    9
  );
  write('sommes déjà perçues par le sous-traitant lui demeureront acquises.', 9);
  br(12);

  // ===== ARTICLE 9 =====
  write('Article 9 : Litige', 11, true);
  br(6);
  write(
    "En cas de litige relatif à l'interprétation ou l'exécution du présent contrat, les parties",
    9
  );
  write(
    "s'efforceront de le résoudre à l'amiable. À défaut, le litige sera porté devant les tribunaux",
    9
  );
  write('compétents du ressort du siège social du sous-traitant.', 9);
  br(12);

  // ===== ARTICLE 10 =====
  write('Article 10 : Protection des données personnelles', 11, true);
  br(6);
  write(
    "Le sous-traitant s'engage à respecter les obligations issues du Règlement Général sur la",
    9
  );
  write(
    "Protection des Données (RGPD). Il ne conservera ni n'utilisera les données personnelles",
    9
  );
  write('auxquelles il pourrait avoir accès en dehors du strict cadre de sa mission.', 9);
  br(12);

  // ===== ARTICLE 11 =====
  write('Article 11 : Dispositions diverses', 11, true);
  br(6);
  write(
    '  Le présent contrat ne crée entre les parties aucun lien de subordination, le sous-traitant',
    9
  );
  write(
    '  demeurant libre et responsable du contenu de la formation dans le respect du syllabus ;',
    9
  );
  write(
    "  Toute modification éventuelle de la présente convention fera l'objet d'un avenant signé par",
    9
  );
  write('  les parties ;', 9);
  write(
    "  Le sous-traitant dispose d'une propriété intellectuelle et/ou artistique sur le contenu de",
    9
  );
  write('  sa formation ;', 9);
  write(
    "  Le donneur d'ordre bénéficie d'un droit d'usage strictement limité à l'exécution du présent",
    9
  );
  write("  contrat, à l'exclusion de toute exploitation ultérieure.", 9);
  br(12);

  // ===== ARTICLE 12 =====
  write('Article 12 : Confidentialité', 11, true);
  br(6);
  write(
    "Le sous-traitant s'engage à conserver strictement confidentielles toutes les informations,",
    9
  );
  write(
    'documents et données de toute nature dont il pourrait avoir connaissance dans le cadre de',
    9
  );
  write(
    "l'exécution du présent contrat, et notamment les informations pédagogiques, administratives,",
    9
  );
  write("commerciales ou stratégiques du donneur d'ordre.", 9);
  write(
    "Cette obligation de confidentialité s'applique pendant toute la durée du contrat et subsiste",
    9
  );
  write('pendant une durée de cinq (5) ans après son expiration ou sa résiliation.', 9);
  br(6);
  write('Ne sont pas considérées comme confidentielles les informations :', 9);
  write('  tombées dans le domaine public sans faute du sous-traitant ;', 9);
  write('  déjà connues du sous-traitant avant leur communication ;', 9);
  write('  obtenues légalement auprès de tiers.', 9);
  br(12);

  // ===== ARTICLE 13 =====
  write('Article 13 : Assurance – Responsabilité civile professionnelle', 11, true);
  br(6);
  write(
    "Le sous-traitant déclare être titulaire d'une assurance de responsabilité civile professionnelle",
    9
  );
  write(
    "couvrant les dommages corporels, matériels et immatériels pouvant résulter de l'exécution de",
    9
  );
  write('la prestation de formation.', 9);
  write(
    "Une attestation d'assurance en cours de validité pourra être fournie au donneur d'ordre sur",
    9
  );
  write('simple demande.', 9);
  write(
    'La responsabilité du sous-traitant est limitée aux dommages directs prouvés et ne saurait en',
    9
  );
  write(
    "aucun cas couvrir les dommages indirects, pertes d'exploitation ou préjudices commerciaux.",
    9
  );
  br(12);

  // ===== ARTICLE 14 =====
  write('Article 14 : Non-exclusivité', 11, true);
  br(6);
  write("Le présent contrat n'emporte aucune obligation d'exclusivité.", 9);
  write(
    "Le sous-traitant demeure libre de fournir des prestations similaires ou concurrentes à d'autres",
    9
  );
  write(
    'établissements, organismes ou entreprises, y compris pendant la durée du présent contrat, sous',
    9
  );
  write('réserve du respect de ses obligations de confidentialité et de loyauté.', 9);
  br(12);

  // ===== ARTICLE 15 =====
  write('Article 15 : Force majeure', 11, true);
  br(6);
  write(
    "Aucune des parties ne pourra être tenue responsable de l'inexécution ou du retard dans",
    9
  );
  write(
    "l'exécution de l'une quelconque de ses obligations lorsque cette inexécution résulte d'un cas de",
    9
  );
  write("force majeure au sens de l'article 1218 du Code civil.", 9);
  write(
    'Sont notamment considérés comme cas de force majeure : les catastrophes naturelles, incendies,',
    9
  );
  write(
    'pandémies, grèves, conflits sociaux, interruptions des réseaux de communication ou de transport,',
    9
  );
  write(
    'décisions administratives, ou toute autre circonstance indépendante de la volonté des parties.',
    9
  );
  write(
    "La partie invoquant un cas de force majeure devra en informer l'autre partie dans les meilleurs",
    9
  );
  write(
    "délais. L'exécution du contrat sera suspendue pendant la durée du cas de force majeure.",
    9
  );
  br(12);

  // ===== ARTICLE 16 =====
  write('Article 16 : Cession du contrat', 11, true);
  br(6);
  write("Le présent contrat est conclu intuitu personae à l'égard du sous-traitant.", 9);
  write(
    "Il ne pourra être cédé, transféré ou apporté, en tout ou partie, par le donneur d'ordre, à",
    9
  );
  write("quelque titre que ce soit, sans l'accord préalable et écrit du sous-traitant.", 9);
  br(24);

  // ===== SIGNATURES =====
  if (y < 160) newPage();

  const today = new Date().toLocaleDateString('fr-FR');
  write(`Fait à Thouaré-sur-Loire le ${today}`, 10, true);
  br(28);

  // "Le donneur d'ordre," on the left, "Le sous-traitant," on the right — same y
  const sigLabelY = y;
  write("Le donneur d'ordre,", 9);
  writeRight('Le sous-traitant,', 9, sigLabelY);
  br(4);
  write('[Nom, prénom, qualité, signature, tampon]', 9, false, 0, true);

  // Yousign fields: client (donneur d'ordre) on left, Florence (sous-traitant) on right
  const signaturePage = pdfDoc.getPageCount();
  const signatureX = MARGIN; // left column — donneur d'ordre
  const signatureY = sigLabelY - 80;
  const florenceSignatureX = MARGIN + 250; // right column — sous-traitant
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
