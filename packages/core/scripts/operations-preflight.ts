import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { operationsPreflight } from '../src/services/operations-preflight';
import { getDatabaseConnectionConfig } from '../src/db/client';
const report: Record<string, unknown> = {
  mode: 'read-only',
  providerCalls: false,
  productionRelease: false,
  environment: operationsPreflight(process.env),
  database: {
    status: 'not-checked',
    next: 'Optional --database: ausschließlich lesender Abgleich der explizit konfigurierten Datenbank.',
  },
};
if (process.argv.includes('--database')) {
  let client: pg.Client | undefined;
  try {
    if (!process.env.DATABASE_URL) throw Error('Explizites DB-Ziel fehlt');
    client = new pg.Client({
      ...getDatabaseConnectionConfig(process.env.DATABASE_URL),
      connectionTimeoutMillis: 5000,
      statement_timeout: 5000,
    });
    await client.connect();
    await client.query('BEGIN READ ONLY');
    const r = await client.query(`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS journal,
      to_regclass('pgboss.job') IS NOT NULL AS queue, to_regclass('public.settings') IS NOT NULL AS settings`);
    const structure = r.rows[0];
    const journal = JSON.parse(await readFile(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8'));
    const applied = structure.journal
      ? (await client.query('SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at')).rows
      : [];
    const expected = await Promise.all(
      journal.entries.map(async (e: { tag: string; when: number }) => ({
        tag: e.tag,
        when: e.when,
        hash: createHash('sha256')
          .update(await readFile(new URL(`../drizzle/${e.tag}.sql`, import.meta.url), 'utf8'))
          .digest('hex'),
      })),
    );
    const historyMatches = applied.every(
      (row, i) => expected[i]?.hash === row.hash && expected[i]?.when === Number(row.created_at),
    );
    const backup = structure.settings
      ? ((
          await client.query(
            "SELECT value->>'status' AS status, value->>'at' AS at FROM public.settings WHERE key='backup_status'",
          )
        ).rows[0] ?? null)
      : null;
    const queue = structure.queue
      ? (
          await client.query(
            "SELECT count(*) FILTER (WHERE state='failed')::int AS failed, max(completed_on) FILTER (WHERE name='pipeline-tick' AND state='completed') AS last_tick FROM pgboss.job",
          )
        ).rows[0]
      : null;
    report.database = {
      status: 'read',
      queueSchema: structure.queue,
      migrationCount: applied.length,
      expectedMigrationCount: expected.length,
      migrationHistoryVerified: historyMatches && applied.length === expected.length,
      pendingMigrations: historyMatches ? expected.slice(applied.length).map((e) => e.tag) : null,
      note: 'Nur lesender Hash-/Reihenfolgeabgleich. Keine Migration, Rollenänderung, Sicherung oder Betriebsfreigabe ausgeführt.',
      backup,
      queue,
    };
    await client.query('ROLLBACK');
  } catch {
    report.database = {
      status: 'blocked',
      next: 'DB-Ziel, TLS, Leseberechtigung und fehlende Schemas privat prüfen. Keine Änderungen ausgeführt.',
    };
  } finally {
    await client?.end();
  }
}
console.log(JSON.stringify(report, null, 2));
