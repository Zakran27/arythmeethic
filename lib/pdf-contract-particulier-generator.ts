import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

export async function generateContractParticulierPDF(data: ContractParticulierData): Promise<Buffer> {
  const { client, anneeScolaire, dateDebut, dateFin, dureePeriodeEssai, salaireHoraireNet, signerFirstName, signerLastName, signerEmail, signerPhone } = data;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  // Helper function to draw text
  const drawText = (text: string, size: number, isBold: boolean = false, color = rgb(0, 0, 0)) => {
    page.drawText(text, {
      x: margin,
      y: yPosition,
      size,
      font: isBold ? fontBold : font,
      color,
    });
    yPosition -= size + 5;
  };

  // Helper for line break
  const lineBreak = (space: number = 10) => {
    yPosition -= space;
  };

  // Title with orange background effect (simulate with text)
  drawText('Contrat de travail à durée déterminée (CDD)', 16, true);
  drawText('Salarié du particulier employeur - Code IDCC : 3239', 12, false);
  lineBreak(20);

  // Particulier employeur
  drawText('Entre le particulier employeur:', 12, true);
  lineBreak(5);
  drawText(`Nom de naissance : ${signerLastName}`, 10);
  drawText(`Nom d'usage : ${signerLastName}`, 10);
  drawText(`Prénom : ${signerFirstName}`, 10);
  drawText(`E-mail : ${signerEmail}`, 10);
  drawText(`Adresse : ${client.adresse_cours || client.address_line1 || ''}`, 10);
  drawText(`Ville : ${client.city || ''}     Code postal : ${client.postal_code || ''}`, 10);
  drawText(`N° de téléphone : ${signerPhone || ''}`, 10);
  drawText(`N° de CESU : ${client.numero_cesu || ''}`, 10);
  lineBreak(15);

  // Salarié (Florence)
  drawText('Et le salarié :', 12, true);
  lineBreak(5);
  drawText('Nom de naissance : LOUAZEL', 10);
  drawText('Nom d\'usage : LOUAZEL     Prénom : FLORENCE', 10);
  drawText('E-mail : florence.louazel@ARythmeEthic.onmicrosoft.com', 10);
  drawText('Adresse : 3 RUE ARTHUR RIMBAUD', 10);
  drawText('Ville : 44470     Code postal : 44 470', 10);
  drawText('N° de téléphone : 06 46 75 37 36', 10);
  drawText('N° de Sécurité sociale: 2 97 04 35 238 643 63', 10);
  lineBreak(20);

  // Check if we need a new page
  if (yPosition < 300) {
    const newPage = pdfDoc.addPage([595, 842]);
    yPosition = height - margin;
  }

  // Section 1: Engagement
  drawText('1. Engagement', 12, true);
  lineBreak(10);

  drawText('Convention collective', 11, true);
  drawText('Ce contrat est régi par les dispositions de la Convention collective nationale de la branche du secteur', 9);
  drawText('des particuliers employeurs et de l\'emploi à domicile. Le salarié est informé de la possibilité de consulter', 9);
  drawText('le texte de la convention collective nationale sur le site internet www.legifrance.gouv.fr.', 9);
  lineBreak(10);

  drawText('Retraite complémentaire et prévoyance', 11, true);
  drawText('Les institutions compétentes en matière de retraite et de prévoyance sont:', 9);
  drawText('• Ircem AGIRC/ARRCO', 9);
  drawText('• Ircem prévoyance', 9);
  drawText('• Toutes deux domiciliées : 261 avenue des Nations-Unies – BP 593 – 59 060 ROUBAIX Cedex.', 9);
  lineBreak(15);

  // Section 2: Date d'effet du contrat
  drawText('2. Date d\'effet du contrat', 12, true);
  lineBreak(5);
  drawText(`Le CDD est conclu en raison d'un besoin en cours particuliers durant l'année scolaire ${anneeScolaire}.`, 9);
  lineBreak(10);

  drawText('Durée du contrat', 11, true);
  drawText(`Le contrat est conclu à partir du ${dateDebut} jusqu'au ${dateFin}.`, 9);
  lineBreak(10);

  drawText('Période d\'essai', 11, true);
  drawText(`Durée de la période d'essai : ${dureePeriodeEssai}`, 9);
  drawText('La durée maximale de la période d\'essai dépend de la durée du contrat :', 9);
  drawText('• Pour un CDD inférieur ou égal à 6 mois, la période d\'essai maximale est d\'1 jour par semaine,', 9);
  drawText('  dans la limite de 2 semaines.', 9);
  drawText('• Pour un CDD supérieur à 6 mois, la période d\'essai maximale est d\'1 jour par semaine,', 9);
  drawText('  dans la limite d\'1 mois.', 9);
  lineBreak(15);

  // New page for rest of content
  const page2 = pdfDoc.addPage([595, 842]);
  yPosition = height - margin;

  // Section 3: Lieu habituel de travail
  page2.drawText('3. Lieu habituel de travail', {
    x: margin,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 20;

  page2.drawText('Domicile de l\'employeur', {
    x: margin,
    y: yPosition,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;

  page2.drawText(`Adresse : ${client.adresse_cours || client.address_line1 || ''}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 12;

  page2.drawText(`Ville: ${client.city || ''}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 12;

  page2.drawText(`Code postal: ${client.postal_code || ''}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  // Section 4: Nature de l'emploi
  page2.drawText('4. Nature de l\'emploi', {
    x: margin,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;

  page2.drawText('Le salarié occupe un emploi d\'enseignante à domicile en mathématiques.', {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  // Section 7: Rémunération (simplified)
  page2.drawText('7. Rémunération', {
    x: margin,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;

  page2.drawText(`Le salaire net est majoré de 10 % au titre des congés payés.`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 12;

  page2.drawText(`Le salaire net horaire de base est de : ${salaireHoraireNet.toFixed(2)} €.`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  // Section 8: Confidentialité
  page2.drawText('8. Confidentialité', {
    x: margin,
    y: yPosition,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 15;

  page2.drawText('Les parties s\'engagent à conserver confidentielles les informations personnelles transmises entre elles', {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 12;

  page2.drawText('dans le cadre de l\'exécution du présent contrat. Elles prennent les mesures nécessaires pour garantir', {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 12;

  page2.drawText('cette confidentialité.', {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 30;

  // Signature section
  const today = new Date().toLocaleDateString('fr-FR');
  page2.drawText(`Date : ${today}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 12;

  page2.drawText(`Fait à ${client.city || ''}`, {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  yPosition -= 30;

  page2.drawText('Signature salarié :                                             Signature employeur :', {
    x: margin,
    y: yPosition,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });

  // Convert PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
