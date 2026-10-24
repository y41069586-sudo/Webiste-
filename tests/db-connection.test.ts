import assert from 'node:assert/strict';
import { X509Certificate } from 'node:crypto';
import { test } from 'node:test';
import pg from '../packages/core/node_modules/pg/lib/index.js';
import { resetEnvCache } from '../packages/core/src/config/env';
import { getDatabaseConnectionConfig } from '../packages/core/src/db/client';

function connection(url: string, ca?: string) {
  const oldUrl = process.env.DATABASE_URL;
  const oldCa = process.env.DATABASE_SSL_CA;
  try {
    process.env.DATABASE_URL = url;
    if (ca === undefined) delete process.env.DATABASE_SSL_CA;
    else process.env.DATABASE_SSL_CA = ca;
    resetEnvCache();
    return getDatabaseConnectionConfig();
  } finally {
    if (oldUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = oldUrl;
    if (oldCa === undefined) delete process.env.DATABASE_SSL_CA;
    else process.env.DATABASE_SSL_CA = oldCa;
    resetEnvCache();
  }
}

test('Supabase pooler retains its CA through pg URL parsing and verifies peers', () => {
  const cfg = connection('postgresql://test:test@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=verify-full');
  const client = new pg.Client(cfg);
  const ssl = client.connectionParameters.ssl;
  assert.equal(ssl.rejectUnauthorized, true);
  const certificate = new X509Certificate(ssl.ca);
  assert.equal(
    certificate.fingerprint256,
    '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA',
  );
  assert.ok(Date.parse(certificate.validTo) > Date.now());
});

test('direct Supabase hosts also use verified TLS', () => {
  const cfg = connection('postgresql://test:test@db.abcdefghijklmnopqrst.supabase.co:5432/postgres');
  assert.equal((cfg.ssl as { rejectUnauthorized: boolean }).rejectUnauthorized, true);
});

test('custom PEM supports escaped newlines and overrides URL SSL settings', () => {
  const cfg = connection('postgresql://test:test@database.example:5432/postgres?sslmode=no-verify', 'custom\\ncertificate');
  assert.deepEqual(cfg.ssl, { ca: 'custom\ncertificate', rejectUnauthorized: true });
  assert.equal(new URL(cfg.connectionString!).searchParams.has('sslmode'), false);
});

test('other hosts preserve their original connection settings', () => {
  for (const host of ['localhost', 'aws-0-eu-west-1.pooler.supabase.com.example.org']) {
    const url = `postgresql://test:test@${host}:5432/postgres?sslmode=verify-full`;
    assert.deepEqual(connection(url), { connectionString: url });
  }
});
