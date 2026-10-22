/** HTML-Escaping für Template-Strings. */
export function esc(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Attribut-sicheres Escaping (identisch, aber semantisch getrennt). */
export const escAttr = esc;

function inline(md: string): string {
  let s = esc(md);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
  // Links: nur http(s) und mailto zulassen
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:|\/)[^)\s]+)\)/g, '<a href="$2" rel="noopener">$1</a>');
  return s;
}

/**
 * Minimaler, sicherer Markdown-Renderer (Überschriften, Absätze, Listen, fett,
 * kursiv, Links). Für vom Betreiber bzw. Kunden gelieferte Rechtstexte.
 */
export function markdownToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] | null = null;
  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join('')}</ul>`);
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      flushList();
      const level = Math.min(4, h[1]!.length + 1);
      out.push(`<h${level}>${inline(h[2]!)}</h${level}>`);
    } else if (li) {
      flushPara();
      (list ??= []).push(li[1]!);
    } else if (line.trim() === '') {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return out.join('\n');
}

/** Klartext → HTML-Absätze (z. B. vom Kunden eingefügte Datenschutzerklärung ohne Markdown). */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}
