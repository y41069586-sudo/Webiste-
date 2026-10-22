import { fromGoogleOpeningHours } from '../../leads/opening-hours';
import { formatPhoneDe, normalizeBusinessName } from '../../leads/normalize';
import { HttpError, withRetry } from '../../util/retry';
import type { LeadSearchQuery, LeadSearchResult, LeadSource, RawPlace } from '../types';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/** Minimale Feldmaske (Kosten!). Alle Felder ≥ Enterprise-SKU, siehe docs/integrations.md */
export const TEXT_SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.addressComponents',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
  'places.primaryType',
  'places.regularOpeningHours',
  'nextPageToken',
].join(',');

/** Für den Signal-Modus: nur, was für die Entscheidung nötig ist. */
export const SIGNAL_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.addressComponents',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.businessStatus',
].join(',');

interface GPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  primaryType?: string;
  types?: string[];
  regularOpeningHours?: Parameters<typeof fromGoogleOpeningHours>[0];
}

function comp(p: GPlace, type: string): string | undefined {
  return p.addressComponents?.find((c) => c.types?.includes(type))?.longText;
}

export function googlePlaceToRaw(p: GPlace): RawPlace {
  return {
    source: 'google_places',
    sourceId: p.id,
    name: p.displayName?.text ?? '',
    street: comp(p, 'route'),
    houseNumber: comp(p, 'street_number'),
    postalCode: comp(p, 'postal_code'),
    city: comp(p, 'locality') ?? comp(p, 'postal_town'),
    country: p.addressComponents?.find((c) => c.types?.includes('country'))?.shortText ?? 'DE',
    formattedAddress: p.formattedAddress,
    phone: formatPhoneDe(p.nationalPhoneNumber) ?? undefined,
    websiteUri: p.websiteUri,
    rating: p.rating,
    ratingCount: p.userRatingCount,
    businessStatus: p.businessStatus,
    primaryType: p.primaryType,
    types: p.types,
    openingHours: fromGoogleOpeningHours(p.regularOpeningHours),
  };
}

function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeBusinessName(a).split(' ').filter((t) => t.length > 1));
  const tb = new Set(normalizeBusinessName(b).split(' ').filter((t) => t.length > 1));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

export interface GoogleSignal {
  placeId: string;
  rating: number | null;
  ratingCount: number | null;
  websiteUri: string | null;
  businessStatus: string | null;
}

export class GooglePlacesClient {
  constructor(
    private readonly apiKey: string,
    private readonly pricePer1000UsdCents: number,
    private readonly usdToEur: number,
  ) {}

  /** Kosten pro Request in Cent (EUR, aufgerundet auf 0,01 Cent genau als Bruchteil) */
  costPerRequestCents(): number {
    return (this.pricePer1000UsdCents / 1000) * this.usdToEur;
  }

  async searchPage(body: Record<string, unknown>, fieldMask: string): Promise<{ places?: GPlace[]; nextPageToken?: string }> {
    return withRetry(async () => {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Goog-Api-Key': this.apiKey, 'X-Goog-FieldMask': fieldMask },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      if (!res.ok) throw new HttpError(`Places HTTP ${res.status}`, res.status, text.slice(0, 500));
      return JSON.parse(text) as { places?: GPlace[]; nextPageToken?: string };
    });
  }

  /**
   * Signal-Modus: Bewertung/Website zu einem bereits bekannten Betrieb (aus OSM) nachschlagen.
   * Ergebnis wird nur flüchtig für die Entscheidung verwendet; gespeichert wird nur place_id.
   */
  async lookupSignal(name: string, street: string, houseNumber: string, postalCode: string, city: string): Promise<GoogleSignal | null> {
    const res = await this.searchPage(
      { textQuery: `${name}, ${street} ${houseNumber}, ${postalCode} ${city}`, languageCode: 'de', regionCode: 'DE', pageSize: 3 },
      SIGNAL_FIELD_MASK,
    );
    const best = (res.places ?? [])
      .map((p) => ({ p, sim: nameSimilarity(name, p.displayName?.text ?? ''), plz: comp(p, 'postal_code') }))
      .filter((x) => x.plz === postalCode && x.sim >= 0.5)
      .sort((a, b) => b.sim - a.sim)[0];
    if (!best) return null;
    return {
      placeId: best.p.id,
      rating: best.p.rating ?? null,
      ratingCount: best.p.userRatingCount ?? null,
      websiteUri: best.p.websiteUri ?? null,
      businessStatus: best.p.businessStatus ?? null,
    };
  }
}

/**
 * Google Places Text Search als Primärquelle. ACHTUNG: Die Google-Nutzungsbedingungen
 * untersagen das Speichern von Firmennamen und Adressen (siehe docs/compliance-google.md).
 * Der Lead-Finder verwendet diese Quelle nur mit dokumentierter Genehmigung.
 */
export class GooglePlacesLeadSource implements LeadSource {
  readonly kind = 'google_places' as const;
  constructor(private readonly client: GooglePlacesClient) {}

  async search(query: LeadSearchQuery): Promise<LeadSearchResult> {
    const places: RawPlace[] = [];
    let pageToken: string | undefined;
    let requests = 0;
    const base = { textQuery: query.text, languageCode: 'de', regionCode: 'DE', pageSize: 20 };
    do {
      const res = await this.client.searchPage(pageToken ? { ...base, pageToken } : base, TEXT_SEARCH_FIELD_MASK);
      requests++;
      for (const p of res.places ?? []) places.push(googlePlaceToRaw(p));
      pageToken = res.nextPageToken;
    } while (pageToken && requests < query.maxPages);
    return { places, requests, costCents: requests * this.client.costPerRequestCents() };
  }
}
