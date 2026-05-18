import { NextResponse } from 'next/server';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createServiceRoleClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data: formations, error } = await supabase
      .from('formations')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: false })
      .order('annee', { ascending: false });
    if (error) throw error;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontsDir = join(process.cwd(), 'public', 'fonts');
    const font = await pdfDoc.embedFont(readFileSync(join(fontsDir, 'NotoSans-Regular.ttf')));
    const fontBold = await pdfDoc.embedFont(readFileSync(join(fontsDir, 'NotoSans-Bold.ttf')));
    const fontItalic = await pdfDoc.embedFont(readFileSync(join(fontsDir, 'NotoSans-Italic.ttf')));

    const PAGE_W = 595;
    const PAGE_H = 842;
    const MARGIN = 50;
    const BOTTOM = 60;

    let page: PDFPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    const newPage = () => {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    };
    const ensure = (h: number) => {
      if (y - h < BOTTOM) newPage();
    };
    const draw = (
      text: string,
      size: number,
      opts: {
        bold?: boolean;
        italic?: boolean;
        color?: [number, number, number];
        indent?: number;
      } = {}
    ) => {
      ensure(size + 4);
      const f = opts.bold ? fontBold : opts.italic ? fontItalic : font;
      const c = opts.color
        ? rgb(opts.color[0], opts.color[1], opts.color[2])
        : rgb(0.13, 0.07, 0.04);
      // Basic word-wrap
      const maxWidth = PAGE_W - MARGIN * 2 - (opts.indent || 0);
      const words = text.split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(test, size) > maxWidth) {
          page.drawText(line, { x: MARGIN + (opts.indent || 0), y, size, font: f, color: c });
          y -= size + 4;
          ensure(size + 4);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) {
        page.drawText(line, { x: MARGIN + (opts.indent || 0), y, size, font: f, color: c });
        y -= size + 4;
      }
    };
    const br = (n = 8) => {
      y -= n;
    };

    // ===== HEADER =====
    draw('A Rythme Ethic', 22, { bold: true, color: [0.43, 0.23, 0.15] });
    br(2);
    draw('se forme pour mieux vous accompagner', 16, { italic: true, color: [0.65, 0.35, 0.25] });
    br(16);

    if (!formations || formations.length === 0) {
      draw('Aucune formation enregistrée pour le moment.', 11, { italic: true });
    } else {
      for (const f of formations) {
        ensure(60);
        draw(f.titre, 13, { bold: true, color: [0.43, 0.23, 0.15] });
        br(2);
        const meta = f.duree ? `${f.annee} • ${f.duree}` : String(f.annee);
        draw(meta, 10, { italic: true, color: [0.65, 0.35, 0.25] });
        br(4);
        // Split contenu by newlines and draw each paragraph
        const paragraphs = String(f.contenu)
          .split(/\n+/)
          .filter(p => p.trim());
        for (const p of paragraphs) {
          draw(p.trim(), 10);
          br(2);
        }
        br(14);
      }
    }

    // Footer
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Florence LOUAZEL - A Rythme Ethic - Page ${i + 1}/${totalPages}`, {
        x: MARGIN,
        y: 30,
        size: 8,
        font,
        color: rgb(0.55, 0.47, 0.41),
      });
    }

    const bytes = await pdfDoc.save();
    return new NextResponse(bytes as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="A Rythme Ethic - Formations.pdf"',
      },
    });
  } catch (err) {
    console.error('Error generating formations PDF:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
