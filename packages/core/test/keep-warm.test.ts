import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { KEEP_WARM_TOKEN, keepWarmUrl, pingKeepWarm } from '../src/services/keep-warm';

const original = process.env.TRACK_DOMAIN;
afterEach(() => {
  process.env.TRACK_DOMAIN = original;
  resetEnvCache();
});

describe('Warmhalten der QR-Strecke', () => {
  it('nutzt dieselbe Strecke wie der Brief, nur mit gültig geformtem, aber unbekanntem Token', () => {
    expect(KEEP_WARM_TOKEN).toMatch(/^[A-Za-z0-9]{16,64}$/);
    process.env.TRACK_DOMAIN = 'seitenwerk.world';
    resetEnvCache();
    expect(keepWarmUrl()).toBe(`https://seitenwerk.world/q/${KEEP_WARM_TOKEN}`);
  });

  it('weckt lokal nichts auf', async () => {
    process.env.TRACK_DOMAIN = 'localhost:3000';
    resetEnvCache();
    expect(keepWarmUrl()).toBeNull();
    const f = vi.fn();
    expect(await pingKeepWarm(f as unknown as typeof fetch)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('ruft mit Bot-Kennung auf und meldet den Status', async () => {
    process.env.TRACK_DOMAIN = 'seitenwerk.world';
    resetEnvCache();
    const f = vi.fn(async () => new Response('nicht gefunden', { status: 404 }));
    const r = await pingKeepWarm(f as unknown as typeof fetch);
    expect(r?.status).toBe(404);
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(String((init.headers as Record<string, string>)['user-agent'])).toMatch(/bot/);
  });
});
