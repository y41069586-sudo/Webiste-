import type { BusinessFacts, SiteContent } from '../types';
import type { Kit } from './kits';
import { editorialPlan, type EditorialPlan } from './editorial';

/**
 * Gestaltungsbriefing vor jeder Demo: trennt belegte Angaben, Gestaltungsvorschläge und fehlende Informationen.
 * Es entscheidet, wie lang die Seite wird (dünne Datenlage → kürzere, starke Seite), und wird mit der Demo
 * gespeichert, damit die Freigabe sieht, worauf die Gestaltung beruht.
 */
export interface DesignBrief {
  version: 1;
  editorial: EditorialPlan;
  kit: string;
  variant: string;
  /** wer die Seite besucht und was er zuerst wissen will */
  audience: string;
  question: string;
  /** Haupt-Handlung im ersten Bildschirm */
  action: string;
  /** belegt (Quelle, Recherche, Eintrag) */
  verified: string[];
  /** Gestaltungsvorschläge (keine Tatsachen über den Betrieb) */
  proposals: string[];
  /** fehlt und wird nicht erfunden */
  missing: string[];
  /** kompakt = wenig Belegtes, die Seite bleibt kurz */
  density: 'kompakt' | 'voll';
  why: string;
}

export function designBrief(
  facts: BusinessFacts,
  content: Pick<SiteContent, 'services' | 'about' | 'faq'>,
  kit: Kit,
  variant: { variant: string; reason: string },
): DesignBrief {
  const verified: string[] = [];
  const missing: string[] = [];
  const proposals: string[] = [];
  const vs = facts.verifiedServices ?? [];
  if (vs.length) verified.push(`Leistungen laut Quelle: ${vs.slice(0, 6).join(', ')}`);
  else missing.push('Ihre genauen Leistungen (die Liste im Entwurf sind Beispiele)');
  verified.push(`Adresse: ${facts.street} ${facts.houseNumber}, ${facts.postalCode} ${facts.city}`.trim());
  if (facts.phone) verified.push('Telefonnummer');
  else missing.push('Ihre Telefonnummer');
  if (facts.openingLines.length) verified.push('Öffnungszeiten');
  else missing.push('Ihre Öffnungszeiten');
  if (!content.about.trim()) missing.push('Ein paar Sätze über Ihren Betrieb, zum Beispiel wer zu den Kunden kommt');
  const ownPhotos = (facts.photos ?? []).filter((p) => p.origin !== 'example' && p.rightsConfirmed);
  if (ownPhotos.length) verified.push(`${ownPhotos.length} eigene Fotos mit geklärten Rechten`);
  else
    missing.push(
      kit.group === 'handwerk'
        ? 'Fotos von Ihnen und Ihren Projekten (die Bilder im Entwurf sind Symbolbilder)'
        : 'Fotos von Ihnen und Ihren Räumen (die Bilder im Entwurf sind Symbolbilder)',
    );
  if (!facts.logoSrc || !facts.logoRightsConfirmed) missing.push('Ihr Logo, falls vorhanden');
  if (kit.group === 'beauty') missing.push('Ihre Preisliste mit Dauer je Behandlung');
  if (kit.group === 'gastronomie') missing.push('Ihre Speisekarte mit Preisen und Allergenen');
  if (kit.group === 'handwerk') missing.push('Nachweise wie Meisterbrief oder Innung, falls vorhanden');

  const editorial = editorialPlan(facts.group, facts.branchLabel, facts.verifiedServices);
  proposals.push(`Gestaltungsstandard: ${editorial.version}; Komposition: ${editorial.composition}`);
  proposals.push(`Besucheraufgabe: ${editorial.visitorTask}`);
  proposals.push(`Bildauftrag: ${editorial.imagePurpose}`);
  const action = facts.phone && kit.primary === 'call' ? 'Anrufen' : requestLabel(kit, facts.branchLabel);
  proposals.push(`Konzept „${kit.name}“, Farbwelt „${variant.variant}“: ${variant.reason}`);
  proposals.push(`Haupt-Handlung: ${action}`);
  if (content.faq.length) proposals.push(`${content.faq.length} Fragen, die vor einer Anfrage wirklich auftauchen`);
  const thin = vs.length < 3 && ownPhotos.length === 0;
  const density = thin ? 'kompakt' : 'voll';
  const why = thin
    ? 'Wenig belegt: kurze Seite mit Name, Leistungen, Kontakt und Anfrage. Nichts wird aufgefüllt.'
    : 'Genug belegt für eine vollständige Seite; Reihenfolge nach dem, was Besucher zuerst wissen wollen.';
  return {
    version: 1,
    editorial,
    kit: kit.id,
    variant: variant.variant,
    audience: kit.audience,
    question: kit.question,
    action,
    verified,
    proposals,
    missing,
    density,
    why,
  };
}

/** Button-Text nach dem, was wirklich passiert: eine Anfrage, keine Buchung. */
export function requestLabel(kit: Kit, branchLabel: string): string {
  const b = branchLabel.toLocaleLowerCase('de');
  if (kit.group === 'gastronomie') return 'Tisch anfragen';
  if (kit.group === 'beauty') return /friseur|barber|haar/.test(b) ? 'Termin anfragen' : 'Behandlung anfragen';
  if (kit.id === 'kit-reinigung')
    return /reinig|putz|gebäude|fenster|glas/.test(b) ? 'Reinigungsangebot anfragen' : 'Angebot anfragen';
  return 'Projekt anfragen';
}
