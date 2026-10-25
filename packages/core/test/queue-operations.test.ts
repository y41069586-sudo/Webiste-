import { afterEach, describe, expect, it, vi } from 'vitest';
import { PgBoss } from 'pg-boss';
import { assertQueueConnection, queueRuntimeConfig } from '../src/queue-config';
import { resetEnvCache } from '../src/config/env';
import { getDatabaseConnectionConfig } from '../src/db/client';

describe('Queue-Betriebsgrenzen', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });
  it('Produktions-Web startet weder Schema-Migration noch Scheduler', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'fixture-seitenwerk-safe-session-secret-123');
    vi.stubEnv('APP_NAME', 'wbm-web');
    for (const key of ['BOSS_MIGRATE', 'BOSS_SUPERVISE', 'BOSS_SCHEDULE', 'BOSS_CREATE_QUEUES']) vi.stubEnv(key, '');
    resetEnvCache();
    expect(queueRuntimeConfig()).toMatchObject({ migrate: false, supervise: false, schedule: false, create: false });
  });
  it('Supabase-Worker braucht Session/Direct; reiner Producer darf Transaction nutzen', () => {
    const u = 'postgres://fixture:fixture@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
    expect(() => assertQueueConnection(u, { migrate: false, supervise: true, schedule: true })).toThrow(/Session/);
    expect(() => assertQueueConnection(u, { migrate: false, supervise: false, schedule: false })).not.toThrow();
    expect(() =>
      assertQueueConnection(u.replace(':6543', ':5432'), { migrate: true, supervise: true, schedule: true }),
    ).not.toThrow();
    expect(getDatabaseConnectionConfig(u).ssl).toMatchObject({ rejectUnauthorized: true });
  });
  it('pg-boss erkennt fehlendes Schema ohne automatische Anlage', async () => {
    const boss = new PgBoss({
      ...getDatabaseConnectionConfig(),
      schema: 'queue_missing_test',
      migrate: false,
      supervise: false,
      schedule: false,
    });
    boss.on('error', () => undefined);
    await expect(boss.start()).rejects.toThrow();
    await boss.stop();
  });
});
