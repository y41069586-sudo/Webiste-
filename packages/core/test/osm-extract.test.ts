import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { matchesBranch, osmiumFilterExpressions, OsmExtractLeadSource } from '../src/providers/lead-source/osm-extract';
import type { LeadSearchQuery, LeadSource } from '../src/providers/types';

const PBF = path.join(__dirname, 'fixtures', 'osm-extract.osm.pbf');
const painter = [{ key: 'craft', value: 'painter' }];
const nails = [{ key: 'shop', value: 'beauty', extra: { beauty: 'nails' } }];
const cosmetics = [{ key: 'shop', value: 'beauty', exclude: { beauty: 'nails|tanning' } }];

const query = (osmTags: LeadSearchQuery['branch']['osmTags'], agsPrefix = '05'): LeadSearchQuery =>
  ({
    text: 'x Dortmund',
    city: 'Dortmund',
    branch: { key: 'b', label: 'B', queries: ['x'], osmTags, googleTypes: [], weight: 1, active: true },
    maxPages: 1,
    agsPrefix,
  }) as LeadSearchQuery;

describe('OSM-Auszug: Filter und Branchenabgleich', () => {
  it('fasst Werte je Schlüssel zusammen und nimmt Gemeinde- und PLZ-Grenzen mit', () => {
    expect(osmiumFilterExpressions(['craft=painter', 'craft=electrician', 'shop=beauty'])).toEqual([
      'nwr/craft=electrician,painter',
      'nwr/shop=beauty',
      'r/boundary=administrative,postal_code',
    ]);
  });

  it('extra muss passen, exclude schließt aus, fehlender Tag zählt bei exclude als passend', () => {
    expect(matchesBranch({ shop: 'beauty', beauty: 'nails' }, nails)).toBe(true);
    expect(matchesBranch({ shop: 'beauty' }, nails)).toBe(false);
    expect(matchesBranch({ shop: 'beauty' }, cosmetics)).toBe(true);
    expect(matchesBranch({ shop: 'beauty', beauty: 'tanning' }, cosmetics)).toBe(false);
  });
});

let hasOsmium = true;
try {
  execFileSync('osmium', ['--version'], { stdio: 'ignore' });
} catch {
  hasOsmium = false;
}

describe.skipIf(!hasOsmium)('OSM-Auszug mit osmium (echte Verarbeitung, lokaler Download)', () => {
  let server: Server;
  let url = '';
  let downloads = 0;
  beforeAll(async () => {
    server = createServer((_req, res) => {
      downloads++;
      res.end(readFileSync(PBF));
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/nrw.osm.pbf`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it('findet Betriebe nur innerhalb der Gemeinde, ergänzt PLZ, erkennt Mehrdeutigkeit, lädt nur einmal', async () => {
    const src = new OsmExtractLeadSource({
      url,
      dir: mkdtempSync(path.join(os.tmpdir(), 'wbm-osm-test-')),
      userAgent: 'test',
      baseTags: [...painter, ...nails],
    });
    const res = await src.search(query(painter));
    expect(res.warnings).toBeUndefined();
    expect(res.places.map((p) => p.name).sort()).toEqual(['Maler im Gebäude', 'Malerbetrieb Test']);
    const test = res.places.find((p) => p.name === 'Malerbetrieb Test')!;
    expect(test).toMatchObject({ sourceId: 'node/10', postalCode: '44135', street: 'Teststraße', city: 'Dortmund' });
    expect(test.sourceMeta?.lastEditedAt).toBe('2025-05-01T10:00:00.000Z');
    expect((await src.search(query(nails))).places.map((p) => p.name)).toEqual(['Nagelstudio Test']);
    // Kosmetik ist nicht im Basis-Index (shop=beauty ist es schon) – Ausschluss greift trotzdem
    expect((await src.search(query(cosmetics))).places.map((p) => p.name)).toEqual(['Kosmetik Test']);
    expect((await src.search(query(painter, ''))).warnings?.[0]).toMatch(/mehrdeutig \(2 Gemeinden\)/);
    expect(downloads).toBe(1);
    expect((await src.refresh('node/10')).place?.name).toBe('Malerbetrieb Test');
  });

  it('ohne osmium greift die Ausweich-Quelle', async () => {
    const fallback: LeadSource = {
      kind: 'osm',
      search: async () => ({ places: [], requests: 1, costCents: 0, warnings: ['fallback'] }),
    };
    const src = new OsmExtractLeadSource({
      url,
      dir: mkdtempSync(path.join(os.tmpdir(), 'wbm-osm-test-')),
      userAgent: 'test',
      baseTags: painter,
      osmiumBin: '/nicht/vorhanden/osmium',
      fallback,
    });
    expect((await src.search(query(painter))).warnings).toEqual(['fallback']);
  });
});
