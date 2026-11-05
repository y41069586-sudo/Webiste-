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
  'Entwirf für diesen Betrieb ein eigenständiges Konzept. Keine Branchenvorlage, kein Pflicht-Hero, keine festgelegte Abschnittsfolge und kein vorgegebenes Farbschema.',
  'Entscheide selbst über Typografie, Größenverhältnisse, Farbgewicht, Bildkomposition, Abstände und Seitenrhythmus. Begründe das Konzept kurz anhand der vorhandenen Fakten und der Besucheraufgabe.',
  'Der erste Bildschirm muss Name, tatsächliche Tätigkeit, Ort und eine passende Handlung verständlich machen. Große Schrift allein ist keine Gestaltung.',
  'Jeder Abschnitt muss neue relevante Information beitragen. Fehlen Fakten über den Betrieb, wird die Seite NICHT kurz: sie füllt sich mit nützlichem, wahrem Fachwissen für Besucher statt mit erfundener Geschichte, Referenzen oder Eigenschaften.',
  `PFLICHT-INHALTE (Reihenfolge und Gestaltung frei, mindestens 6 Abschnitte mit h2, zusammen mindestens 1800 Zeichen sichtbarer Text): (1) Leistungen, jede mit 2–3 Sätzen fachlicher Erklärung, was üblicherweise dazugehört und worauf man achtet (Branchenwissen, keine Behauptung über diesen Betrieb; unbestätigte Leistungen als Beispiel kennzeichnen); (2) „So läuft eine Anfrage ab“ in 3–4 Schritten, als Beispielablauf gekennzeichnet; (3) „Gut vorbereitet anfragen“: welche Angaben, Maße oder Fotos Besucher für eine Anfrage bereithalten; (4) Eindrücke mit den verfügbaren Bildslots, falls Bilder vorhanden; (5) 3–4 Fragen zum Ablauf einer Anfrage, beantwortet ohne Zusagen über Preise, Zeiten oder Verfügbarkeit; (6) Standort mit Adresse und Route sowie Kontakt mit klarer Handlung.`,
  'Keine Platzhalter für eigene Fotos, Team oder Referenzen im HTML: das ergänzt das System im Entwurf selbst außerhalb deines Bereichs.',
  'Bilder bewusst einsetzen und für Mobil anders zuschneiden, wenn nötig. Kein großes beliebiges Werkzeugfoto als automatische Standardlösung; ein überzeugender Entwurf ohne Bild ist erlaubt.',
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
    density: 'vollständig',
    why: 'Die KI entscheidet die Komposition selbst; Pflicht-Inhalte sorgen für eine vollständige Seite ohne erfundene Fakten.',
  };
}
