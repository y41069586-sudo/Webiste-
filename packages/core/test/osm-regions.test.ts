import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { OSM_REGIONS, regionOfCity } from '../src/providers/lead-source/regions';

describe('Karten je Bundesland', () => {
  it('jede Zielstadt gehört zu genau einem Bundesland', () => {
    for (const city of DEFAULT_CONFIG.targeting.cities) {
      const hits = OSM_REGIONS.filter((r) => r.cities.includes(city));
      expect(hits, city).toHaveLength(1);
    }
  });
  it('keine Stadt steht doppelt in den Listen', () => {
    const all = OSM_REGIONS.flatMap((r) => r.cities);
    expect(new Set(all).size).toBe(all.length);
  });
  it('unbekannte Stadt hat kein Bundesland', () => {
    expect(regionOfCity('Gotham')).toBeNull();
    expect(regionOfCity('Köln')?.key).toBe('nordrhein-westfalen');
  });
});
