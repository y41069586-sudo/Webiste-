import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registry } from '../packages/core/src/providers/registry';
import { getEnv } from '../packages/core/src/config/env';

test('dry-run rejects live or unrecognized Stripe keys before provider initialization', () => {
  const env = { ...getEnv(), DRY_RUN: true, NODE_ENV: 'test' as const };
  for (const key of ['sk_live_unit_test_only', 'rk_live_unit_test_only', 'invalid_unit_test_only']) {
    assert.throws(() => registry.payment('stripe', { ...env, STRIPE_SECRET_KEY: key }), /ausschließlich Stripe-Testschlüssel/);
  }
  for (const key of ['sk_test_unit_test_only', 'rk_test_unit_test_only']) {
    assert.equal(registry.payment('stripe', { ...env, STRIPE_SECRET_KEY: key })?.name, 'stripe');
  }
});
