import type { RawPlace } from '../providers/types';

/**
 * Automatische Vorauswahl aus ungeprüften Quellsignalen (OSM-Einträge, eigene Website-Vorprüfung).
 *
 * Zweck: unter vielen Treffern zuerst die Betriebe recherchieren, bei denen sich die manuelle Prüfung am ehesten
 * lohnt. Der Wert ordnet nur die Prüfreihenfolge; er ist keine Kaufwahrscheinlichkeit, ersetzt keine Recherche
 * (leads/acquisition.ts) und gibt nichts zum Versand frei. Ohne zulässige Bewertungsquelle gibt es bewusst keine
 * Sterne-Signale – stattdessen Aktivität, Erreichbarkeit und „online aktiv, aber ohne eigene Seite“.
 */
export interface PrescreenReason {
  criterion: string;
  points: number;
  detail: string;
}

export type PrescreenTier = 'top' | 'mittel' | 'niedrig';

export interface PrescreenInput {
  place: RawPlace;
  /** Kampagnenrang der Branche (1 = höchste Priorität), null = außerhalb der Kampagne */
  campaignRank: number | null;
  /** Social-/Portal-Link statt eigener Website */
  socialOnly: boolean;
  /** Ergebnis der automatischen Website-Vorprüfung, falls gelaufen */
  probe?: 'found' | 'possible' | 'none';
}

export interface PrescreenResult {
  score: number;
  tier: PrescreenTier;
  reasons: PrescreenReason[];
}

const DAY = 86_400_000;

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (30.44 * DAY);
}

function parseDay(v: string | undefined): Date | null {
  if (!v) return null;
  const full = /^\d{4}$/.test(v) ? `${v}-07-01` : /^\d{4}-\d{2}$/.test(v) ? `${v}-15` : v;
  const d = new Date(full.length === 10 ? `${full}T00:00:00Z` : full);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function prescreen(input: PrescreenInput, now = new Date()): PrescreenResult {
  const { place, campaignRank } = input;
  const meta = place.sourceMeta ?? {};
  const reasons: PrescreenReason[] = [];
  const add = (criterion: string, points: number, detail: string) => reasons.push({ criterion, points, detail });

  if (campaignRank !== null)
    add(
      'kampagne',
      campaignRank === 1 ? 15 : campaignRank === 2 ? 12 : campaignRank === 3 ? 10 : 6,
      `Kampagnenbranche (Rang ${campaignRank})`,
    );
  if (place.phone) add('telefon', 15, 'Geschäftliche Telefonnummer in der Quelle');
  if (place.openingHours?.days.length) add('oeffnungszeiten', 10, 'Öffnungszeiten in der Quelle gepflegt');

  // Aktivität: jüngste Prüfung bzw. Bearbeitung des Eintrags. Alte, nie geprüfte Einträge sind oft geschlossene Betriebe.
  const touched = [parseDay(meta.checkedOn), parseDay(meta.lastEditedAt)]
    .filter((d): d is Date => d !== null && d <= now)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const touchedMonths = touched ? monthsBetween(touched, now) : null;
  if (touchedMonths !== null && touchedMonths <= 24)
    add('aktivitaet', 20, `Eintrag vor ${Math.max(0, Math.round(touchedMonths))} Monaten geprüft/bearbeitet`);
  else if (touchedMonths !== null && touchedMonths <= 60)
    add('aktivitaet', 8, `Eintrag vor ${Math.round(touchedMonths)} Monaten geprüft/bearbeitet`);
  else if (touchedMonths !== null)
    add('veraltet', -15, `Eintrag seit ${Math.round(touchedMonths / 12)} Jahren unverändert – Betrieb evtl. geschlossen`);

  if (input.socialOnly || (meta.socialLinks ?? 0) > 0)
    add('online_aktiv', 15, 'Online aktiv (Social/Portal), aber ohne eigene Website');

  if (meta.emailDomain === 'freemail')
    add('keine_domain', 10, 'Kontakt-E-Mail bei einem Freemail-Anbieter – keine eigene Domain');
  else if (meta.emailDomain && input.probe !== 'none')
    add('eigene_domain', -10, 'Eigene E-Mail-Domain – Website darunter möglich, gezielt prüfen');

  const start = parseDay(meta.startDate);
  if (start && start <= now) {
    const age = monthsBetween(start, now);
    if (age >= 6 && age <= 36) add('jung', 15, `Laut Eintrag seit ${Math.round(age)} Monaten tätig`);
    else if (age < 6) add('jung', 8, 'Laut Eintrag erst vor wenigen Monaten gestartet');
  }

  if (input.probe === 'possible')
    add('website_moeglich', -40, 'Unter einer naheliegenden Domain antwortet eine passende Seite – vor allem anderen prüfen');

  const raw = reasons.reduce((sum, r) => sum + r.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  const tier: PrescreenTier = score >= 60 ? 'top' : score >= 35 ? 'mittel' : 'niedrig';
  return { score, tier, reasons };
}
