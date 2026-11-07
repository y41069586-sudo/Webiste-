import type { BusinessFacts, SiteContent } from '../types';
import { FREE_DESIGN_VERSION, authoredText } from './design';

/** Mindestumfang des freien Entwurfs (Betreiber 05.11.2026: „die Websites sind so kurz“) */
export const AUTHORED_MIN_SECTIONS = 6;
export const AUTHORED_MIN_TEXT = 1800;

/** Vollständigkeit für neue Generierungen (nicht beim Rendern gespeicherter Seiten): Abschnitte, Textmenge, Bilder. */
export function authoredCompleteness(html: string, imageSlots: number): string[] {
  const out: string[] = [];
  const h2 = (html.match(/<h2[\s>]/g) ?? []).length;
  if (h2 < AUTHORED_MIN_SECTIONS)
    out.push(
      `Nur ${h2} Abschnitte mit h2; mindestens ${AUTHORED_MIN_SECTIONS} Pflicht-Inhalte liefern (Leistungen mit Erklärung, Ablauf, Vorbereitung, Eindrücke, Fragen, Standort/Kontakt).`,
    );
  const text = authoredText(html).length;
  if (text < AUTHORED_MIN_TEXT)
    out.push(
      `Nur ${text} Zeichen sichtbarer Text; mindestens ${AUTHORED_MIN_TEXT} Zeichen nützliches, wahres Fachwissen ergänzen.`,
    );
  const used = new Set([...html.matchAll(/\{\{image_([123])\}\}/g)].map((m) => m[1]));
  if (imageSlots >= 2 && used.size < 2) out.push('Mindestens zwei der verfügbaren Bildslots sichtbar einsetzen.');
  return out;
}

