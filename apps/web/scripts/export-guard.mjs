/**
 * Veröffentlichungssperre für den statischen Export der Firmenwebsite. Der Export wird abgelehnt, wenn
 * sichtbarer Text Platzhalter-Anbieterdaten oder Legacy-Neukundenpreise (590 €/49 €) enthält oder die
 * Preisseite die aktuelle Einrichtung (597 €, siehe offers-v4.ts) nicht nennt. Hintergrund: ein alter Export
 * mit example.com-Kontakt und 590-€-Angebot war unter der eigenen Domain erreichbar.
 */

const PLACEHOLDERS = [
  'example.com',
  'example.test',
  'Vorname Nachname',
  'Musterstraße 1',
  '0231 000000',
  '(Platzhalter)',
  '[Name aus privater Konfiguration]',
  '[Anschrift aus privater Konfiguration]',
  '[PLZ]',
  // Interne Arbeitsvermerke aus Rechtstextentwürfen (z. B. ungeklärte USt-/W-IdNr.) nie veröffentlichen
  'TODO',
];

const LEGACY_PRICES = [/\b590\s?€/, /\b49\s?€\s?(?:\/|pro|im)\s?Monat/i];

/** Sichtbarer Text ohne Skripte, Styles und Tags; Entities grob aufgelöst. */
export function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, ' ');
}

/** Liefert Befunde je Seite; leere Liste = veröffentlichbar. */
export function checkPublicPage(route, html) {
  const text = visibleText(html);
  const findings = [];
  for (const p of PLACEHOLDERS) if (text.includes(p)) findings.push(`${route}: Platzhalter „${p}“`);
  for (const re of LEGACY_PRICES) {
    const m = text.match(re);
    if (m) findings.push(`${route}: Legacy-Preis „${m[0]}“`);
  }
  if (route === '/preise' && !/\b597\s?€/.test(text)) findings.push(`${route}: aktuelle Einrichtung 597 € fehlt`);
  return findings;
}
