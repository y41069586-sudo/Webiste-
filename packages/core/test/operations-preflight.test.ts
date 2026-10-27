import { expect, it } from 'vitest';
import { operationsPreflight } from '../src/services/operations-preflight';
it('never interprets a mock/default environment as operational readiness or leaks credentials', () => {
  const raw = {
    DRY_RUN: 'true',
    LLM_PROVIDER: 'mock',
    DATABASE_URL: 'postgres://private:private-secret@db.projecta.supabase.co/postgres',
    QUEUE_DATABASE_URL: 'postgres://private.projectb:private-secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres',
  };
  const result = operationsPreflight(raw);
  expect(result.find((c) => c.key === 'queue-target')?.status).toBe('blocked');
  expect(result.find((c) => c.key === 'anthropic')?.status).toBe('blocked');
  expect(JSON.stringify(result)).not.toContain('private-secret');
});
it('requires explicit public HTTPS addresses, deferred migrations and sandbox Stripe', () => {
  const raw = {
    APP_URL: 'https://app.example.test',
    DEMO_DOMAIN: 'localhost:3000',
    TRACK_DOMAIN: '',
    PAYMENT_PROVIDER: 'stripe',
    STRIPE_SECRET_KEY: 'rk_live_fixture',
    STRIPE_WEBHOOK_SECRET: 'fixture',
  };
  const checks = operationsPreflight(raw);
  for (const key of ['APP_URL', 'DEMO_DOMAIN', 'TRACK_DOMAIN', 'stripe-sandbox', 'migration-switches'])
    expect(checks.find((c) => c.key === key)?.status, key).toBe('blocked');
});
