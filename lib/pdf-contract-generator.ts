import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Client } from '@/types';

const TARIF_HORAIRE_HT = 44.80;

interface ContractData {
  client: Client;
  anneeScolaire: string;
}

export async function generateContractPDF(data: ContractData): Promise<Buffer> {
  const { client, anneeScolaire } = data;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size in points

  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 50;
  let yPosition = height - margin;

  // Helper function to draw text
  const drawText = (text: string, size: number, isBold: boolean = false) => {
    page.drawText(text, {
      x: margin,
      y: yPosition,
      size,
      font: isBold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    yPosition -= size + 5;
  };

  // Helper function for line break
  const lineBreak = (space: number = 10) => {
    yPosition -= space;
  };

  // Title
  drawText(`PROPOSITION DE SERVICE - Enseignement`, 16, true);
  drawText(`${client.organisation || ''} – ${anneeScolaire}`, 14, true);
  lineBreak(20);

  // Parties
  drawText('Entre les soussignés :', 12, true);
  lineBreak();

  drawText(`1 – Le donneur d'ordre : ${client.organisation || ''} – ${client.ecole_statut_juridique || ''}`, 10);
  drawText(`• ${client.address_line1 || ''}`, 10);
  drawText(`  ${client.postal_code || ''} - ${client.city || ''}`, 10);
  drawText(`• N° SIRET ${client.ecole_siret || ''}`, 10);
  drawText(`• Organisme de formation enregistré sous le numéro ${client.ecole_nda || ''} auprès du Préfet`, 10);
  drawText(`  de la région ${client.ecole_nda_region || ''}`, 10);
  lineBreak();

  drawText('Et', 10);
  lineBreak();

  drawText('2 – Le sous-traitant : A Rythme Ethic – Entreprise individuelle', 10);
  drawText('• 3 rue Arthur Rimbaud', 10);
  drawText('  44 470 THOUARE SUR LOIRE', 10);
  drawText('• N° SIRET 990 194 763 00019', 10);
  drawText('• Organisme de formation enregistré sous le numéro 52 44 12563 44 auprès du Préfet de la', 10);
  drawText('  région Pays de la Loire', 10);
  lineBreak(20);

  drawText('Il a été convenu ce qui suit :', 10);
  lineBreak(20);

  // Article 1
  drawText('Article 1 : Nature du contrat', 12, true);
  lineBreak();
  drawText('Le présent contrat est conclu dans le cadre d\'une prestation de formation réalisée par le sous-', 10);
  drawText('traitant au bénéfice du donneur d\'ordre.', 10);
  drawText('Le sous-traitant intervient en toute indépendance, sans exclusivité, et organise librement ses', 10);
  drawText('méthodes pédagogiques dans le respect du cadre fixé par le donneur d\'ordre.', 10);
  lineBreak(15);

  // Article 2
  drawText('Article 2 : Objet du contrat', 12, true);
  lineBreak();
  drawText(`• Enseignement dont le thème est : ${client.ecole_module_nom || ''}`, 10);
  drawText(`• Formation à destination ${client.ecole_classes_noms || ''}`, 10);
  drawText(`• Période : année scolaire ${anneeScolaire} à compter du 1er septembre et jusqu'au 31 août`, 10);
  drawText('  de l\'année suivante', 10);
  drawText(`• Volume horaire de face à face pédagogique : ${client.ecole_module_heures || ''} heures`, 10);
  drawText(`• Nombre prévisionnel d\'apprenants : ${client.ecole_groupe_taille || ''}`, 10);
  drawText('• Intervenant(e) : Florence LOUAZEL - Diplôme de l\'intervenant(e) : Diplôme d\'ingénieur', 10);
  drawText('  généraliste – ECAM Louis de Broglie', 10);
  lineBreak();

  // Add warning about price reevaluation
  page.drawText('Toute réévaluation fera l\'objet d\'un avenant précisant le nouveau tarif horaire HT et prendra effet', {
    x: margin,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(1, 0, 0), // Red color
  });
  yPosition -= 15;
  page.drawText('après signature des deux parties.', {
    x: margin,
    y: yPosition,
    size: 10,
    font: font,
    color: rgb(1, 0, 0), // Red color
  });
  yPosition -= 20;

  // Check if we need a new page
  if (yPosition < 200) {
    const newPage = pdfDoc.addPage([595, 842]);
    yPosition = height - margin;
  }

  // Article 7 - Financial terms
  drawText('Article 7 : Modalités financières', 12, true);
  lineBreak();
  drawText(`Le sous-traitant percevra une rémunération de ${TARIF_HORAIRE_HT.toFixed(2)} euros HT par heure de face à`, 10);
  drawText('face pédagogique.', 10);
  lineBreak();

  if (client.ecole_frais_km_prix) {
    drawText(`Des frais de déplacement seront appliqués pour ${client.ecole_frais_km_prix} euros/kilomètre.`, 10);
    lineBreak();
  }

  drawText('Le sous-traitant s\'engage à éditer une facture mensuelle pour les heures réellement effectuées', 10);
  drawText('durant le mois, pendant toute la durée du contrat.', 10);
  lineBreak();

  drawText('Le paiement sera effectué selon les modalités suivantes :', 10);
  drawText('• paiement sous 30 jours à la réception de la facture ;', 10);
  drawText('• paiement par virement.', 10);
  lineBreak(20);

  // Signature section
  drawText(`Fait à ${client.city || ''} le ${new Date().toLocaleDateString('fr-FR')}`, 10);
  lineBreak(30);

  drawText('Le donneur d\'ordre,                                    Le sous-traitant,', 10);
  drawText('[Nom, prénom, qualité, signature, tampon]', 10);

  // Convert PDF to buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