export const FREE_DESIGN_CRITERIA = [
  'Arbeite wie ein Gestaltungsstudio: zuerst Besucheraufgabe und eigene visuelle Leitidee, dann Komposition, dann Detailarbeit. Eine Sammlung erfüllter Pflichtfelder ist noch keine gute Website.',
  'Die gewählte Idee muss vom Einstieg bis zum Kontakt erkennbar sein: typografische Hierarchie, Bildausschnitte, wiederkehrende Details und bewusster Wechsel zwischen ruhigen und dichten Bereichen. Keine identische Kartenreihe für jeden Inhalt.',
  'Pflichtinhalte sind semantische Anforderungen, keine Gestaltungsblöcke. Verknüpfe zusammengehörige Inhalte; variiere Proportionen nach ihrer Bedeutung. Mindesttextmenge mit hilfreichen Informationen erreichen, niemals mit Fülltext oder künstlicher Seitenlänge.',
  'Handy-Einstieg (Betreiber 07.11.2026): Am Handy zeigt das System den Bereich mit der h1 automatisch als Vollbild-Foto mit dunklem Verlauf und hellem Text darüber. Lege deshalb in genau diesen Einstiegsbereich (ohne h2) ein passendes Bild aus den Bildslots und halte den Text dort kurz: Name, Tätigkeit mit Ort, höchstens ein Satz, ein bis zwei Handlungen. Auf dem Computer gestaltest du den Einstieg frei.',
  'Handy-Lesbarkeit: kurze Absätze mit höchstens zwei bis drei Sätzen; ausführliche Erklärungen (z. B. je Leistung) in details/summary aufklappbar statt als lange Textwand; keine mehrspaltigen Textraster, keine seitlich wischbaren Reihen (overflow-x) – am Handy stehen Karten, Leistungen und Bilder untereinander – und keine winzigen Schriftgrößen unter 15 px. Nicht einfach alle Desktopflächen unverändert untereinander stellen.',
  'Entwirf für diesen Betrieb ein eigenständiges Konzept. Keine Branchenvorlage, auf dem Computer kein Pflicht-Hero, keine festgelegte Abschnittsfolge und kein vorgegebenes Farbschema.',
  'Entscheide selbst über Typografie, Größenverhältnisse, Farbgewicht, Bildkomposition, Abstände und Seitenrhythmus. Begründe das Konzept kurz anhand der vorhandenen Fakten und der Besucheraufgabe.',
  'Der erste Bildschirm muss Name, tatsächliche Tätigkeit, Ort und eine passende Handlung verständlich machen. Große Schrift allein ist keine Gestaltung.',
  'Mindestens sechs Abschnitte mit h2 und zusammen mindestens 1800 Zeichen sichtbaren, nützlichen Text gestalten. Allgemeines Fachwissen statt Wiederholungen oder erfundener Betriebsmerkmale.',
  'Jede Seite enthält mindestens: fachlich erklärte Leistungen, einen gekennzeichneten Beispielablauf einer Anfrage, eine konkrete Anfrage-Checkliste, Standort/Anfahrt oder bei Arbeit beim Kunden ein Einsatzgebiet, Öffnungszeiten/Kontakt, Bildstrecke, drei bis vier Ablauf-Fragen sowie markierte Entwurfsplatzhalter für eigene Fotos, Team und Referenzen. Die Reihenfolge und Gestaltung entscheidest du frei; auch bei dünner Datenlage keine Hero-Leistungen-Adresse-Kurzseite.',
  'Leistungen fachlich mit Branchenwissen erklären (Zweck, typische Varianten und nötige Angaben), klar als allgemeine Information getrennt von belegten Betriebsleistungen. Keine Spezialisierung, Arbeitsweise oder Ausstattung des Betriebs daraus ableiten.',
  'Den Anfrageablauf ausdrücklich als Beispiel kennzeichnen, ohne Rückruf-, Preis-, Besichtigungs- oder Terminzusagen. Die Checkliste nennt mindestens drei hilfreiche Angaben wie Anlass, Ort, Umfang und Wunschzeitraum.',
  'Standortabschnitt über {{service_area}}: Bei Studios, Gastro, Handel und Kursen heißt er Standort/Anfahrt, kein Einsatzgebiet und kein Umkreis. Nur bei Arbeit beim Kunden Stadt und Umgebung als unbestätigten Gebietsvorschlag zeigen. Keine Parkplätze, Haltestellen, Radien oder Besuchszeiten erfinden. Öffnungszeiten und echter Kontakt kommen aus dem geschützten Bereich.',
  'Bildstrecke aus zwei bis drei verfügbaren Bildslots, automatisch als Symbolbilder gekennzeichnet, soweit es keine freigegebenen Betriebsfotos sind. Keine Referenzarbeiten behaupten. Fehlen passende Bilder, einen markierten Foto-Platzhalter zeigen. Mobile Zuschnitte bewusst gestalten.',
  'Drei bis vier konkrete Fragen zum Anfrageablauf beantworten: nötige Angaben, Wunschzeitraum, vorhandene Unterlagen, Rückfragen. Keine Antworten über tatsächliche Kapazität, Preise oder Fristen erfinden.',
  'Im Entwurf eigene Fotos, Team und Referenzen als noch zu ergänzende Entwurfsplatzhalter mit den vorgegebenen Tokens und data-ad-placeholder markieren. Keine Personen, Kunden, Zitate oder Beispielreferenzen erfinden; diese Platzhalter erscheinen nicht live.',
  'Keine austauschbaren Werbefloskeln, keine erfundenen Eigenschaften, Qualifikationen, Verfügbarkeit, Spezialleistungen, Preise, Bewertungen oder Projekte.',
  'Karten, Rundungen, Farbverläufe, Farben und Schriftstile sind keine pauschalen Verbote oder Pflichten. Verwende ein Mittel nur, wenn es die konkrete Gestaltung trägt.',
  'Gestalte die gesamte Seite und eine eigenständige Mobilansicht. Lesbarer Text, Kontrast, Tastaturfokus, erreichbare Handlungen und keine Überläufe.',
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
    version: 2,
    standard: FREE_DESIGN_VERSION,
    kit: 'Freie Gestaltung',
    variant: 'individuell',
    audience: 'Besucher des konkreten Betriebs',
    question: 'Passt das belegte Angebot zu meinem Anliegen, und wie frage ich an?',
    action: 'Kontakt zum Betrieb anfragen',
    verified,
    missing,
    proposals: [c.design?.concept ?? 'Individuelles Konzept fehlt', ...FREE_DESIGN_CRITERIA],
    density: 'vollständige Inhaltsstrecke, fachlich und quellenbewusst',
    why: 'Die KI entscheidet die Komposition selbst anhand der Fakten; keine erzwungene Vorlage.',
  };
}
