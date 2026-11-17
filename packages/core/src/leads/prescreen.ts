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
  /** Branchenschlüssel (z. B. 'dachdecker') für Auftragswert und Laufkundschaft */
  branchKey?: string;
}

/**
 * Recherche 17.11.2026 (reports/Beste Zielbetriebe für Websitebriefe.md): Kunden vergleichen vor allem bei teuren
 * Aufträgen online (Dach, Heizung/Sanitär, Garten, Tischler, Entrümpelung). Laufkundschaft (Café) kauft selten.
 * Gewichte sind begründete Annahmen, keine gemessenen Kaufquoten – nach den ersten Rückläufen anpassen.
 */
const HIGH_VALUE = new Set(['dachdecker', 'heizung', 'sanitaer', 'gartenbau', 'tischler', 'zimmerer', 'entruempelung']);
const MID_VALUE = new Set([
  'reinigung',
  'maler',
  'elektriker',
  'fliesenleger',
  'bodenleger',
  'parkettleger',
  'metallbau',
  'glaser',
  'stuckateur',
  'maurer',
]);
const WALK_IN = new Set(['cafe']);
/** Gastronomie und Beauty schließen öfter – alte Einträge dort früher als veraltet werten */
const SHORT_LIVED = new Set(['cafe', 'restaurant', 'friseur', 'nagelstudio', 'kosmetikstudio']);

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

  // Aktivität: Eine Vor-Ort-Prüfung (check_date) belegt den Betrieb am stärksten, eine bloße Bearbeitung schwächer
  // (auch Bots bearbeiten). Alte, nie geprüfte Einträge sind oft geschlossene Betriebe → Rückläufer.
  const checked = parseDay(meta.checkedOn);
  const edited = parseDay(meta.lastEditedAt);
  const checkedMonths = checked && checked <= now ? monthsBetween(checked, now) : null;
  const editedMonths = edited && edited <= now ? monthsBetween(edited, now) : null;
  const touchedMonths = [checkedMonths, editedMonths].filter((m): m is number => m !== null).sort((a, b) => a - b)[0] ?? null;
  const staleAfter = input.branchKey && SHORT_LIVED.has(input.branchKey) ? 36 : 60;
  if (checkedMonths !== null && checkedMonths <= 12)
    add('aktivitaet', 25, `Vor Ort geprüft vor ${Math.max(0, Math.round(checkedMonths))} Monaten`);
  else if (checkedMonths !== null && checkedMonths <= 24)
    add('aktivitaet', 15, `Vor Ort geprüft vor ${Math.round(checkedMonths)} Monaten`);
  else if (editedMonths !== null && editedMonths <= 24)
    add('aktivitaet', 12, `Eintrag vor ${Math.max(0, Math.round(editedMonths))} Monaten bearbeitet`);
  else if (touchedMonths !== null && touchedMonths <= staleAfter)
    add('aktivitaet', 6, `Eintrag vor ${Math.round(touchedMonths)} Monaten geprüft/bearbeitet`);
  else if (touchedMonths !== null)
    add('veraltet', -20, `Eintrag seit ${Math.round(touchedMonths / 12)} Jahren unverändert – Betrieb evtl. geschlossen`);

  if (input.branchKey && HIGH_VALUE.has(input.branchKey))
    add('auftragswert', 10, 'Teure Aufträge – Kunden vergleichen vorher online');
  else if (input.branchKey && MID_VALUE.has(input.branchKey))
    add('auftragswert', 5, 'Mittlere Auftragswerte – Website hilft beim Vergleich');
  if (input.branchKey && WALK_IN.has(input.branchKey))
    add('laufkundschaft', -10, 'Lebt vor allem von Laufkundschaft – kauft seltener eine Website');

  if (input.socialOnly || (meta.socialLinks ?? 0) > 0)
    add('online_aktiv', 15, 'Online aktiv (Social/Portal), aber ohne eigene Website');

  if (meta.emailDomain === 'freemail')
    add('keine_domain', 10, 'Kontakt-E-Mail bei einem Freemail-Anbieter – keine eigene Domain');
  else if (meta.emailDomain && input.probe !== 'none')
    add('eigene_domain', -10, 'Eigene E-Mail-Domain – Website darunter möglich, gezielt prüfen');

  const start = parseDay(meta.startDate);
  if (start && start <= now) {
    const age = monthsBetween(start, now);
    // 6–24 Monate: braucht Sichtbarkeit und hat die riskante Anfangszeit hinter sich
    if (age >= 6 && age <= 24) add('jung', 15, `Laut Eintrag seit ${Math.round(age)} Monaten tätig`);
    else if (age > 24 && age <= 36) add('jung', 8, `Laut Eintrag seit ${Math.round(age)} Monaten tätig`);
    else if (age < 6) add('jung', 5, 'Laut Eintrag erst vor wenigen Monaten gestartet');
  }

  if (input.probe === 'possible')
    add('website_moeglich', -40, 'Unter einer naheliegenden Domain antwortet eine passende Seite – vor allem anderen prüfen');

  const raw = reasons.reduce((sum, r) => sum + r.points, 0);
  const score = Math.max(0, Math.min(100, raw));
  const tier: PrescreenTier = score >= 60 ? 'top' : score >= 35 ? 'mittel' : 'niedrig';
  return { score, tier, reasons };
}
