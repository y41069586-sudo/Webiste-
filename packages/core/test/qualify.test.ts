import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { classifyWebsite, matchesChainName, qualify } from '../src/leads/qualify';
import { businessHash, formatPhoneDe, normalizeBusinessName, phoneHref, segmentKey } from '../src/leads/normalize';
import { formatOpeningHours, parseOsmOpeningHours } from '../src/leads/opening-hours';
import type { RawPlace } from '../src/providers/types';

const branch = DEFAULT_CONFIG.targeting.branches[0]!;
const base: RawPlace = {
  source: 'mock',
  sourceId: 'x1',
  name: 'Nagelstudio Lumi',
  street: 'Westenhellweg',
  houseNumber: '12',
  postalCode: '44137',
  city: 'Dortmund',
  businessStatus: 'OPERATIONAL',
  phone: '0231 123456',
};
const q = (place: Partial<RawPlace>, extra: Partial<Parameters<typeof qualify>[0]> = {}) =>
  qualify({
    place: { ...base, ...place },
    branch,
    city: 'Dortmund',
    cfg: DEFAULT_CONFIG,
    isSuppressed: false,
    recentlyContacted: false,
    chainByFrequency: false,
    rating: { rating: 4.8, ratingCount: 120 },
    ...extra,
  });

describe('Qualifizierung', () => {
  it('qualifiziert einen guten Betrieb ohne Website', () => {
    const r = q({});
    expect(r.qualified).toBe(true);
    expect(r.reasons).toEqual([]);
    expect(r.score).toBeGreaterThan(0);
  });

  it('echte Website → abgelehnt; Instagram/Linktree/Facebook → qualifiziert (social_only)', () => {
    expect(q({ websiteUri: 'https://www.studio-lumi.de' }).reasons).toContain('has_website');
    for (const url of [
      'https://www.instagram.com/lumi',
      'https://linktr.ee/lumi',
      'https://m.facebook.com/lumi',
      'https://www.tiktok.com/@lumi',
    ]) {
      const r = q({ websiteUri: url });
      expect(r.qualified, url).toBe(true);
      expect(r.website.socialOnly).toBe(true);
    }
  });

  it('Filter: Bewertung, Anzahl, Status, Anschrift, Sperrliste, Kontakt, Kette', () => {
    expect(q({}, { rating: { rating: 4.4, ratingCount: 100 } }).reasons).toContain('rating_too_low');
    expect(q({}, { rating: { rating: 4.9, ratingCount: 29 } }).reasons).toContain('too_few_ratings');
    expect(q({ businessStatus: 'CLOSED_PERMANENTLY' }).reasons).toContain('not_operational');
    expect(q({ houseNumber: undefined }).reasons).toContain('incomplete_address');
    expect(q({ postalCode: '4413' }).reasons).toContain('incomplete_address');
    expect(q({}, { isSuppressed: true }).reasons).toContain('suppressed');
    expect(q({}, { recentlyContacted: true }).reasons).toContain('recently_contacted');
    expect(q({ name: 'Douglas Parfümerie' }).reasons).toContain('chain');
    expect(q({}, { chainByFrequency: true }).reasons).toContain('chain');
    expect(q({ city: 'Bochum' }).reasons).toContain('outside_city');
  });

  it('Grenzwerte 4,5 Sterne und 30 Bewertungen gelten inklusive', () => {
    expect(q({}, { rating: { rating: 4.5, ratingCount: 30 } }).qualified).toBe(true);
  });

  it('ohne Bewertungsdaten: nur abgelehnt, wenn der Filter das verlangt', () => {
    expect(q({}, { rating: null }).qualified).toBe(true);
    const cfg = { ...DEFAULT_CONFIG, filters: { ...DEFAULT_CONFIG.filters, requireRatingSignal: true } };
    expect(q({}, { rating: null, cfg }).reasons).toContain('no_rating_data');
  });

  it('höherer Score bei mehr Bewertungen', () => {
    expect(q({}, { rating: { rating: 4.8, ratingCount: 300 } }).score).toBeGreaterThan(
      q({}, { rating: { rating: 4.8, ratingCount: 40 } }).score,
    );
  });

  it('Kettenname matcht nur ganze Wörter', () => {
    expect(matchesChainName('OBI Markt Dortmund', ['OBI'])).toBe('OBI');
    expect(matchesChainName('Malerbetrieb Obinna', ['OBI'])).toBeNull();
  });

  it('Website-Klassifizierung ohne Protokoll', () => {
    expect(classifyWebsite('instagram.com/abc', DEFAULT_CONFIG.filters.socialDomains).socialOnly).toBe(true);
    expect(classifyWebsite('', DEFAULT_CONFIG.filters.socialDomains).hasWebsite).toBe(false);
  });
});

describe('Normalisierung & Sperrlisten-Hash', () => {
  it('gleicher Hash trotz Schreibvarianten', () => {
    const a = businessHash('Maler Müller GmbH', { street: 'Hauptstraße', houseNumber: '5 a', postalCode: '44137' });
    const b = businessHash('maler mueller', { street: 'Hauptstr.', houseNumber: '5a', postalCode: '44137' });
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it('Rechtsformen und Sonderzeichen werden entfernt', () => {
    expect(normalizeBusinessName('Elektro Hoffmann GmbH & Co. KG')).toBe('elektro hoffmann');
    expect(normalizeBusinessName('Schmidt & Sohn e.K.')).toBe('schmidt und sohn');
  });

  it('Segment-Schlüssel', () => {
    expect(segmentKey('Dortmund', 'beauty', 'nagelstudio')).toBe('dortmund:beauty:nagelstudio');
  });

  it('Telefonnummern', () => {
    expect(formatPhoneDe('+49 231 1234567')).toBe('0231 1234567');
    expect(phoneHref('0231 1234567')).toBe('tel:+492311234567');
  });
});

describe('Öffnungszeiten (OSM)', () => {
  it('parst gängige Formate', () => {
    const oh = parseOsmOpeningHours('Mo-Fr 08:00-17:00; Sa 09:00-13:00; Su off');
    expect(oh?.days.map((d) => d.day)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(formatOpeningHours(oh)).toEqual([
      'Montag – Freitag: 08:00 – 17:00 Uhr',
      'Samstag: 09:00 – 13:00 Uhr',
      'Sonntag: geschlossen',
    ]);
  });
  it('mehrere Zeitfenster und Tageslisten', () => {
    const oh = parseOsmOpeningHours('Mo,We 09:00-12:00,14:00-18:00');
    expect(oh?.days).toHaveLength(2);
    expect(oh?.days[0]!.periods).toHaveLength(2);
  });
  it('unbekanntes Format → null (keine erfundenen Zeiten)', () => {
    expect(parseOsmOpeningHours('nach Vereinbarung')).toBeNull();
    expect(parseOsmOpeningHours('Mo-Fr 08:00-17:00; Sa[1] 10:00-12:00')).toBeNull();
  });
});
