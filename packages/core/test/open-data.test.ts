import { describe, expect, it } from 'vitest';
import {
  applyOpenData,
  matchOpenPlace,
  nameSimilarity,
  openDataSignal,
  ownWebsite,
  comparablePhone,
  type OpenPlace,
} from '../src/leads/open-data-match';
import { enrichWithOpenData } from '../src/services/open-data-check';
import { bboxesFor } from '../src/providers/lead-source/overture';
import type { RawPlace } from '../src/providers/types';

const osm = (over: Partial<RawPlace> = {}): RawPlace => ({
  source: 'osm',
  sourceId: 'node/1',
  name: 'Amling Bedachungen',
  street: 'Konrad-Adenauer-Straße',
  houseNumber: '17A',
  postalCode: '58452',
  city: 'Witten',
  location: { lat: 51.44351, lon: 7.33719 },
  ...over,
});
const open = (over: Partial<OpenPlace> = {}): OpenPlace => ({
  name: 'Amling Bedachungen',
  lat: 51.4435,
  lon: 7.33718,
  websites: ['https://www.a-m-bedachungen.de/'],
  socials: [],
  phones: ['49230259347'],
  postcode: '58452',
  street: 'Konrad-Adenauer-Straße 17A',
  confidence: 0.5,
  status: 'open',
  ...over,
});

describe('Offene Firmendaten (Overture) – Abgleich', () => {
  it('Verzeichnis- und Profilseiten zählen nicht als eigene Website, Baukasten-Seiten schon', () => {
    expect(ownWebsite(['https://www.gelbeseiten.de/gsbiz/1', 'https://instagram.com/x'])).toBeNull();
    expect(ownWebsite(['https://www.facebook.com/x', 'http://dachdecker-ebert.de'])).toBe('http://dachdecker-ebert.de');
    expect(ownWebsite(['https://mueller-maler.jimdosite.com'])).toBe('https://mueller-maler.jimdosite.com');
    expect(ownWebsite(['https://mueller.business.site'])).toBeNull();
  });

  it('Telefonnummern aus offenen Daten werden trotz uneinheitlicher Schreibweise verglichen', () => {
    expect(comparablePhone('49230259347')).toBe(comparablePhone('+49 2302 59347'));
    expect(comparablePhone('04923 0272387')).toBe(comparablePhone('02302 72387'));
    expect(comparablePhone('0231 123456')).toBe('231123456');
  });

  it('erkennt denselben Betrieb in der Nähe, nicht aber gleichnamige weit weg oder andere Namen', () => {
    expect(nameSimilarity('Dachdeckerei Müller GmbH', 'Müller Dachdeckerei')).toBe(1);
    expect(matchOpenPlace(osm(), [open()])?.matchedBy).toBe('name_near');
    expect(matchOpenPlace(osm(), [open({ lat: 51.6, lon: 7.6 })])).toBeNull();
    expect(matchOpenPlace(osm(), [open({ name: 'Bäckerei Schmidt', phones: [] })])).toBeNull();
    // gleiche Telefonnummer reicht auch bei anderem Namen (in der Nähe)
    expect(matchOpenPlace(osm({ phone: '+49 2302 59347' }), [open({ name: 'A&M Dach' })])?.matchedBy).toBe('phone');
    // ohne Lage: gleiche PLZ + Straße + Name
    expect(matchOpenPlace(osm({ location: undefined }), [open()])?.matchedBy).toBe('name_address');
  });

  it('eigene Website schließt aus, „dauerhaft geschlossen“ ebenso, nur Profile zählen als Social-Signal', () => {
    const withSite = applyOpenData(osm(), openDataSignal({ place: open(), matchedBy: 'name_near' }, '2026-10-21.0'));
    expect(withSite.websiteUri).toBe('https://www.a-m-bedachungen.de/');
    const closed = applyOpenData(
      osm(),
      openDataSignal({ place: open({ websites: [], status: 'permanently_closed' }), matchedBy: 'name_near' }, 'r'),
    );
    expect(closed.businessStatus).toBe('CLOSED_PERMANENTLY');
    expect(closed.websiteUri).toBeUndefined();
    const social = applyOpenData(
      osm(),
      openDataSignal({ place: open({ websites: ['https://instagram.com/amling'], socials: [] }), matchedBy: 'name_near' }, 'r'),
    );
    expect(social.websiteUri).toBeUndefined();
    expect(social.sourceMeta?.socialLinks).toBe(1);
    expect(social.sourceMeta?.openData?.socialOnly).toBe(true);
  });

  it('Gebiete werden je Stadt gebildet, nicht über halb Deutschland', () => {
    const boxes = bboxesFor([
      { lat: 51.51, lon: 7.46 },
      { lat: 51.53, lon: 7.48 },
      { lat: 48.14, lon: 11.58 },
    ]);
    expect(boxes).toHaveLength(2);
    expect(boxes[0]!.xmax - boxes[0]!.xmin).toBeLessThan(0.1);
  });

  it('Gesamtablauf: setzt Signale am Treffer; Fehler der Quelle stoppen nichts', async () => {
    const cands = [
      { place: osm() },
      { place: osm({ sourceId: 'node/2', name: 'Fremd GmbH', location: { lat: 51.5, lon: 7.4 } }) },
    ];
    const r = await enrichWithOpenData(cands, { release: async () => '2026-10-21.0', fetchPlaces: async () => [open()] });
    expect(r).toMatchObject({ release: '2026-10-21.0', matched: 1, websites: 1 });
    expect(cands[0]!.place.websiteUri).toContain('a-m-bedachungen');
    expect(cands[1]!.place.websiteUri).toBeUndefined();
    const broken = await enrichWithOpenData([{ place: osm() }], {
      release: async () => {
        throw new Error('offline');
      },
      fetchPlaces: async () => [],
    });
    expect(broken.error).toBe('offline');
  });
});
