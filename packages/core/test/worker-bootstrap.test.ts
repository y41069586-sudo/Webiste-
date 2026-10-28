import { beforeEach, describe, expect, it } from 'vitest';
import {
  createWorkerBootstrapCode,
  redeemWorkerBootstrapCode,
  sessionPoolerUrl,
  workerEnvFile,
} from '../src/services/worker-bootstrap';
import { resetDb } from './helpers';

describe('Worker-Einrichtung per Einmal-Code', () => {
  beforeEach(resetDb);

  it('Code gilt genau einmal, Schreibweise egal', async () => {
    const now = new Date('2026-10-28T18:00:00Z');
    const { code } = await createWorkerBootstrapCode('admin:test', now);
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(await redeemWorkerBootstrapCode('falsch-falsch-falsch', now)).toBe(false);
    expect(await redeemWorkerBootstrapCode(code.toLowerCase().replace(/-/g, ' '), now)).toBe(true);
    expect(await redeemWorkerBootstrapCode(code, now)).toBe(false);
  });

  it('abgelaufene und ersetzte Codes werden abgelehnt', async () => {
    const now = new Date('2026-10-28T18:00:00Z');
    const old = await createWorkerBootstrapCode('admin:test', now);
    const fresh = await createWorkerBootstrapCode('admin:test', now);
    expect(await redeemWorkerBootstrapCode(old.code, now)).toBe(false);
    expect(await redeemWorkerBootstrapCode(fresh.code, new Date(now.getTime() + 31 * 60_000))).toBe(false);
  });
});

describe('Worker-Umgebung', () => {
  it('nutzt den Session-Pooler statt des Transaction-Poolers', () => {
    expect(sessionPoolerUrl('postgresql://u.p:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=verify-full')).toBe(
      'postgresql://u.p:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full',
    );
    expect(sessionPoolerUrl('postgres://wbm:x@localhost:5432/wbm')).toBe('postgres://wbm:x@localhost:5432/wbm');
  });

  it('übernimmt nur freigegebene Variablen, leere Werte entfallen, Sonderzeichen werden gequotet', () => {
    const file = workerEnvFile({
      DATABASE_URL: 'postgresql://u.p:pw@aws-0-eu-west-1.pooler.supabase.com:6543/postgres',
      ENCRYPTION_KEY: 'abc',
      S3_SECRET_ACCESS_KEY: "a b'c",
      NETLIFY_AUTH_TOKEN: 'geheim',
      EMAIL_API_KEY: '',
      EASYNOVA_USERNAME: 'betrieb@example.org',
    });
    expect(file).toContain('QUEUE_DATABASE_URL=postgresql://u.p:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres');
    expect(file).toContain('ENCRYPTION_KEY=abc');
    expect(file).toContain(`S3_SECRET_ACCESS_KEY='a b'\\''c'`);
    expect(file).toContain('EASYNOVA_USERNAME=betrieb@example.org');
    expect(file).not.toContain('NETLIFY_AUTH_TOKEN');
    expect(file).not.toContain('EMAIL_API_KEY');
    expect(() => workerEnvFile({})).toThrow(/DATABASE_URL/);
  });
});
