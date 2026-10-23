import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { buildOverpassQuery, osmElementToPlace } from '../src/providers/lead-source/overpass';
import { googlePlaceToRaw } from '../src/providers/lead-source/google-places';

describe('Overpass (OSM)', () => {
  it('baut eine Abfrage pro Branche mit Stadtgebiet', () => {
    const q = buildOverpassQuery('Dortmund', DEFAULT_CONFIG.targeting.branches[0]!.osmTags);
    expect(q).toContain('area["name"="Dortmund"]["boundary"="administrative"]');
    expect(q).toContain('nwr["shop"="beauty"]["beauty"="nails"](area.a);');
    expect(q).toContain('out center tags;');
  });

  it('wandelt Elemente in Rohdaten um (Website, Social, Öffnungszeiten, Telefon)', () => {
    const fx = JSON.parse(readFileSync(new URL('./fixtures/overpass-dortmund.json', import.meta.url), 'utf8'));
    const places = fx.elements.map((e: never) => osmElementToPlace(e, 'Dortmund')).filter(Boolean);
    expect(places).toHaveLength(4); // Element ohne Namen wird verworfen
    const p0 = places[0];
    expect(p0.sourceId).toBe('node/1001');
    expect(p0.phone).toBe('0231 9876543');
    expect(p0.openingHours.days).toHaveLength(6);
    expect(places[1].websiteUri).toBe('https://nails-online.example');
    expect(places[2].websiteUri).toBe('https://www.instagram.com/maler_beispiel');
    expect(places[2].city).toBe('Dortmund');
    expect(places[3].houseNumber).toBeUndefined();
  });
});

describe('Google Places (New)', () => {
  it('liest addressComponents und Öffnungszeiten', () => {
    const raw = googlePlaceToRaw({
      id: 'ChIJ123',
      displayName: { text: 'Malerbetrieb Test' },
      addressComponents: [
        { longText: '5', types: ['street_number'] },
        { longText: 'Hauptstraße', types: ['route'] },
        { longText: 'Dortmund', types: ['locality', 'political'] },
        { longText: '44137', types: ['postal_code'] },
        { longText: 'Deutschland', shortText: 'DE', types: ['country', 'political'] },
      ],
      nationalPhoneNumber: '0231 555555',
      rating: 4.7,
      userRatingCount: 88,
      businessStatus: 'OPERATIONAL',
      regularOpeningHours: {
        periods: [
          { open: { day: 1, hour: 8, minute: 0 }, close: { day: 1, hour: 17, minute: 0 } },
          { open: { day: 2, hour: 8, minute: 0 }, close: { day: 2, hour: 17, minute: 0 } },
        ],
      },
    });
    expect(raw).toMatchObject({
      street: 'Hauptstraße',
      houseNumber: '5',
      postalCode: '44137',
      city: 'Dortmund',
      country: 'DE',
      rating: 4.7,
    });
    expect(raw.openingHours?.weekdayText?.[0]).toBe('Montag – Dienstag: 08:00 – 17:00 Uhr');
  });
});

describe('Overpass-Ausschlussfilter', () => {
  it('Kosmetik schließt Nagel- und Sonnenstudios aus', () => {
    const kosmetik = DEFAULT_CONFIG.targeting.branches.find((b) => b.key === 'kosmetikstudio')!;
    const q = buildOverpassQuery('Dortmund', kosmetik.osmTags);
    expect(q).toContain('["beauty"!~"^(nails|tanning|hair|hair_removal|waxing|massage|tattoo|piercing|lashes|brows|spa)$"]');
  });
});

describe('Adress-Anreicherung', () => {
  it('übernimmt Gebäudeadresse und PLZ-Gebiet, überschreibt keine abweichende Straße', async () => {
    const { parseEnrichment, applyEnrichment, buildEnrichmentQuery } = await import('../src/providers/lead-source/overpass');
    expect(
      buildEnrichmentQuery([
        { type: 'node', id: 1 },
        { type: 'way', id: 2 },
      ]),
    ).toContain('foreach.p->.n');
    const els = [
      { type: 'node', id: 1 },
      { type: 'area', id: 3600001, tags: { boundary: 'postal_code', postal_code: '44137' } },
      { type: 'way', id: 9, tags: { building: 'yes', 'addr:street': 'Kampstraße', 'addr:housenumber': '5' } },
      { type: 'node', id: 2 },
      { type: 'area', id: 3600002, tags: { boundary: 'postal_code', postal_code: '44139' } },
    ] as never[];
    const m = parseEnrichment(els, new Set(['node/1', 'node/2']));
    const a = applyEnrichment({ source: 'osm', sourceId: 'node/1', name: 'A' }, m.get('node/1'));
    expect(a).toMatchObject({ street: 'Kampstraße', houseNumber: '5', postalCode: '44137' });
    const b = applyEnrichment(
      { source: 'osm', sourceId: 'node/2', name: 'B', street: 'Hohe Straße', houseNumber: '1' },
      m.get('node/2'),
    );
    expect(b).toMatchObject({ street: 'Hohe Straße', houseNumber: '1', postalCode: '44139' });
  });
});
