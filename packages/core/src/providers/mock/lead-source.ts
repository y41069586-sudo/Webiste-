import { sha256 } from '../../util/crypto';
import type { LeadSearchQuery, LeadSearchResult, LeadSource, RawPlace } from '../types';

/**
 * Deterministische Testdaten (frei erfundene Betriebe). Enthält bewusst auch Einträge,
 * die an der Qualifizierung scheitern, damit Ablehnungsgründe sichtbar werden.
 */
const STREETS = [
  ['Westenhellweg', '44137'],
  ['Kampstraße', '44137'],
  ['Hansastraße', '44137'],
  ['Rheinische Straße', '44147'],
  ['Hohe Straße', '44139'],
  ['Märkische Straße', '44141'],
  ['Saarlandstraße', '44139'],
  ['Hörder Bahnhofstraße', '44263'],
  ['Hombrucher Straße', '44225'],
  ['Wittekindstraße', '44139'],
  ['Kreuzstraße', '44139'],
  ['Lindemannstraße', '44137'],
] as const;

const NAME_PARTS: Record<string, string[]> = {
  nagelstudio: [
    'Nagelstudio Lumi',
    'Nails by Mira',
    'Nagelzauber',
    'Studio Glanzstück',
    'Nagelkunst am Markt',
    'Pure Nails Dortmund',
  ],
  kosmetikstudio: [
    'Kosmetik Hautnah',
    'Kosmetikstudio Augenblick',
    'Beauty Lounge Selin',
    'Hautsache Kosmetik',
    'Kosmetik am Park',
    'Studio Zeitlos',
  ],
  maler: [
    'Malerbetrieb Kowalski',
    'Farbwerk Meisterbetrieb',
    'Maler Schmidt & Sohn',
    'Malerwerkstatt Ruhrfarben',
    'Malermeister Yilmaz',
    'Pinselstrich Malerei',
  ],
  elektriker: [
    'Elektro Becker',
    'Elektrotechnik Nowak',
    'Strom & Licht Dortmund',
    'Elektro Hoffmann GmbH',
    'E-Technik Aydin',
    'Elektro Wagner',
  ],
};

Object.assign(NAME_PARTS, {
  restaurant: ['Trattoria am Markt', 'Gasthaus Lindenhof', 'Bistro Kreuzviertel', 'Taverna Olymp', 'Küche & Tisch', 'Zum Hafen'],
  cafe: ['Café Pause', 'Kaffeehaus Ruhrblick', 'Café Zuckerstück', 'Bohne & Blatt', 'Café am Park', 'Kaffeeklatsch'],
  blumenladen: ['Blumen Vogt', 'Blütenzauber', 'Grünwerk Floristik', 'Blumen am Eck', 'Zweig & Blüte', 'Floristik Rose'],
  modegeschaeft: ['Boutique Elena', 'Kleiderei', 'Modehaus am Markt', 'Stoffwechsel', 'Lieblingsstück', 'Boutique Mira'],
  yogastudio: ['Yoga Raum', 'Atemzug Yoga', 'Studio Balance', 'Yoga am Hafen', 'Lotus Studio', 'Yogaloft'],
  tanzschule: ['Tanzschule Takt', 'Tanzwerk', 'Schritt für Schritt', 'Tanzstudio Rhythmus', 'Tanzhaus Süd', 'Studio Tango'],
});

function pick<T>(arr: readonly T[], n: number): T {
  return arr[n % arr.length]!;
}

export class MockLeadSource implements LeadSource {
  readonly kind = 'mock' as const;

  async search(q: LeadSearchQuery): Promise<LeadSearchResult> {
    const names = NAME_PARTS[q.branch.key] ?? [`${q.branch.label} Beispiel`];
    const places: RawPlace[] = names.map((name, i) => {
      const seed = parseInt(sha256(`${q.text}:${i}`).slice(0, 8), 16);
      const [street, plz] = pick(STREETS, seed);
      const variant = i % 6;
      const place: RawPlace = {
        source: 'mock',
        sourceId: `mock_${sha256(`${q.city}:${q.branch.key}:${name}`).slice(0, 20)}`,
        name,
        street,
        houseNumber: String((seed % 120) + 1),
        postalCode: plz,
        city: q.city,
        country: 'DE',
        formattedAddress: `${street} ${(seed % 120) + 1}, ${plz} ${q.city}`,
        phone: `0231 ${String(100000 + (seed % 899999))}`,
        rating: Number((4.3 + (seed % 8) / 10).toFixed(1)),
        ratingCount: 20 + (seed % 180),
        businessStatus: 'OPERATIONAL',
        primaryType: q.branch.googleTypes[0],
        types: q.branch.googleTypes,
        openingHours: {
          days: [1, 2, 3, 4, 5]
            .map((day) => ({ day, periods: [{ open: '09:00', close: '18:00' }] }))
            .concat(q.branch.group === 'beauty' ? [{ day: 6, periods: [{ open: '10:00', close: '14:00' }] }] : []),
        },
      };
      // Varianten, die an Filtern scheitern bzw. Sonderfälle abdecken
      if (variant === 1) place.websiteUri = `https://www.instagram.com/${name.toLowerCase().replace(/[^a-z]/g, '')}`;
      if (variant === 2) place.websiteUri = `https://www.${name.toLowerCase().replace(/[^a-z]/g, '')}.de`;
      if (variant === 3) place.ratingCount = 12;
      if (variant === 4) place.houseNumber = undefined;
      if (variant === 5) place.rating = 4.9;
      return place;
    });
    return { places, requests: 1, costCents: 0 };
  }
}
