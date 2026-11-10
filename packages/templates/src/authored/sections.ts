import { parseFragment, serialize, type DefaultTreeAdapterTypes as T } from 'parse5';
/**
 * Inhaltsstandard neuer Entwürfe. full-page-2 (07.11.2026, Betreiber: „cleaner, weniger Text“, Vorbild Cyc Beauté):
 * Bild-Einstieg → Leistungen als Kacheln → Bildstrecke → „So einfach fragen Sie an“ (Ablauf + Angaben in einem Block)
 * → „So erreichen Sie uns“ → kurze Fragen → kleiner Entwurfs-Platzhalter. Keine Mindesttextmenge, keine Warnsätze je
 * Abschnitt (die Kennzeichnung „Leistungen und Bilder sind Beispiele“ steht einmal im Entwurfshinweis oben).
 * full-page-1 bleibt für bestehende Seiten und deren Überarbeitung gültig.
 */
export const FULL_PAGE_VERSION = 'full-page-2';
export const LEGACY_FULL_PAGE_VERSION = 'full-page-1';
export type FullPageVersion = typeof FULL_PAGE_VERSION | typeof LEGACY_FULL_PAGE_VERSION;
export const AUTHORED_SECTION_KEYS = ['services', 'gallery', 'inquiry', 'area', 'faq', 'placeholders'] as const;
export const LEGACY_SECTION_KEYS = ['services', 'process', 'preparation', 'area', 'gallery', 'faq', 'placeholders'] as const;
/** Semantische Pflichtinhalte; beim neuen Standard zusätzlich die Reihenfolge der Inhaltsbereiche. */
export function authoredSectionIssues(
  html: string,
  faqCount: number,
  imageCount?: number,
  version: FullPageVersion = FULL_PAGE_VERSION,
): string[] {
  const legacy = version === LEGACY_FULL_PAGE_VERSION;
  const tree = parseFragment(html);
  const sections = new Map<string, T.Element>();
  const errors: string[] = [];
  const walk = (n: T.Node, visit: (n: T.Element) => void) => {
    if ('tagName' in n) visit(n);
    if ('childNodes' in n) n.childNodes.forEach((c) => walk(c, visit));
  };
  const order: string[] = [];
  walk(tree, (n) => {
    const k = n.attrs.find((a) => a.name === 'data-ad-section')?.value;
    if (k) {
      if (sections.has(k)) errors.push(`Inhaltsbereich doppelt: ${k}`);
      sections.set(k, n);
      order.push(k);
    }
  });
  for (const k of legacy ? LEGACY_SECTION_KEYS : AUTHORED_SECTION_KEYS) {
    const n = sections.get(k);
    const html = n ? serialize(n) : '';
    // Eine reine Bildstrecke ist nicht leer, auch wenn sie kaum Text hat
    if (!n || (html.replace(/<[^>]*>/g, '').trim().length < 15 && !/<img[\s>]/.test(html)))
      errors.push(`Pflichtinhalt fehlt oder ist leer: ${k}`);
  }
  if (!legacy) {
    const expected = AUTHORED_SECTION_KEYS.filter((k) => order.includes(k));
    const actual = order.filter((k) => (AUTHORED_SECTION_KEYS as readonly string[]).includes(k));
    if (expected.join() !== actual.join())
      errors.push(
        'Reihenfolge: Einstieg mit Bild, dann Leistungen (services), Bildstrecke (gallery), „So einfach fragen Sie an“ (inquiry), „So erreichen Sie uns“ (area), kurze Fragen (faq), zuletzt der kleine Entwurfs-Platzhalter (placeholders).',
      );
    const services = sections.get('services');
    if (services) {
      let tiles = 0;
      walk(services, (n) => {
        if (n.tagName === 'h3') tiles++;
      });
      // Bei nur ein oder zwei bestätigten Leistungen genügen entsprechend weniger Kacheln
      if (tiles < 1) errors.push('Leistungen als Kacheln mit je einer h3-Überschrift zeigen.');
    }
    const inquiry = sections.get('inquiry');
    if (inquiry) {
      let count = 0;
      walk(inquiry, (n) => {
        if (n.tagName === 'li') count++;
      });
      if (count < 3) errors.push('„So einfach fragen Sie an“ braucht mindestens drei kurze Schritte oder Angaben als Liste.');
    }
  }
  const process = sections.get('process');
  if (legacy && process && !/beispiel/i.test(serialize(process)))
    errors.push('Anfrageablauf sichtbar als Beispiel kennzeichnen.');
  const area = sections.get('area');
  if (area && !serialize(area).includes('{{service_area}}'))
    errors.push('Einsatzgebiet nur über den geprüften service_area-Token ausgeben.');
  const prep = sections.get('preparation');
  if (legacy && prep) {
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
    // 10.11.2026: ein Bild gehört in den Einstieg, jeder Slot nur einmal; die Bildstrecke zeigt die übrigen
    const min = imageCount === undefined ? (hasPlaceholder ? 0 : 1) : Math.min(2, Math.max(0, imageCount - 1));
    if (slots.size < min || (min === 0 && !serialize(gallery).includes('{{placeholder_photos}}')))
      errors.push('Bildstrecke mit verfügbaren Bildslots oder einem markierten Foto-Platzhalter ergänzen.');
  }
  return errors;
}
