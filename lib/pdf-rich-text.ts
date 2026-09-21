import { PDFFont } from 'pdf-lib';

/**
 * Mini-langage de mise en forme utilisé par les articles de contrat éditables.
 *
 *   Texte normal                  -> paragraphe justifié à gauche, retour à la ligne automatique
 *   **Texte**                     -> ligne en gras (sous-titre)
 *   !Texte                        -> ligne en rouge
 *   - Texte                       -> puce (les lignes suivantes sont alignées sous le texte)
 *   "  Texte" (espaces en début)  -> texte indenté
 *   Ligne vide                    -> espace supplémentaire avant la ligne suivante
 */

export interface ParsedLine {
  text: string;
  bold: boolean;
  red: boolean;
  /** Indentation de la première ligne, en points */
  indent: number;
  /** Indentation supplémentaire des lignes de continuation (puces), en points */
  hanging: number;
  /** Espace vertical ajouté avant la ligne, en points */
  spaceBefore: number;
}

/** Largeur approximative d'un espace d'indentation (2 espaces = ~6pt) */
const INDENT_UNIT = 3;
const BULLET_HANGING = 8;
const PARAGRAPH_SPACE = 6;

/**
 * Retire les caractères que les polices embarquées ne savent pas dessiner
 * (emojis, caractères de contrôle...), qui feraient échouer pdf-lib.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ /g, ' ')
    .replace(/[^\n -ɏḀ-ỿ‐-›€™]/g, '');
}

export function parseRichText(body: string): ParsedLine[] {
  const rawLines = sanitizeText(body ?? '').split('\n');
  const lines: ParsedLine[] = [];
  let pendingSpace = 0;

  for (const raw of rawLines) {
    if (raw.trim() === '') {
      // Ligne vide : espace avant la prochaine ligne (sans cumuler à l'infini)
      if (lines.length > 0) pendingSpace = PARAGRAPH_SPACE;
      continue;
    }

    const leadingSpaces = raw.length - raw.trimStart().length;
    let text = raw.trim();
    let red = false;
    let bold = false;

    if (text.startsWith('!')) {
      red = true;
      text = text.slice(1).trimStart();
    }

    const boldMatch = /^\*\*(.+)\*\*$/.exec(text);
    if (boldMatch) {
      bold = true;
      text = boldMatch[1].trim();
    }

    let hanging = 0;
    if (/^([-•*])\s+/.test(text)) {
      text = text.replace(/^([-•*])\s+/, '- ');
      hanging = BULLET_HANGING;
    }

    lines.push({
      text,
      bold,
      red,
      indent: leadingSpaces * INDENT_UNIT,
      hanging,
      spaceBefore: pendingSpace,
    });
    pendingSpace = 0;
  }

  return lines;
}

/**
 * Découpe un texte pour qu'il tienne dans la largeur donnée.
 * La première ligne peut avoir une largeur différente des suivantes (puces).
 */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  firstWidth: number,
  restWidth: number
): string[] {
  const widthOf = (s: string) => {
    try {
      return font.widthOfTextAtSize(s, size);
    } catch {
      return s.length * size * 0.5;
    }
  };

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const out: string[] = [];
  let current = '';
  let available = firstWidth;

  const pushCurrent = () => {
    out.push(current);
    current = '';
    available = restWidth;
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (widthOf(candidate) <= available || current === '') {
      // Mot unique plus large que la ligne : découpage caractère par caractère
      if (current === '' && widthOf(word) > available) {
        let chunk = '';
        for (const char of word) {
          if (widthOf(chunk + char) > available && chunk !== '') {
            out.push(chunk);
            chunk = char;
            available = restWidth;
          } else {
            chunk += char;
          }
        }
        current = chunk;
        continue;
      }
      current = candidate;
    } else {
      pushCurrent();
      current = word;
    }
  }

  if (current) out.push(current);
  return out.length > 0 ? out : [''];
}
