import pg from 'pg';

/** Legt die Testdatenbank neu an und führt die Migrationen aus. */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://wbm:wbm@localhost:5432/wbm_test';
  const u = new URL(url);
  const dbName = u.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();
  process.env.DATABASE_URL = url;
  const { runMigrations } = await import('../src/db/migrate');
  const { seedDefaults } = await import('../src/services/seed');
  const { closeDb } = await import('../src/db/client');
  await runMigrations();
  await seedDefaults();
  await closeDb();
}
