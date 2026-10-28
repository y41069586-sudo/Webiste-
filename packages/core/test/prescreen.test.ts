import { describe, expect, it } from 'vitest';
import { prescreen } from '../src/leads/prescreen';
import { osmSourceMeta } from '../src/providers/lead-source/overpass';
import type { RawPlace } from '../src/providers/types';

const now = new Date('2026-10-28T12:00:00Z');
const base: RawPlace = {
  source: 'osm',
  sourceId: 'node/1',
  name: 'Malerbetrieb Kowalski',
  street: 'Kampstraße',
  houseNumber: '5',
  postalCode: '44137',
  city: 'Dortmund',
};

describe('OSM-Quellsignale', () => {
  it('liest Bearbeitung, Prüfdatum, Start, E-Mail-Domain und Social-Links – ohne Adresse oder Bearbeiter', () => {
    const meta = osmSourceMeta({
      type: 'node',
      id: 1,
      timestamp: '2025-03-01T10:00:00Z',
      tags: {
        name: 'X',
        check_date: '2026-01-10',
        'survey:date': '2024-05',
        start_date: '2024-03',
        'contact:email': 'Info@Maler-Kowalski.de',
        'contact:instagram': 'malerkowalski',
      },
    });
    expect(meta).toEqual({
      lastEditedAt: '2025-03-01T10:00:00Z',
      checkedOn: '2026-01-10',
      startDate: '2024-03',
      emailDomain: 'maler-kowalski.de',
      socialLinks: 1,
    });
    expect(JSON.stringify(meta)).not.toContain('@');
  });

  it('Freemail-Adressen gelten als „keine eigene Domain“, Unsinn wird ignoriert', () => {
    expect(osmSourceMeta({ type: 'node', id: 1, tags: { email: 'kowalski@gmx.de' } }).emailDomain).toBe('freemail');
    expect(osmSourceMeta({ type: 'node', id: 1, tags: { email: 'kein-mail', start_date: 'früher' } })).toEqual({});
  });
});

describe('Automatische Vorauswahl', () => {
  it('aktiver, erreichbarer Betrieb ohne eigene Domain landet oben', () => {
    const r = prescreen(
      {
        place: {
          ...base,
          phone: '+49 231 123456',
          openingHours: { days: [{ day: 1, open: '08:00', close: '17:00' }] } as never,
          sourceMeta: { lastEditedAt: '2026-06-01T00:00:00Z', emailDomain: 'freemail', socialLinks: 1, startDate: '2025-01' },
        },
        campaignRank: 1,
        socialOnly: true,
        probe: 'none',
      },
      now,
    );
    expect(r.tier).toBe('top');
    expect(r.score).toBe(100);
  });

  it('veraltete Einträge und mögliche eigene Websites rutschen nach hinten', () => {
    const stale = prescreen(
      {
        place: { ...base, phone: '0231 1', sourceMeta: { lastEditedAt: '2015-01-01T00:00:00Z' } },
        campaignRank: 1,
        socialOnly: false,
      },
      now,
    );
    expect(stale.reasons.map((r) => r.criterion)).toContain('veraltet');
    const possible = prescreen(
      {
        place: { ...base, phone: '0231 1', sourceMeta: { emailDomain: 'kowalski.de' } },
        campaignRank: 1,
        socialOnly: false,
        probe: 'possible',
      },
      now,
    );
    expect(possible.score).toBe(0);
    expect(possible.tier).toBe('niedrig');
    // Eigene E-Mail-Domain ohne Website darunter kostet nichts
    const emailOnly = prescreen(
      { place: { ...base, sourceMeta: { emailDomain: 'kowalski.de' } }, campaignRank: 1, socialOnly: false, probe: 'none' },
      now,
    );
    expect(emailOnly.reasons.some((r) => r.criterion === 'eigene_domain')).toBe(false);
  });

  it('Zukunftsdaten zählen nicht, Wert bleibt in 0–100', () => {
    const r = prescreen(
      {
        place: { ...base, sourceMeta: { lastEditedAt: '2030-01-01T00:00:00Z', startDate: '2030' } },
        campaignRank: null,
        socialOnly: false,
      },
      now,
    );
    expect(r.score).toBe(0);
    expect(r.reasons).toEqual([]);
  });
});
