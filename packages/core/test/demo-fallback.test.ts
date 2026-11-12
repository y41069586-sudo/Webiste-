import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import map from '../../../apps/web/src/lib/demo-fallback-map.json';
import {
  fallbackRedirect,
  fallbackSlugForCode,
  fallbackSlugForToken,
  isFallbackSlug,
} from '../../../apps/web/src/lib/demo-fallback';

describe('Notbetrieb bei Supabase-Sperre (13.11.2026)', () => {
  it('enthält die 58 versendeten Demos nur als gekürzte Hashwerte', () => {
    expect(Object.keys(map.tokens)).toHaveLength(58);
    expect(Object.keys(map.codes)).toHaveLength(58);
    for (const k of [...Object.keys(map.tokens), ...Object.keys(map.codes)]) expect(k).toMatch(/^[0-9a-f]{24}$/);
  });

  it('unbekannte Tokens und Kurzcodes ergeben nichts, bekannte Slugs werden erkannt', () => {
    expect(fallbackSlugForToken('gibt-es-nicht')).toBeNull();
    expect(fallbackSlugForCode('ZZZZZZ')).toBeNull();
    const slug = Object.values(map.tokens)[0]!;
    expect(isFallbackSlug(slug)).toBe(true);
    expect(isFallbackSlug('fremd')).toBe(false);
    // Kurzcodes werden wie im Normalbetrieb ohne Groß-/Kleinschreibung zugeordnet
    const code = 'abc123';
    const key = createHash('sha256').update(code).digest('hex').slice(0, 24);
    (map.codes as Record<string, string>)[key] = slug;
    expect(fallbackSlugForCode('ABC123')).toBe(slug);
    delete (map.codes as Record<string, string>)[key];
  });

  it('leitet zur gespeicherten Kopie um, ohne Treffer kommt eine Hinweisseite', async () => {
    const slug = Object.values(map.tokens)[0]!;
    const req = new Request('https://example.test/q/x', { headers: { 'user-agent': 'bot' } });
    const ok = await fallbackRedirect(req, slug, 'QR-Code');
    expect(ok.status).toBe(302);
    expect(ok.headers.get('location')).toBe(`/notfall/${slug}.html`);
    expect((await fallbackRedirect(req, null, 'QR-Code')).status).toBe(503);
  });
});
