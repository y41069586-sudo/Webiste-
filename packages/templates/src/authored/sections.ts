import { parseFragment, serialize, type DefaultTreeAdapterTypes as T } from 'parse5';
export const FULL_PAGE_VERSION = 'full-page-1';
export const AUTHORED_SECTION_KEYS = ['services', 'process', 'preparation', 'area', 'gallery', 'faq', 'placeholders'] as const;
/** Semantic coverage only: no required sequence, columns, palette or visual layout. */
export function authoredSectionIssues(html: string, faqCount: number, imageCount?: number): string[] {
  const tree = parseFragment(html);
  const sections = new Map<string, T.Element>();
  const errors: string[] = [];
  const walk = (n: T.Node, visit: (n: T.Element) => void) => {
    if ('tagName' in n) visit(n);
    if ('childNodes' in n) n.childNodes.forEach((c) => walk(c, visit));
  };
  walk(tree, (n) => {
    const k = n.attrs.find((a) => a.name === 'data-ad-section')?.value;
    if (k) {
      if (sections.has(k)) errors.push(`Inhaltsbereich doppelt: ${k}`);
      sections.set(k, n);
    }
  });
  for (const k of AUTHORED_SECTION_KEYS) {
    const n = sections.get(k);
    if (
      !n ||
      serialize(n)
        .replace(/<[^>]*>/g, '')
        .trim().length < 15
    )
      errors.push(`Pflichtinhalt fehlt oder ist leer: ${k}`);
  }
  const process = sections.get('process');
  if (process && !/beispiel/i.test(serialize(process))) errors.push('Anfrageablauf sichtbar als Beispiel kennzeichnen.');
  const area = sections.get('area');
  if (area && !serialize(area).includes('{{service_area}}'))
    errors.push('Einsatzgebiet nur über den geprüften service_area-Token ausgeben.');
  const prep = sections.get('preparation');
  if (prep) {
    let count = 0;
    walk(prep, (n) => {
      if (n.tagName === 'li') count++;
    });
    if (count < 3) errors.push('Anfragevorbereitung braucht mindestens drei konkrete Angaben.');
  }
  const faq = sections.get('faq');
  if (faq) {
    let count = 0;
    walk(faq, (n) => {
      if (n.tagName === 'summary') count++;
    });
    if (count < 3 || count > 4 || count !== faqCount)
      errors.push('Im FAQ-Bereich und im Inhaltsfeld dieselben drei bis vier Ablauf-Fragen zeigen.');
  }
  const placeholders = sections.get('placeholders');
  if (placeholders) {
    for (const k of ['photos', 'team', 'references']) {
      let found = false;
      walk(placeholders, (n) => {
        if (
          n.attrs.some((a) => a.name === 'data-ad-placeholder' && a.value === k) &&
          serialize(n).includes(`{{placeholder_${k}}}`)
        )
          found = true;
      });
      if (!found) errors.push(`Markierter Entwurfsplatzhalter fehlt: ${k}`);
    }
  }
  const gallery = sections.get('gallery');
  if (gallery) {
    const slots = new Set<string>();
    walk(gallery, (n) => {
      if (n.tagName === 'img') {
        const src = n.attrs.find((a) => a.name === 'src')?.value;
        if (src) slots.add(src);
      }
    });
    const hasPlaceholder = serialize(gallery).includes('{{placeholder_photos}}');
    const min = imageCount === undefined ? (hasPlaceholder ? 0 : 1) : Math.min(2, imageCount);
    if (slots.size < min || (min === 0 && !serialize(gallery).includes('{{placeholder_photos}}')))
      errors.push('Bildstrecke mit verfügbaren Bildslots oder einem markierten Foto-Platzhalter ergänzen.');
  }
  return errors;
}
