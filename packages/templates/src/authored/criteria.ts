import type { BusinessFacts, SiteContent } from '../types';
import { FREE_DESIGN_VERSION } from './design';

export const FREE_DESIGN_CRITERIA = [
  'Entwirf für diesen Betrieb ein eigenständiges Konzept. Keine Branchenvorlage, kein Pflicht-Hero, keine festgelegte Abschnittsfolge und kein vorgegebenes Farbschema.',
  'Entscheide selbst über Typografie, Größenverhältnisse, Farbgewicht, Bildkomposition, Abstände und Seitenrhythmus. Begründe das Konzept kurz anhand der vorhandenen Fakten und der Besucheraufgabe.',
  'Der erste Bildschirm muss Name, tatsächliche Tätigkeit, Ort und eine passende Handlung verständlich machen. Große Schrift allein ist keine Gestaltung.',
  'Jede Seite enthält mindestens: fachlich erklärte Leistungen, einen gekennzeichneten Beispielablauf einer Anfrage, eine konkrete Anfrage-Checkliste, Einsatzgebiet, Öffnungszeiten/Kontakt, Bildstrecke, drei bis vier Ablauf-Fragen sowie markierte Entwurfsplatzhalter für eigene Fotos, Team und Referenzen. Die Reihenfolge und Gestaltung entscheidest du frei; auch bei dünner Datenlage keine Hero-Leistungen-Adresse-Kurzseite.',
  'Leistungen fachlich mit Branchenwissen erklären (Zweck, typische Varianten und nötige Angaben), klar als allgemeine Information getrennt von belegten Betriebsleistungen. Keine Spezialisierung, Arbeitsweise oder Ausstattung des Betriebs daraus ableiten.',
  'Den Anfrageablauf ausdrücklich als Beispiel kennzeichnen, ohne Rückruf-, Preis-, Besichtigungs- oder Terminzusagen. Die Checkliste nennt mindestens drei hilfreiche Angaben wie Anlass, Ort, Umfang und Wunschzeitraum.',
  'Einsatzgebiet über {{service_area}}: Stadt und Umgebung als unbestätigter Vorschlag im Entwurf; keine erfundenen Orte oder Radien. Öffnungszeiten und echter Kontakt kommen aus dem geschützten Bereich; unbekannte Zeiten nicht erfinden.',
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
