import { expect, it } from 'vitest';
import { priorityV4 } from '../src/leads/priority-v4';
import { DEFAULT_CONFIG, appConfigSchema } from '../src/config/settings';
import type { RawPlace } from '../src/providers/types';
const place: RawPlace = {
  source: 'mock',
  sourceId: 'quality',
  name: 'Testbetrieb',
  street: 'Testweg',
  houseNumber: '1',
  postalCode: '12345',
  city: 'Teststadt',
  businessStatus: 'OPERATIONAL',
  phone: '030000000',
};
const flags = { completeAddress: true, hasWebsite: false, socialOnly: true, branchWeight: 1 };
it('unknown website absence and unreviewed demos cannot earn their verification points', () => {
  const result = priorityV4(place, flags);
  expect(result.score).toBe(70);
  expect(result.category).toBe('manual_review');
  expect(result.reasons.find((r) => r.criterion === 'website')?.verified).toBe(false);
  expect(priorityV4(place, { ...flags, websiteAbsentVerified: true, demoSuitable: true }).score).toBe(100);
});
it('hard exclusions always override otherwise excellent signals', () => {
  for (const extra of [{ excluded: true }, { hasWebsite: true }]) {
    expect(priorityV4(place, { ...flags, ...extra, websiteAbsentVerified: true, demoSuitable: true }).score).toBe(0);
    expect(priorityV4(place, { ...flags, ...extra }).category).toBe('unsuitable');
  }
});
it('configuration validates ordered score boundaries', () => {
  expect(appConfigSchema.safeParse({ ...DEFAULT_CONFIG, leadScoring: { reviewMin: 80, goodMin: 60 } }).success).toBe(false);
  expect(priorityV4(place, flags, { reviewMin: 20, goodMin: 65 }).category).toBe('good_fit');
});

it('does not mistake the OSM adapter default for a verified current business status', () => {
  const result = priorityV4({ ...place, source: 'osm' }, flags);
  expect(result.reasons.find((r) => r.criterion === 'operational')?.verified).toBe(false);
  expect(result.score).toBe(60);
});
