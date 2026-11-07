import type { BusinessFacts, SiteContent } from '../types';
import { FREE_DESIGN_VERSION } from './design';

/**
 * Umfang des freien Entwurfs. Seit 07.11.2026 (Betreiber: „cleaner, nicht krass viel Text“, Vorbild Cyc Beauté) gibt
 * es keine Mindesttextmenge mehr; Pflicht sind die fünf Inhaltsbereiche mit h2 und sichtbare Bilder.
 */
export const AUTHORED_MIN_SECTIONS = 5;
/** Historisch (bis 06.11.2026 Pflicht): Mindestzeichen sichtbarer Text; nur noch als Referenz exportiert. */
export const AUTHORED_MIN_TEXT = 0;

/** Vollständigkeit für neue Generierungen (nicht beim Rendern gespeicherter Seiten): Abschnitte und Bilder. */
export function authoredCompleteness(html: string, imageSlots: number): string[] {
  const out: string[] = [];
  const h2 = (html.match(/<h2[\s>]/g) ?? []).length;
  if (h2 < AUTHORED_MIN_SECTIONS)
    out.push(
      `Nur ${h2} Abschnitte mit h2; mindestens ${AUTHORED_MIN_SECTIONS} liefern (Leistungen, Bildstrecke, So einfach fragen Sie an, So erreichen Sie uns, Fragen).`,
    );
  const used = new Set([...html.matchAll(/\{\{image_([123])\}\}/g)].map((m) => m[1]));
  if (imageSlots >= 2 && used.size < 2) out.push('Mindestens zwei der verfügbaren Bildslots sichtbar einsetzen.');
  return out;
}

/**
 * Qualitätsvorgaben für die KI. Maßstab ist der Entwurf „Cyc Beauté“ vom 07.11.2026, den der Betreiber als sehr
 * gutes Beispiel nennt: minimalistisch, wenig Text, ein einziges wiederkehrendes Zierelement, große Display-Schrift,
 * eine Akzentfarbe, viel Weißraum, Fachwissen aufklappbar, ruhige dunkle Schlussfläche. Als Prinzipien – nicht als
 * Vorlage zum Kopieren.
 */
