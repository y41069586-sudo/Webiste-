export function esc(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Absätze aus Text (Leerzeilen trennen Absätze). */
export function paragraphs(text: string, cls = ''): string {
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p${cls ? ` class="${cls}"` : ''}>${esc(p)}</p>`)
    .join('');
}

/** Einfaches Markdown (nur **fett**) für Briefe. */
export function boldMd(text: string): string {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export function mapsLink(street: string, houseNumber: string, postalCode: string, city: string): string {
  const q = encodeURIComponent(`${street} ${houseNumber}, ${postalCode} ${city}`);
  return `https://www.openstreetmap.org/search?query=${q}`;
}
