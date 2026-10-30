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

  it('gleichzeitige Abrufe exportieren die Zugangsdaten genau einmal', async () => {
    const { code } = await createWorkerBootstrapCode('admin:test');
    const results = await Promise.all(Array.from({ length: 5 }, () => redeemWorkerBootstrapCode(code)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
});

describe('Worker-Umgebung', () => {
  it('übernimmt INWX nur über benannte Felder, ohne Registrar oder Livebetrieb zu aktivieren', () => {
    const file = workerEnvFile({
      DATABASE_URL: 'postgres://wbm:fixture@localhost:5432/wbm',
      REGISTRAR_PROVIDER: 'mock',
      REGISTRAR_ENV: 'sandbox',
      REGISTRAR_USER: 'registrar_fixture_user',
      REGISTRAR_PASSWORD: 'registrar fixture password',
      REGISTRAR_TOTP_SECRET: 'JBSWY3DPEHPK3PXP',
      INWX_UNRELATED_SECRET: 'not_exported_fixture',
      AUTO_REGISTER_DOMAINS: 'true',
      ALLOW_REAL_LETTERS: 'true',
    });
    expect(file).toContain('REGISTRAR_PROVIDER=mock');
    expect(file).toContain('REGISTRAR_ENV=sandbox');
    expect(file).toContain('REGISTRAR_USER=registrar_fixture_user');
    expect(file).toContain("REGISTRAR_PASSWORD='registrar fixture password'");
    expect(file).toContain('REGISTRAR_TOTP_SECRET=JBSWY3DPEHPK3PXP');
    expect(file).not.toContain('INWX_UNRELATED_SECRET');
    expect(file).not.toContain('AUTO_REGISTER_DOMAINS');
    expect(file).not.toContain('ALLOW_REAL_LETTERS');
  });

  it('exportiert den vorhandenen Hosting-Alias ausschließlich unter dem kanonischen Namen', () => {
    const env = { DATABASE_URL: 'postgres://wbm:fixture@localhost:5432/wbm', NELITFY_API_TOKEN: 'alias_fixture' };
    expect(workerEnvFile(env)).toContain('NETLIFY_API_TOKEN=alias_fixture');
    expect(workerEnvFile(env)).not.toContain('NELITFY_API_TOKEN=');
    expect(workerEnvFile({ ...env, NETLIFY_API_TOKEN: 'canonical_fixture' })).toContain('NETLIFY_API_TOKEN=canonical_fixture');
    expect(workerEnvFile({ ...env, NETLIFY_API_TOKEN: 'canonical_fixture' })).not.toContain('alias_fixture');
  });
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
      NETLIFY_API_TOKEN: 'hosting_token_fixture',
      EMAIL_API_KEY: '',
      EASYNOVA_USERNAME: 'betrieb@example.org',
      OPTOUT_EMAIL: 'widerspruch@betrieb.example.org',
      STRIPE_MODE: 'live',
      STRIPE_SECRET_KEY_LIVE: 'rk_live_fixture',
      STRIPE_WEBHOOK_SECRET_LIVE: 'whsec_live_fixture',
    });
    expect(file).toContain('QUEUE_DATABASE_URL=postgresql://u.p:pw@aws-0-eu-west-1.pooler.supabase.com:5432/postgres');
    expect(file).toContain('ENCRYPTION_KEY=abc');
    expect(file).toContain(`S3_SECRET_ACCESS_KEY='a b'\\''c'`);
    expect(file).toContain('EASYNOVA_USERNAME=betrieb@example.org');
    expect(file).toContain('OPTOUT_EMAIL=widerspruch@betrieb.example.org');
    expect(file).toContain('STRIPE_MODE=live');
    expect(file).toContain('STRIPE_SECRET_KEY_LIVE=rk_live_fixture');
    expect(file).toContain('STRIPE_WEBHOOK_SECRET_LIVE=whsec_live_fixture');
    expect(file).not.toContain('NETLIFY_AUTH_TOKEN');
    expect(file).toContain('NETLIFY_API_TOKEN=hosting_token_fixture');
    expect(file).not.toContain('EMAIL_API_KEY');
    expect(() => workerEnvFile({})).toThrow(/DATABASE_URL/);
  });
});
