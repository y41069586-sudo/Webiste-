import { describe, expect, it } from 'vitest';
import { allocate, segmentShares } from '../src/services/pipeline';
import { DEFAULT_CONFIG } from '../src/config/settings';

describe('Pipeline-Planung', () => {
  const segs = [
    'dortmund:beauty:nagelstudio',
    'dortmund:beauty:kosmetikstudio',
    'dortmund:handwerk:maler',
    'dortmund:handwerk:elektriker',
  ];

  it('Standard: 50 % Beauty / 50 % Handwerk → erste Charge 20/20', () => {
    const shares = segmentShares(DEFAULT_CONFIG, segs);
    const plan = allocate(40, shares, Object.fromEntries(segs.map((s) => [s, 100])));
    expect(plan['dortmund:beauty:nagelstudio']! + plan['dortmund:beauty:kosmetikstudio']!).toBe(20);
    expect(plan['dortmund:handwerk:maler']! + plan['dortmund:handwerk:elektriker']!).toBe(20);
  });

  it('fehlender Vorrat wird auf andere Segmente umverteilt', () => {
    const shares = segmentShares(DEFAULT_CONFIG, segs);
    const plan = allocate(40, shares, {
      'dortmund:beauty:nagelstudio': 30,
      'dortmund:beauty:kosmetikstudio': 30,
      'dortmund:handwerk:maler': 3,
      'dortmund:handwerk:elektriker': 5,
    });
    expect(Object.values(plan).reduce((a, b) => a + b, 0)).toBe(40);
    expect(plan['dortmund:handwerk:maler']).toBe(3);
  });

  it('konfigurierte Anteile werden normiert', () => {
    const cfg = { ...DEFAULT_CONFIG, budget: { ...DEFAULT_CONFIG.budget, segmentShares: { [segs[0]!]: 3, [segs[2]!]: 1 } } };
    const shares = segmentShares(cfg, segs);
    expect(shares[segs[0]!]).toBeCloseTo(0.75);
    expect(shares[segs[1]!]).toBe(0);
  });
});
