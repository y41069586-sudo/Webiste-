import type { BusinessFacts, SiteContent } from '../types';
import { FREE_DESIGN_VERSION } from './design';

export const FREE_DESIGN_CRITERIA = [
  'Entwirf für diesen Betrieb ein eigenständiges Konzept. Keine Branchenvorlage, kein Pflicht-Hero, keine festgelegte Abschnittsfolge und kein vorgegebenes Farbschema.',
  'Entscheide selbst über Typografie, Größenverhältnisse, Farbgewicht, Bildkomposition, Abstände und Seitenrhythmus. Begründe das Konzept kurz anhand der vorhandenen Fakten und der Besucheraufgabe.',
  'Der erste Bildschirm muss Name, tatsächliche Tätigkeit, Ort und eine passende Handlung verständlich machen. Große Schrift allein ist keine Gestaltung.',
  'Jeder Abschnitt muss neue relevante Information beitragen. Wenig belegte Information ergibt eine kurze, bewusst gestaltete Seite statt erfundener Geschichte, FAQ oder Referenzen.',
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
    density: !f.verifiedServices?.length ? 'kompakt' : 'nach Informationswert',
    why: 'Die KI entscheidet die Komposition selbst anhand der Fakten; keine erzwungene Vorlage.',
  };
}