export const FREE_DESIGN_CRITERIA = [
  'Maßstab: ruhig, hochwertig, minimalistisch. Wenig Text, viel Weißraum, eine Akzentfarbe, eine große Display-Schrift für Name und Überschriften, eine ruhige Textschrift. Genau ein eigenes, zum Betrieb passendes Zierelement (z. B. eine Linie, ein Bogen, eine Kante), das sich vom Einstieg bis zum Schluss wiederholt. Lieber weniger Elemente, die sitzen, als viele, die sich drängen.',
  'Arbeite wie ein Gestaltungsstudio: zuerst Besucheraufgabe und eigene visuelle Leitidee, dann Komposition, dann Detailarbeit. Entwirf für diesen Betrieb ein eigenständiges Konzept, kein vorgegebenes Farbschema. Typografie, Größenverhältnisse, Farbgewicht und Bildausschnitte entscheidest du.',
  'Feste Reihenfolge der Inhalte (Betreiber 07.11.2026): (1) Einstieg mit Bild, Name, Tätigkeit mit Ort, höchstens ein kurzer Satz und ein bis zwei Handlungen; (2) Leistungen als große Kacheln (data-ad-section="services"), jede mit h3, einem kurzen Satz und wo möglich einem Bild aus den Bildslots; (3) Bildstrecke (gallery); (4) „So einfach fragen Sie an“ (inquiry): drei bis vier kurze Schritte und die wichtigsten Angaben in EINEM kompakten Block; (5) „So erreichen Sie uns“ (area) mit Adresse, Karte und Anruf – Öffnungszeiten und Formular folgen im geschützten Kontaktbereich; (6) drei bis vier kurze Fragen (faq) mit details/summary; (7) ganz unten ein kleiner, unauffälliger Entwurfs-Platzhalter (placeholders).',
  'Handy-Einstieg: Am Handy zeigt das System den Bereich mit der h1 automatisch als Vollbild-Foto mit dunklem Verlauf und hellem Text darüber. Lege deshalb in genau diesen Einstiegsbereich (ohne h2) ein passendes Bild aus den Bildslots und halte den Text dort kurz.',
  'Kurze Texte: jeder Absatz höchstens zwei Sätze; ausführlichere Erklärungen nur aufklappbar (details/summary). Keine Textwände, keine Wiederholungen, keine Mindestlänge erfüllen wollen.',
  'Keine Warn- oder Vorbehaltssätze in den Abschnitten (kein „Allgemeine Information, keine Aussage des Betriebs“, kein „keine Zusage zu Terminen, Preisen oder Rückmeldung“, kein „Noch nicht bestätigt“). Der Entwurfshinweis ganz oben kennzeichnet Leistungen und Bilder bereits als Beispiele. Trotzdem nichts erfinden: Leistungen neutral als übliche Leistungen der Branche formulieren, keine Zusagen zu Rückruf, Preis, Termin, Besichtigung oder Verfügbarkeit.',
  'Handy-Lesbarkeit: am Handy alles untereinander, keine mehrspaltigen Textraster, keine seitlich wischbaren Reihen (overflow-x), keine Schriftgrößen unter 15 px, große Tippflächen. Eigenständige Mobilansicht statt geschrumpftem Desktop.',
  'Standort über {{service_area}}: Bei Studios, Gastro, Handel und Kursen heißt der Bereich Standort/Anfahrt, kein Einsatzgebiet und kein Umkreis. Nur bei Arbeit beim Kunden Stadt und Umgebung als Gebietsvorschlag. Keine Parkplätze, Haltestellen, Radien oder Besuchszeiten erfinden.',
  'Bildstrecke aus zwei bis drei verfügbaren Bildslots; das System kennzeichnet Symbolbilder automatisch. Keine Referenzarbeiten behaupten. Fehlen Bilder, einen markierten Foto-Platzhalter zeigen.',
  'Fragen: drei bis vier kurze Fragen zur Anfrage mit je ein bis zwei Sätzen Antwort, ohne Angaben zu Kapazität, Preisen oder Fristen.',
  'Entwurfs-Platzhalter für eigene Fotos, Team und Referenzen klein und unten mit den vorgegebenen Tokens und data-ad-placeholder markieren; sie erscheinen nicht live. Keine Personen, Kunden, Zitate oder Referenzen erfinden.',
  'Keine austauschbaren Werbefloskeln, keine erfundenen Eigenschaften, Qualifikationen, Verfügbarkeit, Spezialleistungen, Preise, Bewertungen oder Projekte.',
  'Lesbarer Text, Kontrast mindestens 4,5:1, Tastaturfokus, erreichbare Handlungen und keine Überläufe auf Desktop und Handy.',
  'Qualität an der tatsächlichen Desktop-/Mobilansicht kritisieren und konkrete Schwächen benennen. Keine automatisch erfundene 9,5-Note und keine Conversion-Garantie.',
] as const;
export function freeDesignBrief(f: BusinessFacts, c: SiteContent) {
  const verified = [
    `Name: ${f.name}`,
    `Adresse: ${f.street} ${f.houseNumber}, ${f.postalCode} ${f.city}`,
    ...(f.verifiedServices ?? []).map((x) => `Leistung: ${x}`),
  ];
  const missing: string[] = [];
  if (!f.verifiedServices?.length) missing.push('Bestätigte Leistungen');
  if (!f.openingLines.length) missing.push('Öffnungszeiten');
  if (!f.photos?.some((p) => p.rightsConfirmed && p.origin !== 'example')) missing.push('Freigegebene eigene Bilder');
  return {
    version: 3,
    standard: FREE_DESIGN_VERSION,
    kit: 'Freie Gestaltung',
    variant: 'individuell',
    audience: 'Besucher des konkreten Betriebs',
    question: 'Passt das Angebot zu meinem Anliegen, und wie erreiche ich den Betrieb?',
    action: 'Kontakt zum Betrieb anfragen',
    verified,
    missing,
    proposals: [c.design?.concept ?? 'Individuelles Konzept fehlt', ...FREE_DESIGN_CRITERIA],
    density: 'minimalistisch, kurze Texte, Bilder und Kacheln statt Textwände',
    why: 'Die KI entscheidet die Gestaltung selbst; Reihenfolge der Inhalte ist fest, damit jede Seite klar und schnell wirkt.',
  };
}
