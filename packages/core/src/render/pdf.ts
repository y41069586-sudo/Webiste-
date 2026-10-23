import { LETTER_GEOMETRY } from '@wbm/templates';
import { withPage } from './browser';

const PT_TO_MM = 25.4 / 72;
const PX_PER_MM = 96 / 25.4;

/** HTML → PDF (A4, Ränder aus CSS). Wartet auf eingebettete Schriften und Bilder. */
export async function htmlToPdf(html: string): Promise<Buffer> {
  return withPage({ width: 794, height: 1123 }, async (page) => {
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready');
    return page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
  });
}

export interface PdfTextItem {
  page: number;
  str: string;
  xMm: number;
  yTopMm: number;
  yBottomMm: number;
  wMm: number;
}

/** Text mit Positionen (mm, Ursprung oben links) aus dem PDF lesen. */
export async function pdfTextItems(pdf: Buffer): Promise<{ pages: number; items: PdfTextItem[] }> {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(pdf), disableFontFace: true, useSystemFonts: false }).promise;
  const items: PdfTextItem[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const vp = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    for (const it of tc.items) {
      if (!('str' in it) || !it.str.trim()) continue;
      const [, , , , e, f] = it.transform as number[];
      const h = it.height || Math.abs((it.transform as number[])[3] ?? 0);
      items.push({
        page: p,
        str: it.str,
        xMm: e! * PT_TO_MM,
        wMm: it.width * PT_TO_MM,
        yTopMm: (vp.height - f! - h * 0.8) * PT_TO_MM,
        yBottomMm: (vp.height - f! + h * 0.2) * PT_TO_MM,
      });
    }
  }
  await doc.destroy();
  return { pages: doc.numPages, items };
}

export interface LayoutIssue {
  check: string;
  detail: string;
}

function inside(a: { x: number; y: number; w: number; h: number }, r: { x1: number; y1: number; x2: number; y2: number }): boolean {
  return r.x1 >= a.x - 0.01 && r.x2 <= a.x + a.w + 0.01 && r.y1 >= a.y - 0.01 && r.y2 <= a.y + a.h + 0.01;
}
function intersects(a: { x: number; y: number; w: number; h: number }, r: { x1: number; y1: number; x2: number; y2: number }): boolean {
  return r.x1 < a.x + a.w && r.x2 > a.x && r.y1 < a.y + a.h && r.y2 > a.y;
}

/**
 * Prüft das fertige PDF gegen die Vorgaben des Briefdienstes:
 * Anschrift vollständig im Anschriftenfeld, sonst nichts in der Fenster-/Frankierzone,
 * Abstand zu den Rändern, Ecke unten links frei, erwartete Seitenzahl.
 */
