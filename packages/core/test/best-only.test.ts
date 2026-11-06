import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { BEST_MIN_SCORE_DEFAULT, bestOnlyEnabled, isBestLead } from '../src/leads/best-only';

const cfg = (research: Record<string, unknown> = {}) => deepMerge(DEFAULT_CONFIG, { research });

describe('Sparmodus: nur die besten Betriebe (Betreiber 06.11.2026)', () => {
  it('ist ohne Eintrag an und lässt sich ausschalten', () => {
    expect(bestOnlyEnabled(cfg())).toBe(true);
    expect(bestOnlyEnabled(cfg({ bestOnly: false }))).toBe(false);
  });
  it('nimmt Social-Media-Betriebe und hohe Punktzahlen, die übrigen warten', () => {
    const c = cfg();
    expect(isBestLead(c, { leadSegment: 'social_only', prescreenScore: 5, score: 5 })).toBe(true);
    expect(isBestLead(c, { leadSegment: 'etabliert', prescreenScore: BEST_MIN_SCORE_DEFAULT, score: 0 })).toBe(true);
    expect(isBestLead(c, { leadSegment: 'etabliert', prescreenScore: 0, score: 55 })).toBe(true);
    expect(isBestLead(c, { leadSegment: 'etabliert', prescreenScore: 29, score: 20 })).toBe(false);
    expect(isBestLead(cfg({ bestMinScore: 25 }), { leadSegment: 'etabliert', prescreenScore: 29, score: 20 })).toBe(true);
    expect(isBestLead(cfg({ bestOnly: false }), { leadSegment: 'etabliert', prescreenScore: 0, score: 0 })).toBe(true);
  });
});
