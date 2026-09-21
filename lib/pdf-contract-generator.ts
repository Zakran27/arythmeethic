import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Client } from '@/types';
import {
  ContractArticle,
  ContractArticleOverride,
  DEFAULT_TARIF_HORAIRE_HT,
  applyArticleOverrides,
  buildContractEcoleArticles,
} from '@/lib/contract-ecole-articles';
import { parseRichText, sanitizeText, wrapText } from '@/lib/pdf-rich-text';

interface ContractData {
  client: Client;
  anneeScolaire: string;
  tarifHoraireHT?: number;
  /** Modifications d'articles saisies depuis l'admin (optionnel) */
  articleOverrides?: ContractArticleOverride[] | null;
}

export interface ContractEcoleResult {
  buffer: Buffer;
  signaturePage: number; // 1-indexed
  signatureX: number;
  signatureY: number;
  florenceSignatureX: number;
  florenceSignatureY: number;
  /** Articles réellement imprimés dans le PDF (défauts + modifications) */
  articles: ContractArticle[];
}

export async function generateContractPDF(data: ContractData): Promise<ContractEcoleResult> {
  const {
    client,
    anneeScolaire,
    tarifHoraireHT = DEFAULT_TARIF_HORAIRE_HT,
    articleOverrides,
  } = data;

  const articles = applyArticleOverrides(
    buildContractEcoleArticles({ client, anneeScolaire, tarifHoraireHT }),
    articleOverrides
  );

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
  const CONTENT_W = PAGE_W - 2 * MARGIN;

  let currentPage: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    currentPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };

  const write = (text: string, size: number, bold = false, indent = 0, italic = false) => {
    if (y < BOTTOM_LIMIT) newPage();
    currentPage.drawText(sanitizeText(text), {
      x: MARGIN + indent,
      y,
      size,
      font: italic ? fontItalic : bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 4;
  };

  const writeRight = (text: string, size: number, atY: number) => {
    currentPage.drawText(sanitizeText(text), {
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

  /**
   * Écrit un texte libre (celui d'un article), avec retour à la ligne
   * automatique : le contenu peut donc être modifié sans casser la mise en page.
   */
  const writeRichText = (body: string, size = 9) => {
    for (const line of parseRichText(body)) {
      y -= line.spaceBefore;
      const lineFont = line.bold ? fontBold : font;
      const color = line.red ? rgb(0.8, 0, 0) : rgb(0, 0, 0);
      const firstWidth = CONTENT_W - line.indent;
      const restWidth = firstWidth - line.hanging;
      const wrapped = wrapText(line.text, lineFont, size, firstWidth, restWidth);

      wrapped.forEach((chunk, idx) => {
        if (y < BOTTOM_LIMIT) newPage();
        currentPage.drawText(chunk, {
          x: MARGIN + line.indent + (idx === 0 ? 0 : line.hanging),
          y,
          size,
          font: lineFont,
          color,
        });
        y -= size + 4;
      });
    }
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

  // ===== ARTICLES (texte par défaut ou modifié depuis l'admin) =====
  for (const article of articles) {
    const title = (article.title || '').trim();
    const body = (article.body || '').trim();
    // Un article entièrement vidé est simplement retiré du contrat
    if (!title && !body) continue;

    // Évite un titre d'article seul en bas de page
    if (y < BOTTOM_LIMIT + 40) newPage();

    if (title) {
      write(title, 11, true);
      br(6);
    }
    if (body) writeRichText(body, 9);
    br(12);
  }

  br(12);

  // ===== SIGNATURES =====
  if (y < 160) newPage();

  const today = new Date().toLocaleDateString('fr-FR');
  write(`Fait à Thouaré-sur-Loire le ${today}`, 10, true);
  br(28);

  // "Le donneur d'ordre," on the left, "Le sous-traitant," on the right - same y
  const sigLabelY = y;
  write("Le donneur d'ordre,", 9);
  writeRight('Le sous-traitant,', 9, sigLabelY);
  br(4);
  write('[Nom, prénom, qualité, signature, tampon]', 9, false, 0, true);

  // DocuSeal fields: client (donneur d'ordre) on left, Florence (sous-traitant) on right
  const signaturePage = pdfDoc.getPageCount();
  const signatureX = MARGIN; // left column - donneur d'ordre
  const signatureY = sigLabelY - 80;
  const florenceSignatureX = MARGIN + 250; // right column - sous-traitant
  const florenceSignatureY = sigLabelY - 80;

  const pdfBytes = await pdfDoc.save();
  return {
    buffer: Buffer.from(pdfBytes),
    signaturePage,
    signatureX,
    signatureY,
    florenceSignatureX,
    florenceSignatureY,
    articles,
  };
}