export async function validateLetterPdf(
  pdf: Buffer,
  opts: { recipientLines: string[]; position: 'left' | 'right'; expectedPages: number },
): Promise<{ issues: LayoutIssue[]; pages: number; addressBox: { x1: number; y1: number; x2: number; y2: number } | null }> {
  const g = LETTER_GEOMETRY[opts.position];
  const { pages, items } = await pdfTextItems(pdf);
  const issues: LayoutIssue[] = [];
  if (pages !== opts.expectedPages) issues.push({ check: 'seitenzahl', detail: `${pages} Seiten statt ${opts.expectedPages}` });
  const p1 = items.filter((i) => i.page === 1);
  // Anschriftzeilen finden (in Reihenfolge, auf Seite 1)
  const used = new Set<PdfTextItem>();
  let box: { x1: number; y1: number; x2: number; y2: number } | null = null;
  for (const line of opts.recipientLines) {
    const hit = p1.find((i) => !used.has(i) && i.str.trim() === line.trim());
    if (!hit) {
      issues.push({ check: 'anschrift', detail: `Zeile nicht gefunden: „${line}“` });
      continue;
    }
    used.add(hit);
    const r = { x1: hit.xMm, y1: hit.yTopMm, x2: hit.xMm + hit.wMm, y2: hit.yBottomMm };
    box = box ? { x1: Math.min(box.x1, r.x1), y1: Math.min(box.y1, r.y1), x2: Math.max(box.x2, r.x2), y2: Math.max(box.y2, r.y2) } : r;
    if (!inside(g.addressArea, r)) {
      issues.push({ check: 'anschriftenfeld', detail: `„${line}“ außerhalb (${r.x1.toFixed(1)}–${r.x2.toFixed(1)} × ${r.y1.toFixed(1)}–${r.y2.toFixed(1)} mm)` });
    }
  }
  for (const it of items) {
    const r = { x1: it.xMm, y1: it.yTopMm, x2: it.xMm + it.wMm, y2: it.yBottomMm };
    if (it.page === 1 && !used.has(it) && intersects(g.keepFree, r)) {
      issues.push({ check: 'fensterzone', detail: `Text „${it.str.slice(0, 40)}“ in der Fenster-/Frankierzone` });
    }
    const m = LETTER_GEOMETRY.edgeMarginMm;
    if (r.x1 < m || r.y1 < m || r.x2 > LETTER_GEOMETRY.pageWidthMm - m || r.y2 > LETTER_GEOMETRY.pageHeightMm - m) {
      issues.push({ check: 'rand', detail: `Text „${it.str.slice(0, 40)}“ näher als ${m} mm am Rand (S. ${it.page})` });
    }
    const c = LETTER_GEOMETRY.bottomLeftCornerMm;
    if (r.x1 < c && r.y2 > LETTER_GEOMETRY.pageHeightMm - c) {
      issues.push({ check: 'ecke', detail: `Text „${it.str.slice(0, 40)}“ in der freizuhaltenden Ecke unten links` });
    }
  }
  return { issues, pages, addressBox: box };
}

/**
 * Prüft im Browser (vor dem PDF), dass auch Bilder/Flächen die Fensterzone nicht berühren
 * und Brieftext und Kleingedrucktes sich nicht überlappen.
 */
export async function validateLetterDom(html: string, position: 'left' | 'right'): Promise<LayoutIssue[]> {
  const g = LETTER_GEOMETRY[position].keepFree;
  return withPage({ width: 794, height: 1123 }, async (page) => {
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate('document.fonts.ready');
    const script = `(() => {
      const mm = ${PX_PER_MM};
      const first = document.querySelector('section.page');
      const pr = first.getBoundingClientRect();
      const rect = (el) => { const r = el.getBoundingClientRect(); return { x1: (r.left - pr.left) / mm, y1: (r.top - pr.top) / mm, x2: (r.right - pr.left) / mm, y2: (r.bottom - pr.top) / mm, w: r.width, h: r.height }; };
      const addr = document.getElementById('anschrift');
      const out = [];
      for (const el of first.querySelectorAll('img, h1, p, div, header, footer, main')) {
        if (addr.contains(el) || el.contains(addr)) continue;
        if (el.children.length && el.tagName === 'DIV' && !el.classList.contains('visual')) continue;
        const r = rect(el);
        if (r.w === 0 || r.h === 0) continue;
        if (r.x1 < ${g.x} + ${g.w} && r.x2 > ${g.x} && r.y1 < ${g.y} + ${g.h} && r.y2 > ${g.y}) out.push({ check: 'fensterzone-dom', detail: el.tagName + '.' + el.className + ' bei ' + r.x1.toFixed(1) + '/' + r.y1.toFixed(1) + ' mm' });
      }
      const body = rect(document.getElementById('brieftext'));
      const small = rect(document.getElementById('kleingedrucktes'));
      if (body.y2 > small.y1 - 1) out.push({ check: 'ueberlappung', detail: 'Brieftext endet bei ' + body.y2.toFixed(1) + ' mm, Kleingedrucktes beginnt bei ' + small.y1.toFixed(1) + ' mm' });
      const a = rect(addr);
      return { issues: out, address: a };
    })()`;
    const res = (await page.evaluate(script)) as { issues: LayoutIssue[] };
    return res.issues;
  });
}
