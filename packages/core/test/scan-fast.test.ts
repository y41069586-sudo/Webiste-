import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads, letters } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { activeScanTargets, demoCdnHeaders, purgeDemoCache, scanTargetSlug, secondsUntil } from '../src/services/scan-fast';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import pfoertner, { config as pfoertnerConfig } from '../../../apps/web/netlify/edge-functions/qr-pfoertner';
import { resetDb } from './helpers';

async function seed(opts: { letterStatus?: 'sent' | 'cancelled'; expiresInDays?: number; suppressed?: boolean } = {}) {
  const [lead] = await getDb()
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Schnell GmbH',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Weg',
      houseNumber: '1',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      shortCode: 'k7m2xq',
      status: (opts.suppressed ? 'suppressed' : 'letter_sent') as never,
    })
    .returning();
  const [demo] = await getDb()
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), opts.expiresInDays ?? 30),
    })
    .returning();
  await getDb()
    .insert(letters)
    .values({ leadId: lead!.id, demoId: demo!.id, sequence: 1, status: opts.letterStatus ?? 'sent', sentAt: new Date() });
  return { lead: lead!, demo: demo! };
}

describe('Schnelle QR-Strecke (17.11.2026)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NETLIFY_PURGE_API_TOKEN;
    delete process.env.SITE_ID;
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('Zwischenspeicher-Kopfzeilen: frisch höchstens einen Tag, danach bis zum Ablauf sofort, Tag zum Löschen', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    const h = demoCdnHeaders('abcDEF1234567890abcdEF12', addDays(now, 30), { now, vary: 'query=start' });
    expect(h['netlify-cdn-cache-control']).toBe(`public, durable, s-maxage=86400, stale-while-revalidate=${29 * 86400}`);
    expect(h['netlify-cache-tag']).toBe('demo-abcDEF1234567890abcdEF12');
    expect(h['netlify-cache-id']).toBe('demo-abcDEF1234567890abcdEF12');
    expect(h['netlify-vary']).toBe('query=start');
    // kurz vor Ablauf: nur noch bis zum Ablauf, nach Ablauf gar nicht
    expect(demoCdnHeaders('x'.repeat(24), new Date(now.getTime() + 3600_000), { now })['netlify-cdn-cache-control']).toBe(
      'public, durable, s-maxage=3600',
    );
    expect(demoCdnHeaders('x'.repeat(24), addDays(now, -1), { now })).toEqual({});
    expect(secondsUntil(addDays(now, 90), now)).toBe(35 * 86400);
  });

  it('Ziel eines Tokens nach denselben Regeln wie der Scan: abgelaufen oder gesperrt → kein Ziel', async () => {
    const ok = await seed();
    expect(await scanTargetSlug(ok.lead.trackToken)).toEqual({ slug: ok.demo.slug, expiresAt: ok.demo.expiresAt });
    expect(await scanTargetSlug('zu-kurz')).toBeNull();
    await resetDb();
    const expired = await seed({ expiresInDays: -1 });
    expect(await scanTargetSlug(expired.lead.trackToken)).toBeNull();
    await resetDb();
    const blocked = await seed({ suppressed: true });
    expect(await scanTargetSlug(blocked.lead.trackToken)).toBeNull();
  });

  it('Vorab-Aufruf umfasst nur Briefe unterwegs mit Demo online', async () => {
    const active = await seed();
    const rows = await activeScanTargets();
    expect(rows).toEqual([{ token: active.lead.trackToken, code: 'k7m2xq', slug: active.demo.slug }]);
    await resetDb();
    await seed({ letterStatus: 'cancelled' });
    expect(await activeScanTargets()).toEqual([]);
  });

  it('Löschen im Zwischenspeicher nur mit Netlify-Zugang, dann genau der Tag der Demo', async () => {
    const f = vi.fn(async () => new Response(null, { status: 202 }));
    expect(await purgeDemoCache('a'.repeat(24), f as unknown as typeof fetch)).toBe(false);
    expect(f).not.toHaveBeenCalled();
    process.env.NETLIFY_PURGE_API_TOKEN = 'tok';
    process.env.SITE_ID = 'site';
    expect(await purgeDemoCache('a'.repeat(24), f as unknown as typeof fetch)).toBe(true);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ site_id: 'site', cache_tags: [`demo-${'a'.repeat(24)}`] });
  });
});

describe('QR-Pförtner (Edge Function)', () => {
  const slug = 'S'.repeat(24);
  const token = 'T'.repeat(24);
  const phone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1';

  function run(path: string, ua: string, mapping: () => Response) {
    const calls: string[] = [];
    const later: Promise<unknown>[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const u = String(input);
        calls.push(`${u}|${new Headers(init?.headers).get('x-sw-zaehlen') ?? ''}`);
        if (u.includes('/qz/')) return mapping();
        return new Response(null, { status: 302, headers: { location: '/d/x' } });
      }),
    );
    const req = new Request(`https://seitenwerkworld.netlify.app${path}`, { headers: { 'user-agent': ua } });
    return pfoertner(req, { waitUntil: (p) => later.push(p) }).then(async (res) => {
      await Promise.all(later);
      return { res, calls };
    });
  }

  it('leitet sofort zur Demo weiter und zählt den Scan im Hintergrund über die bisherige Route', async () => {
    const { res, calls } = await run(`/q/${token}`, phone, () => Response.json({ slug }));
    expect(res?.status).toBe(302);
    expect(res?.headers.get('location')).toBe(`/d/${slug}?start=1`);
    expect(calls).toEqual([
      `https://seitenwerkworld.netlify.app/qz/t/${token}|`,
      `https://seitenwerkworld.netlify.app/q/${token}|1`,
    ]);
  });

  it('Kurz-URL: Großbuchstaben erlaubt, Ziel-Abfrage klein', async () => {
    const { res, calls } = await run('/K7M2XQ', phone, () => Response.json({ slug }));
    expect(res?.status).toBe(302);
    expect(calls[0]).toBe('https://seitenwerkworld.netlify.app/qz/k/k7m2xq|');
  });

  it('Bots, unbekannte Ziele und der Zähl-Aufruf selbst gehen unverändert an die bisherige Route', async () => {
    expect((await run(`/q/${token}`, 'curl/8', () => Response.json({ slug }))).res).toBeUndefined();
    expect((await run(`/q/${token}`, phone, () => Response.json({ slug: null }, { status: 404 }))).res).toBeUndefined();
    expect((await run('/agb', phone, () => Response.json({ slug }))).res).toBeUndefined();
    const counting = new Request(`https://x.test/q/${token}`, { headers: { 'user-agent': phone, 'x-sw-zaehlen': '1' } });
    expect(await pfoertner(counting, { waitUntil: () => undefined })).toBeUndefined();
    expect(pfoertnerConfig.onError).toBe('bypass');
  });
});
