import type { AppConfig, BranchConfig } from '../config/settings';
import type { RawPlace } from '../providers/types';
import { foldUmlauts, normalizeBusinessName } from './normalize';

export const REJECTION_REASONS = [
  'has_website',
  'not_operational',
  'rating_too_low',
  'too_few_ratings',
  'no_rating_data',
  'incomplete_address',
  'suppressed',
  'recently_contacted',
  'chain',
  'outside_city',
  'duplicate',
] as const;
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export const REJECTION_LABELS: Record<RejectionReason, string> = {
  has_website: 'Hat bereits eine eigene Website',
  not_operational: 'Nicht geöffnet / dauerhaft geschlossen',
  rating_too_low: 'Bewertung unter Mindestwert',
  too_few_ratings: 'Zu wenige Bewertungen',
  no_rating_data: 'Keine Bewertungsdaten (Filter verlangt sie)',
  incomplete_address: 'Postanschrift unvollständig',
  suppressed: 'Auf der Sperrliste (Widerspruch)',
  recently_contacted: 'In den letzten 12 Monaten kontaktiert',
  chain: 'Filialkette / Franchise',
  outside_city: 'Außerhalb der Zielstadt',
  duplicate: 'Dublette eines anderen Leads',
};

export interface WebsiteClass {
  hasWebsite: boolean;
  socialOnly: boolean;
  websiteUri?: string;
}

/** Social-Media-, Linktree- oder Buchungsportal-Links gelten nicht als echte Website. */
export function classifyWebsite(uri: string | undefined | null, socialDomains: string[]): WebsiteClass {
  if (!uri || !uri.trim()) return { hasWebsite: false, socialOnly: false };
  let host: string;
  try {
    host = new URL(uri.includes('://') ? uri : `https://${uri}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return { hasWebsite: false, socialOnly: false, websiteUri: uri };
  }
  const social = socialDomains.some((d) => host === d || host.endsWith(`.${d}`));
  return social
    ? { hasWebsite: false, socialOnly: true, websiteUri: uri }
    : { hasWebsite: true, socialOnly: false, websiteUri: uri };
}

/** Kettenname enthalten (Wortgrenzen, Umlaut-tolerant)? */
export function matchesChainName(name: string, chainNames: string[]): string | null {
  const n = ` ${normalizeBusinessName(name)} `;
  for (const c of chainNames) {
    const cn = normalizeBusinessName(c);
    if (cn && n.includes(` ${cn} `)) return c;
  }
  return null;
}

export function hasCompleteAddress(p: Pick<RawPlace, 'street' | 'houseNumber' | 'postalCode' | 'city'>): boolean {
  return Boolean(
    p.street?.trim() && p.houseNumber?.trim() && p.postalCode && /^\d{5}$/.test(p.postalCode.trim()) && p.city?.trim(),
  );
}

export interface RatingSignal {
  rating: number;
  ratingCount: number;
}

export interface QualifyInput {
  place: RawPlace;
  branch: BranchConfig;
  city: string;
  cfg: AppConfig;
  isSuppressed: boolean;
  recentlyContacted: boolean;
  chainByFrequency: boolean;
  isDuplicate?: boolean;
  /** Bewertung aus einer Quelle, deren Nutzung zulässig ist (nicht gespeichert) */
  rating?: RatingSignal | null;
}

export interface QualifyResult {
  qualified: boolean;
  reasons: RejectionReason[];
  score: number;
  website: WebsiteClass;
}

export function computeScore(input: {
  branch: BranchConfig;
  place: RawPlace;
  rating?: RatingSignal | null;
  website: WebsiteClass;
}): number {
  const { place, rating } = input;
  // Vollständigkeit des Eintrags als Signal für einen etablierten Betrieb
  let completeness = 2;
  if (place.phone) completeness += 1;
  if (place.openingHours && place.openingHours.days.length > 0) completeness += 1;
  if (input.website.socialOnly) completeness += 1; // aktiv online, aber ohne eigene Seite
  const ratingPart = rating ? rating.rating * Math.log(1 + rating.ratingCount) : 0;
  return Math.round((ratingPart + completeness) * input.branch.weight * 100) / 100;
}

/** Reine Qualifizierungslogik (ohne DB) – alle Ablehnungsgründe werden gesammelt. */
export function qualify(input: QualifyInput): QualifyResult {
  const { place, cfg } = input;
  const reasons: RejectionReason[] = [];
  const website = classifyWebsite(place.websiteUri, cfg.filters.socialDomains);
  if (website.hasWebsite) reasons.push('has_website');
  if (cfg.filters.requireOperational && place.businessStatus && place.businessStatus !== 'OPERATIONAL')
    reasons.push('not_operational');
  if (input.rating) {
    if (input.rating.rating < cfg.filters.minRating) reasons.push('rating_too_low');
    if (input.rating.ratingCount < cfg.filters.minRatingCount) reasons.push('too_few_ratings');
  } else if (cfg.filters.requireRatingSignal) {
    reasons.push('no_rating_data');
  }
  if (!hasCompleteAddress(place)) reasons.push('incomplete_address');
  if (place.city && foldUmlauts(place.city).trim() !== foldUmlauts(input.city).trim()) reasons.push('outside_city');
  if (input.isSuppressed) reasons.push('suppressed');
  if (input.recentlyContacted) reasons.push('recently_contacted');
  if (input.chainByFrequency || matchesChainName(place.name, cfg.targeting.chainNames)) reasons.push('chain');
  if (input.isDuplicate) reasons.push('duplicate');
  return {
    qualified: reasons.length === 0,
    reasons,
    score: computeScore({ branch: input.branch, place, rating: input.rating, website }),
    website,
  };
}
