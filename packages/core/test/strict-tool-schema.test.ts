import { describe, expect, it } from 'vitest';
import { strictToolSchema } from '../src/providers/llm/anthropic';
import { DEMO_CONTENT_SCHEMA } from '../src/demos/content';

/** Alle minItems-Werte eines Schemas (rekursiv). */
function minItems(x: unknown): number[] {
  if (Array.isArray(x)) return x.flatMap(minItems);
  if (!x || typeof x !== 'object') return [];
  return Object.entries(x as Record<string, unknown>).flatMap(([k, v]) =>
    k === 'minItems' && typeof v === 'number' ? [v] : minItems(v),
  );
}

describe('Strikte Tool-Schemas für die Anthropic-Schnittstelle (05.11.2026)', () => {
  it('Demo-Schema enthält keine von der Schnittstelle abgelehnten minItems', () => {
    expect(minItems(DEMO_CONTENT_SCHEMA).every((n) => n <= 1)).toBe(true);
  });
  it('entfernt minItems > 1 und maxItems vor dem Senden, lässt 0/1 und alles andere unverändert', () => {
    const s = {
      type: 'object',
      properties: {
        a: { type: 'array', minItems: 3, maxItems: 4, items: { type: 'string' } },
        b: { type: 'array', minItems: 1 },
      },
    };
    const out = strictToolSchema(s);
    expect(minItems(out)).toEqual([1]);
    // maxItems lehnt die Schnittstelle bei strikten Schemas ebenfalls ab (Lern-Agent, 10.11.2026)
    expect(out.properties.a).not.toHaveProperty('maxItems');
    expect(s.properties.a.maxItems).toBe(4); // Original bleibt erhalten
    expect(s.properties.a.minItems).toBe(3); // Original bleibt für die eigene Prüfung erhalten
  });
});
