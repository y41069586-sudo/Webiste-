import type { AppConfig } from '../config/settings';

/** Standard-Mindestpunkte im Sparmodus: etwa die obere Hälfte der echten Treffer (Stand 06.11.2026). */
export const BEST_MIN_SCORE_DEFAULT = 40;

/** Sparmodus aktiv? Ohne ausdrückliche Einstellung an (Betreiber: „nur die besten Betriebe“). */
export function bestOnlyEnabled(cfg: Pick<AppConfig, 'research'>): boolean {
  return cfg.research.bestOnly !== false;
}

export function bestMinScore(cfg: Pick<AppConfig, 'research'>): number {
  return cfg.research.bestMinScore ?? BEST_MIN_SCORE_DEFAULT;
}

/**
 * „Beste Betriebe“ mit den Daten, die es wirklich gibt (OSM liefert meist keine Bewertungen): nur Social-Media-Auftritt
 * statt Website, oder hohe Vorauswahl- bzw. Eignungspunkte. Alle anderen warten, nichts wird gelöscht.
 */
export function isBestLead(
  cfg: Pick<AppConfig, 'research'>,
  lead: { leadSegment?: string | null; prescreenScore?: number | null; score?: number | null },
): boolean {
  if (!bestOnlyEnabled(cfg)) return true;
  if (lead.leadSegment === 'social_only' || lead.leadSegment === 'neu') return true;
  const min = bestMinScore(cfg);
  return (lead.prescreenScore ?? 0) >= min || (lead.score ?? 0) >= min;
}
