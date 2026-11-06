import { describe, expect, it } from 'vitest';
import { locationPurpose, locationText, adaptLocationHeading, stockPhotos } from '../src/index';
import type { BusinessFacts } from '../src/types';
const base: BusinessFacts = {
  name: 'Fiktiv',
  group: 'handwerk',
  branchLabel: 'Elektroinstallation',
  city: 'Teststadt',
  street: 'Testweg',
  houseNumber: '1',
  postalCode: '12345',
  phone: null,
  openingLines: [],
};
describe('Location purpose and relevant photo diversity', () => {
  it('uses a draft territory only for customer-site trades, and actual directions for studios and restaurants', () => {
    expect(locationPurpose(base)).toBe('customer-site');
    expect(locationText(base, true)).toContain('noch nicht bestätigt');
    for (const [group, branchLabel] of [
      ['beauty', 'Kosmetikstudio'],
      ['gastronomie', 'Restaurant'],
      ['einzelhandel', 'Blumenladen'],
      ['kurse', 'Yoga'],
    ] as const) {
      const facts = { ...base, group, branchLabel };
      expect(locationPurpose(facts)).toBe('directions');
      expect(locationText(facts, true)).toContain('Testweg 1');
      expect(locationText(facts, true)).not.toMatch(/Umgebung|Einsatzgebiet/);
      const html = adaptLocationHeading(
        '<section data-ad-section="area"><h2>Einsatzgebiet vorab abklären</h2><p>{{service_area}}</p></section>',
        facts,
      );
      expect(html).toContain('Standort und Anfahrt');
      expect(html).not.toContain('Einsatzgebiet');
    }
  });
  it('varies lead photos within the same trade, remains deterministic and deprioritizes recent licensed motifs', () => {
    const first = stockPhotos('handwerk', 0, 'Elektroinstallation');
    const choices = new Set(
      Array.from({ length: 20 }, (_, seed) => stockPhotos('handwerk', seed, 'Elektroinstallation')[0]?.file),
    );
    expect(first.length).toBeGreaterThan(1);
    expect(choices.size).toBeGreaterThan(1);
    expect(stockPhotos('handwerk', 0, 'Elektroinstallation')).toEqual(first);
    expect(stockPhotos('handwerk', 0, 'Elektroinstallation', { avoidFiles: [first[0]!.file] })[0]!.file).not.toBe(first[0]!.file);
    for (const p of first) expect(p.keywords?.some((k) => 'elektroinstallation'.includes(k))).toBe(true);
  });
});
