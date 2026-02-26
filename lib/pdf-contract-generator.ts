import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { Client } from '@/types';

const TARIF_HORAIRE_HT = 44.8;

interface ContractData {
  client: Client;
  anneeScolaire: string;
}

export interface ContractEcoleResult {
  buffer: Buffer;
  signaturePage: number; // 1-indexed
  signatureX: number;
  signatureY: number;
}

export async function generateContractPDF(data: ContractData): Promise<ContractEcoleResult> {
  const { client, anneeScolaire } = data;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

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
  write('Entre les soussignes :', 11, true);
  br(8);

  write(
    `1 – Le donneur d'ordre : ${client.organisation || ''} – ${client.ecole_statut_juridique || ''}`,
    10
  );
  write(`  ${client.address_line1 || ''}`, 10);
  write(`  ${client.postal_code || ''} - ${client.city || ''}`, 10);
  write(`  N SIRET ${client.ecole_siret || ''}`, 10);
  write(
    `  Organisme de formation enregistre sous le numero ${client.ecole_nda || ''} aupres du Prefet`,
    10
  );
  write(`  de la region ${client.ecole_nda_region || ''}`, 10);
  br(8);

  write('Et', 10);
  br(8);

  write('2 – Le sous-traitant : A Rythme Ethic – Entreprise individuelle', 10, true);
  write('  3 rue Arthur Rimbaud', 10);
  write('  44 470 THOUARE SUR LOIRE', 10);
  write('  N SIRET 990 194 763 00019', 10);
  write(
    '  Organisme de formation enregistre sous le numero 52 44 12563 44 aupres du Prefet de la',
    10
  );
  write('  region Pays de la Loire', 10);
  br(14);

  write('Il a ete convenu ce qui suit :', 10);
  br(14);

  // ===== ARTICLE 1 =====
  write('Article 1 : Nature du contrat', 11, true);
  br(6);
  write(
    "Le present contrat est conclu dans le cadre d'une prestation de formation realisee par le sous-",
    9
  );
  write("traitant au benefice du donneur d'ordre.", 9);
  write(
    'Le sous-traitant intervient en toute independance, sans exclusivite, et organise librement ses',
    9
  );
  write("methodes pedagogiques dans le respect du cadre fixe par le donneur d'ordre.", 9);
  br(12);

  // ===== ARTICLE 2 =====
  write('Article 2 : Objet du contrat', 11, true);
  br(6);
  write(`  Enseignement dont le theme est : ${client.ecole_module_nom || ''}`, 9);
  write(`  Formation a destination ${client.ecole_classes_noms || ''}`, 9);
  write(
    `  Periode : annee scolaire ${anneeScolaire} a compter du 1er septembre et jusqu'au 31 aout`,
    9
  );
  write(`  de l'annee suivante`, 9);
  write(
    `  Volume horaire de face a face pedagogique : ${client.ecole_module_heures || ''} heures`,
    9
  );
  write(`  Nombre previsionnel d'apprenants : ${client.ecole_groupe_taille || ''}`, 9);
  write(`  Intervenant(e) : Florence LOUAZEL`, 9);
  write(
    `  Diplome de l'intervenant(e) : Diplome d'ingenieur generaliste – ECAM Louis de Broglie`,
    9
  );
  br(8);
  writeRed(
    "Toute reevaluation fera l'objet d'un avenant precisantle nouveau tarif horaire HT et prendra",
    9
  );
  writeRed('effet apres signature des deux parties.', 9);
  br(12);

  // ===== ARTICLE 3 =====
  write(
    'Article 3 : Contenu des actions/modalites/moyens techniques et pedagogiques mobilises',
    11,
    true
  );
  br(6);
  write('Objectifs pedagogiques generaux :', 9, false, 0, true);
  br(20);
  write('Actions et modalites pedagogiques :', 9, false, 0, true);
  br(20);
  write('Moyens techniques mobilises :', 9, false, 0, true);
  br(20);
  write(
    'Le sous-traitant est tenu a une obligation de moyens dans la realisation de la formation.',
    9
  );
  br(12);

  // ===== ARTICLE 4 =====
  write('Article 4 : Duree du contrat', 11, true);
  br(6);
  write(
    "Le present contrat est strictement limite a la prestation de formation visee a l'article 2.",
    9
  );
  write(
    "Il cesse de plein droit a son terme. Le present contrat ne fait l'objet d'aucune reconduction tacite.",
    9
  );
  br(12);

  // ===== ARTICLE 5 =====
  write('Article 5 : Obligations du sous-traitant', 11, true);
  br(6);
  write("Le sous-traitant s'engage a :", 9);
  write(
    "  - Communiquer au donneur d'ordre une copie de son attestation d'immatriculation au registre",
    9
  );
  write('    national des entreprises ;', 9);
  write('  - Preparer les cours ;', 9);
  write(
    "  - Animer les cours dans le respect des objectifs fixes par le donneur d'ordre et le syllabus ;",
    9
  );
  write(
    '  - Mettre a disposition des apprenants les supports pedagogiques via une plateforme en ligne ;',
    9
  );
  write("  - La validation de la presence des eleves sur l'ERP du donneur d'ordre ;", 9);
  write("  - Realiser les evaluations ecrites ou orales selon l'usage dans l'etablissement ;", 9);
  write("  - Corriger les copies et saisir les notes sur l'ERP du donneur d'ordre.", 9);
  br(6);
  write(
    'Le sous-traitant peut se faire remplacer par un intervenant de qualification equivalente, sous',
    9
  );
  write("reserve d'information prealable du donneur d'ordre.", 9);
  br(6);
  write(
    'Ces obligations sont executees librement par le sous-traitant, sans controle hierarchique ni',
    9
  );
  write("pouvoir disciplinaire du donneur d'ordre.", 9);
  br(6);
  write(
    "L'utilisation des outils du donneur d'ordre est strictement limitee aux necessites pedagogiques et",
    9
  );
  write('administratives de la mission et ne saurait constituer un indice de subordination.', 9);
  br(12);

  // ===== ARTICLE 6 =====
  write("Article 6 : Obligations du donneur d'ordre", 11, true);
  br(6);
  write("Le donneur d'ordre s'engage a :", 9);
  write("  - Confier au sous-traitant la formation prevue a l'article 2 ;", 9);
  write('  - Prendre en charge la gestion administrative et logistique de la formation ;', 9);
  write(
    '  - Transmettre au sous-traitant une copie des questionnaires de satisfaction remplis par les',
    9
  );
  write("    eleves a l'issue de la formation ;", 9);
  write(
    "  - Prevenir le sous-traitant au moins 8 jours a l'avance en cas d'annulation ou de report.",
    9
  );
  br(6);
  write(
    "Pour des raisons de contraintes d'organisation, les dates d'intervention peuvent etre modifiees",
    9
  );
  write('selon des modalites convenues et validees par les deux parties.', 9);
  br(6);
  write(
    "Toute annulation moins de 10 jours avant l'intervention donnera lieu a facturation de 25 % des",
    9
  );
  write(
    "heures prevues si aucun report n'est envisageable. Le report devra intervenir dans un delai",
    9
  );
  write(
    'maximum de deux (2) mois a compter de la date initialement prevue. A defaut, la facturation',
    9
  );
  write("prevue s'appliquera.", 9);
  br(12);

  // ===== ARTICLE 7 =====
  write('Article 7 : Modalites financieres', 11, true);
  br(6);
  write(
    `Le sous-traitant percevra une remuneration de ${TARIF_HORAIRE_HT.toFixed(2)} euros HT par heure de face a face pedagogique.`,
    9
  );
  br(6);
  if (client.ecole_frais_km_prix) {
    write(
      `Des frais de deplacement seront appliques pour ${Number(client.ecole_frais_km_prix).toFixed(3)} euros/kilometre.`,
      9
    );
    br(6);
  }
  write(
    "Le sous-traitant s'engage a editer une facture mensuelle pour les heures reellement effectuees",
    9
  );
  write('durant le mois, pendant toute la duree du contrat.', 9);
  br(4);
  write('Le paiement sera effectue selon les modalites suivantes :', 9);
  write('  paiement sous 30 jours a la reception de la facture ;', 9);
  write('  paiement par virement.', 9);
  br(6);
  write(
    'En cas de defaut de paiement, des penalites de retard seront appliquees pour chaque jour de',
    9
  );
  write(
    'retard (calculees a partir du lendemain de la date de reglement indiquee sur la facture) ainsi',
    9
  );
  write("qu'une indemnite forfaitaire de recouvrement.", 9);
  write(
    "Les penalites de retard sont calculees au taux de trois (3) fois le taux d'interet legal, ainsi",
    9
  );
  write(
    "qu'une indemnite forfaitaire pour frais de recouvrement de 40 euros, conformement a l'article",
    9
  );
  write('L.441-10 du Code de commerce.', 9);
  br(12);

  // ===== ARTICLE 8 =====
  write('Article 8 : Resiliation anticipee', 11, true);
  br(6);
  write(
    "En cas de manquement grave a l'une des obligations contractuelles ou en cas de force majeure",
    9
  );
  write(
    'dument reconnue, chaque partie pourra resilier le present contrat de maniere anticipee, par',
    9
  );
  write('lettre recommandee avec accuse de reception, moyennant un preavis de 2 semaines.', 9);
  write(
    "Les prestations effectuees jusqu'a la date de resiliation devront etre integralement reglees. Les",
    9
  );
  write('sommes deja percues par le sous-traitant lui demeureront acquises.', 9);
  br(12);

  // ===== ARTICLE 9 =====
  write('Article 9 : Litige', 11, true);
  br(6);
  write(
    "En cas de litige relatif a l'interpretation ou l'execution du present contrat, les parties",
    9
  );
  write(
    "s'efforceront de le resoudre a l'amiable. A defaut, le litige sera porte devant les tribunaux",
    9
  );
  write('competents du ressort du siege social du sous-traitant.', 9);
  br(12);

  // ===== ARTICLE 10 =====
  write('Article 10 : Protection des donnees personnelles', 11, true);
  br(6);
  write(
    "Le sous-traitant s'engage a respecter les obligations issues du Reglement General sur la",
    9
  );
  write(
    "Protection des Donnees (RGPD). Il ne conservera ni n'utilisera les donnees personnelles",
    9
  );
  write('auxquelles il pourrait avoir acces en dehors du strict cadre de sa mission.', 9);
  br(12);

  // ===== ARTICLE 11 =====
  write('Article 11 : Dispositions diverses', 11, true);
  br(6);
  write(
    '  Le present contrat ne cree entre les parties aucun lien de subordination, le sous-traitant',
    9
  );
  write(
    '  demeurant libre et responsable du contenu de la formation dans le respect du syllabus ;',
    9
  );
  write(
    "  Toute modification eventuelle de la presente convention fera l'objet d'un avenant signe par",
    9
  );
  write('  les parties ;', 9);
  write(
    "  Le sous-traitant dispose d'une propriete intellectuelle et/ou artistique sur le contenu de",
    9
  );
  write('  sa formation ;', 9);
  write(
    "  Le donneur d'ordre beneficie d'un droit d'usage strictement limite a l'execution du present",
    9
  );
  write("  contrat, a l'exclusion de toute exploitation ulterieure.", 9);
  br(12);

  // ===== ARTICLE 12 =====
  write('Article 12 : Confidentialite', 11, true);
  br(6);
  write(
    "Le sous-traitant s'engage a conserver strictement confidentielles toutes les informations,",
    9
  );
  write(
    'documents et donnees de toute nature dont il pourrait avoir connaissance dans le cadre de',
    9
  );
  write(
    "l'execution du present contrat, et notamment les informations pedagogiques, administratives,",
    9
  );
  write("commerciales ou strategiques du donneur d'ordre.", 9);
  write(
    "Cette obligation de confidentialite s'applique pendant toute la duree du contrat et subsiste",
    9
  );
  write('pendant une duree de cinq (5) ans apres son expiration ou sa resiliation.', 9);
  br(6);
  write('Ne sont pas considerees comme confidentielles les informations :', 9);
  write('  tombees dans le domaine public sans faute du sous-traitant ;', 9);
  write('  deja connues du sous-traitant avant leur communication ;', 9);
  write('  obtenues legalement aupres de tiers.', 9);
  br(12);

  // ===== ARTICLE 13 =====
  write('Article 13 : Assurance – Responsabilite civile professionnelle', 11, true);
  br(6);
  write(
    "Le sous-traitant declare etre titulaire d'une assurance de responsabilite civile professionnelle",
    9
  );
  write(
    "couvrant les dommages corporels, materiels et immaterialels pouvant resulter de l'execution de",
    9
  );
  write('la prestation de formation.', 9);
  write(
    "Une attestation d'assurance en cours de validite pourra etre fournie au donneur d'ordre sur",
    9
  );
  write('simple demande.', 9);
  write(
    'La responsabilite du sous-traitant est limitee aux dommages directs prouves et ne saurait en',
    9
  );
  write(
    "aucun cas couvrir les dommages indirects, pertes d'exploitation ou prejudices commerciaux.",
    9
  );
  br(12);

  // ===== ARTICLE 14 =====
  write('Article 14 : Non-exclusivite', 11, true);
  br(6);
  write("Le present contrat n'emporte aucune obligation d'exclusivite.", 9);
  write(
    "Le sous-traitant demeure libre de fournir des prestations similaires ou concurrentes a d'autres",
    9
  );
  write(
    'etablissements, organismes ou entreprises, y compris pendant la duree du present contrat, sous',
    9
  );
  write('reserve du respect de ses obligations de confidentialite et de loyaute.', 9);
  br(12);

  // ===== ARTICLE 15 =====
  write('Article 15 : Force majeure', 11, true);
  br(6);
  write(
    "Aucune des parties ne pourra etre tenue responsable de l'inexecution ou du retard dans",
    9
  );
  write(
    "l'execution de l'une quelconque de ses obligations lorsque cette inexecution resulte d'un cas de",
    9
  );
  write("force majeure au sens de l'article 1218 du Code civil.", 9);
  write(
    'Sont notamment consideres comme cas de force majeure : les catastrophes naturelles, incendies,',
    9
  );
  write(
    'pandemies, greves, conflits sociaux, interruptions des reseaux de communication ou de transport,',
    9
  );
  write(
    'decisions administratives, ou toute autre circonstance independante de la volonte des parties.',
    9
  );
  write(
    "La partie invoquant un cas de force majeure devra en informer l'autre partie dans les meilleurs",
    9
  );
  write(
    "delais. L'execution du contrat sera suspendue pendant la duree du cas de force majeure.",
    9
  );
  br(12);

  // ===== ARTICLE 16 =====
  write('Article 16 : Cession du contrat', 11, true);
  br(6);
  write("Le present contrat est conclu intuitu personae a l'egard du sous-traitant.", 9);
  write(
    "Il ne pourra etre cede, transfere ou apporte, en tout ou partie, par le donneur d'ordre, a",
    9
  );
  write("quelque titre que ce soit, sans l'accord prealable et ecrit du sous-traitant.", 9);
  br(24);

  // ===== SIGNATURES =====
  if (y < 160) newPage();

  const today = new Date().toLocaleDateString('fr-FR');
  write(`Fait a Thouare-sur-Loire le ${today}`, 10, true);
  br(28);

  // "Le donneur d'ordre," on the left, "Le sous-traitant," on the right — same y
  const sigLabelY = y;
  write("Le donneur d'ordre,", 9);
  writeRight('Le sous-traitant,', 9, sigLabelY);
  br(4);
  write('[Nom, prenom, qualite, signature, tampon]', 9, false, 0, true);

  // Yousign field under "Le donneur d'ordre," (left side)
  const signaturePage = pdfDoc.getPageCount();
  const signatureX = MARGIN; // left column
  const signatureY = sigLabelY - 55; // below the label

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    signaturePage,
    signatureX,
    signatureY,
  };
}
