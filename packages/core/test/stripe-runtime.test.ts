import { describe, expect, it } from 'vitest';
import { getEnv } from '../src/config/env';
import { stripeRuntime } from '../src/config/stripe-runtime';
import { stripeV4Price } from '../src/config/stripe-v4-prices';
import live from '../src/config/stripe-v4-live.json';
import sandbox from '../src/config/stripe-v4-sandbox.json';
import { registry } from '../src/providers/registry';

const fixture = () => ({
  ...getEnv(),
  STRIPE_MODE: 'test' as const,
  STRIPE_SECRET_KEY: 'rk_test_fixture',
  STRIPE_WEBHOOK_SECRET: 'whsec_test_fixture',
  STRIPE_SECRET_KEY_LIVE: 'rk_live_fixture',
  STRIPE_WEBHOOK_SECRET_LIVE: 'whsec_live_fixture',
});

describe('Expliziter Stripe-Umgebungswechsel', () => {
  it('vorhandene Live-Secrets ändern den Testmodus nicht', () => {
    expect(stripeRuntime(fixture())).toEqual({
      secretKey: 'rk_test_fixture',
      webhookSecret: 'whsec_test_fixture',
      allowLive: false,
    });
  });

  it('Live verwendet nur das Live-Paar, nicht den weiterhin hinterlegten Sandbox-Key', () => {
    const env = { ...fixture(), DRY_RUN: false, STRIPE_MODE: 'live' as const };
    expect(stripeRuntime(env)).toEqual({
      secretKey: 'rk_live_fixture',
      webhookSecret: 'whsec_live_fixture',
      allowLive: true,
    });
    expect(registry.payment('stripe', env)?.testMode).toBe(false);
    expect(() => stripeRuntime({ ...env, STRIPE_SECRET_KEY_LIVE: undefined })).toThrow(/STRIPE_SECRET_KEY_LIVE/);
    expect(() => stripeRuntime({ ...env, STRIPE_WEBHOOK_SECRET_LIVE: undefined })).toThrow(/STRIPE_WEBHOOK_SECRET_LIVE/);
  });

  it('Dry-Run und falsch zugeordnete Schlüssel sperren auch bei gewähltem Live-Modus', () => {
    expect(() => stripeRuntime({ ...fixture(), STRIPE_MODE: 'live', DRY_RUN: true })).toThrow(/DRY_RUN/);
    expect(() => stripeRuntime({ ...fixture(), STRIPE_SECRET_KEY: 'rk_live_fixture', DRY_RUN: false })).toThrow(/Testschlüssel/);
    expect(() =>
      stripeRuntime({ ...fixture(), STRIPE_MODE: 'live', DRY_RUN: false, STRIPE_SECRET_KEY_LIVE: 'rk_test_fixture' }),
    ).toThrow(/Live-Schlüssel/);
  });

  it.each(['setup', 'basis', 'care_plus'] as const)('%s: Betrag, Währung und Katalog bleiben getrennt', (component) => {
    const l = live.prices.find((p) => p.component === component)!;
    const t = sandbox.prices.find((p) => p.component === component)!;
    expect(stripeV4Price(component, true, t.amountCents, 'eur')).toBe(t.priceId);
    expect(stripeV4Price(component, false, l.amountCents, 'eur', true)).toBe(l.priceId);
    expect(l.priceId).not.toBe(t.priceId);
    expect(() => stripeV4Price(component, false, l.amountCents, 'eur')).toThrow(/Sandbox/);
    expect(() => stripeV4Price(component, false, l.amountCents + 1900, 'eur', true)).toThrow(/Preis/);
    expect(() => stripeV4Price(component, false, l.amountCents, 'usd', true)).toThrow(/Preis/);
  });
});
