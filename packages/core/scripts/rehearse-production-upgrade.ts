/**
 * Generalprobe des Produktions-Upgrades (Supabase) auf einer LOKALEN Wegwerf-Datenbank – keine Produktionsverbindung.
 *
 * Baut den gelesenen Produktionsstand nach (die ersten N Drizzle-Migrationen mit Original-Hashes, RLS, Supabase-
 * Browserrollen, Backend-Rolle `seitenwerk_admin_backend` mit Richtlinie `admin_backend_access` je Tabelle) und prüft:
 *   1. fehlende Migrationen über den echten Drizzle-Migrator (Wartungsrolle),
 *   2. Lesen/Auffrischen der Funnel-Sichten und Care-Tabellen als Backend-Rolle über den App-Code,
 *   3. keine Rechte für anon/authenticated,
 *   4. pg-boss-SQL (queue:prepare offline) + infra/queue-permissions.sql + Queue-Anlage mit Wartungsrolle,
 *   5. Senden/Abholen/Abschließen, Zeitplan und Wartung als Backend-Rolle.
 *
 * Aufruf (lokaler Superuser, Zieldatenbank wird gelöscht!):
 *   REHEARSAL_DATABASE_URL=postgres://wbm:wbm@localhost:5432/wbm_rehearsal_test \
 *   REHEARSAL_APPLIED=11 pnpm --filter @wbm/core exec tsx scripts/rehearse-production-upgrade.ts
 * Grenzen: lokales PostgreSQL (ggf. ≠ 17), keine Supabase-Erweiterungen/Pooler; ersetzt kein Backup/Restore.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { PgBoss, getConstructionPlans } from 'pg-boss';

const url = process.env.REHEARSAL_DATABASE_URL ?? '';
const applied = Number(process.env.REHEARSAL_APPLIED ?? 11);
const target = new URL(url || 'postgres://invalid/x');
const dbName = target.pathname.slice(1);
if (!['localhost', '127.0.0.1', '::1'].includes(target.hostname) || !/^[a-zA-Z0-9_]*(test|rehearsal)[a-zA-Z0-9_]*$/.test(dbName))
  throw new Error('Nur gegen eine lokale *_test-/rehearsal-Datenbank (wird gelöscht).');
const backendPassword = `rehearsal-${createHash('sha256').update(url).digest('hex').slice(0, 12)}`;
const backendUrl = new URL(url);
backendUrl.username = 'seitenwerk_admin_backend';
backendUrl.password = backendPassword;

const root = path.resolve(import.meta.dirname, '..');
const journal = JSON.parse(readFileSync(path.join(root, 'drizzle/meta/_journal.json'), 'utf8')) as {
  entries: { tag: string; when: number }[];
};
const results: Record<string, unknown> = {};

async function run(connection: string, statements: string) {
  const c = new pg.Client({ connectionString: connection });
  await c.connect();
  try {
    return await c.query(statements);
  } finally {
    await c.end();
  }
}

async function attempt(connection: string, statement: string): Promise<string> {
  try {
    await run(connection, statement);
    return 'ok';
  } catch (err) {
    return `denied: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// 0. Zieldatenbank und Rollen (Rollen sind clusterweit; nur anlegen, wenn sie fehlen)
const admin = new URL(url);
admin.pathname = '/postgres';
await run(admin.toString(), `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
await run(admin.toString(), `CREATE DATABASE "${dbName}"`);
await run(
  admin.toString(),
  `DO $$BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='seitenwerk_admin_backend') THEN CREATE ROLE seitenwerk_admin_backend LOGIN; END IF;
  END$$; ALTER ROLE seitenwerk_admin_backend PASSWORD '${backendPassword}'`,
);

// 1. Produktionsstand: die ersten N Migrationen mit Original-Hashes, danach Supabase-/Backend-Rechte wie gelesen
const parts = [
  'CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);',
];
for (const e of journal.entries.slice(0, applied)) {
  const sql = readFileSync(path.join(root, `drizzle/${e.tag}.sql`), 'utf8');
  parts.push(sql.replaceAll('--> statement-breakpoint', ''));
  parts.push(
    `INSERT INTO drizzle.__drizzle_migrations(hash, created_at) VALUES ('${createHash('sha256').update(sql).digest('hex')}', ${e.when});`,
  );
}
parts.push(`
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format('CREATE POLICY admin_backend_access ON public.%I FOR ALL TO seitenwerk_admin_backend USING (true) WITH CHECK (true)', t.tablename);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
GRANT USAGE ON SCHEMA public TO seitenwerk_admin_backend;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO seitenwerk_admin_backend;
GRANT USAGE ON SEQUENCE public.audit_log_id_seq TO seitenwerk_admin_backend;`);
await run(url, parts.join('\n'));
results.before = {
  migrations: applied,
  backendRefreshFunnel: await attempt(backendUrl.toString(), 'REFRESH MATERIALIZED VIEW CONCURRENTLY letter_outcomes'),
};

// 2. Fehlende Migrationen über den echten Migrator (Wartungsrolle)
process.env.DATABASE_URL = url;
const { runMigrations } = await import('../src/db/migrate');
const { closeDb } = await import('../src/db/client');
await runMigrations();
await closeDb();
const count = await run(url, 'SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations');
results.migrations = { after: count.rows[0].n, journal: journal.entries.length };

// 3. Backend-Rolle über den App-Code; Browserrollen ohne Zugriff
// getEnv() cacht DATABASE_URL – ohne Reset liefe dieser Teil unbemerkt als Wartungsrolle weiter
process.env.DATABASE_URL = backendUrl.toString();
const { resetEnvCache } = await import('../src/config/env');
resetEnvCache();
const { refreshFunnel } = await import('../src/services/funnel');
const { getDb } = await import('../src/db/client');
const { sql } = await import('drizzle-orm');
let refresh = 'ok';
try {
  const who = await getDb().execute<{ u: string }>(sql`SELECT current_user AS u`);
  if (who.rows[0]?.u !== 'seitenwerk_admin_backend') throw new Error(`läuft als ${who.rows[0]?.u}, nicht als Backend-Rolle`);
  await refreshFunnel(getDb());
} catch (err) {
  refresh = `failed: ${err instanceof Error ? err.message : String(err)}`;
}
await closeDb();
results.backend = {
  refreshFunnel: refresh,
  readLetterOutcomes: await attempt(backendUrl.toString(), 'SELECT count(*) FROM letter_outcomes'),
  readFunnelByArm: await attempt(backendUrl.toString(), 'SELECT count(*) FROM funnel_by_arm'),
  readCareChecks: await attempt(backendUrl.toString(), 'SELECT count(*) FROM care_checks'),
  readTariffChanges: await attempt(backendUrl.toString(), 'SELECT count(*) FROM tariff_changes'),
};
results.anon = {
  readLetterOutcomes: await attempt(url, 'SET ROLE anon; SELECT count(*) FROM letter_outcomes'),
  readOrders: await attempt(url, 'SET ROLE anon; SELECT count(*) FROM orders'),
  refreshFunction: await attempt(url, 'SET ROLE anon; SELECT seitenwerk_ops.refresh_funnel_views()'),
};

// 4. pg-boss: geprüftes Offline-SQL, Queue-Anlage mit Wartungsrolle, danach Rechte-SQL
await run(url, getConstructionPlans('pgboss'));
const maintenance = new PgBoss({
  connectionString: url,
  schema: 'pgboss',
  migrate: true,
  supervise: false,
  schedule: false,
  max: 1,
});
await maintenance.start();
const { createQueues } = await import('../src/queue');
await createQueues(maintenance);
await maintenance.stop({ graceful: true });
await run(url, readFileSync(path.join(root, '../../infra/queue-permissions.sql'), 'utf8'));

// 5. Laufzeit als Backend-Rolle ohne Migration: Job-Zyklus, Zeitplan, Wartung
const errors: string[] = [];
const boss = new PgBoss({
  connectionString: backendUrl.toString(),
  schema: 'pgboss',
  migrate: false,
  supervise: true,
  schedule: true,
  max: 2,
});
boss.on('error', (e) => errors.push(e.message));
await boss.start();
const queues = await boss.getQueues();
const name = queues[0]!.name;
const id = await boss.send(name, { rehearsal: true });
const [job] = await boss.fetch(name);
await boss.complete(name, job!.id);
await boss.schedule(name, '*/5 * * * *', { rehearsal: true });
await new Promise((r) => setTimeout(r, 2000));
const schedules = (await boss.getSchedules()).length;
await boss.unschedule(name);
const state = (await boss.getJobById(name, job!.id))?.state;
await boss.stop({ graceful: true });
results.queue = {
  schemaVersion: (await run(url, 'SELECT version FROM pgboss.version')).rows[0].version,
  queues: queues.length,
  jobCycle: id && job?.id === id ? state : 'failed',
  schedules,
  errors,
};

const ok =
  results.migrations &&
  (results.migrations as { after: number; journal: number }).after === journal.entries.length &&
  (results.backend as Record<string, string>).refreshFunnel === 'ok' &&
  Object.values(results.backend as Record<string, string>).every((v) => v === 'ok') &&
  Object.values(results.anon as Record<string, string>).every((v) => v.startsWith('denied')) &&
  (results.queue as { jobCycle: string; errors: string[] }).jobCycle === 'completed' &&
  (results.queue as { errors: string[] }).errors.length === 0;
console.log(JSON.stringify({ ok, ...results }, null, 2));
process.exit(ok ? 0 : 1);
