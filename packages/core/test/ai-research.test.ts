import { describe, expect, it } from 'vitest';
import { researchFromAi, type AiResearchOutput } from '../src/services/ai-research';

const base: AiResearchOutput = {
  ownWebsite: { found: false, url: null },
  searched: { name_city: true, phone: true, directory_links: true, profile_links: true },
  notSuitable: { value: false, reason: '' },
  facts: [],
  summary: 'fiktiv',
};
const src = ['https://verzeichnis.example/betrieb', 'https://social.example/betrieb', 'https://www.northdata.de/x'];

describe('KI-Prüfung: nur echte, erlaubte Quellen', () => {
  it('übernimmt Fakten mit gefundener Quelle und verwirft erfundene, gesperrte oder zu lange', () => {
    const r = researchFromAi(
      {
        ...base,
        facts: [
          { kind: 'address', text: 'Anschrift im Verzeichnis bestätigt', source: src[0]! },
          { kind: 'service', text: 'Badsanierung', source: src[1]! },
          { kind: 'service', text: 'x'.repeat(41), source: src[1]! },
          { kind: 'operational', text: 'Aktiv laut erfundener Seite', source: 'https://erfunden.example' },
          { kind: 'independent', text: 'Registerauskunft', source: src[2]! },
          { kind: 'address', text: 'Anschrift im Verzeichnis bestätigt', source: src[0]! },
        ],
      },
      src,
      new Date('2026-10-29T12:00:00Z'),
    );
    expect(r?.signals.map((s) => [s.kind, s.source])).toEqual([
      ['address', src[0]],
      ['service', src[1]],
    ]);
    expect(r?.website).toMatchObject({
      result: 'not_found',
      source: src[0],
      methods: ['name_city', 'phone', 'directory_links', 'profile_links'],
    });
    expect(r?.lawfulUseConfirmed).toBe(true);
  });
  it('ohne verwertbare Quelle keine Recherche', () => {
    expect(researchFromAi(base, [])).toBeNull();
    expect(researchFromAi(base, ['https://www.northdata.de/x'])).toBeNull();
  });
  it('eigene Website wird als gefunden übernommen', () => {
    const r = researchFromAi({ ...base, ownWebsite: { found: true, url: 'https://betrieb.example' } }, src);
    expect(r?.website).toMatchObject({ result: 'found', foundUrl: 'https://betrieb.example' });
  });
});
