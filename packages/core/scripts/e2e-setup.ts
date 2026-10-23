/**
 * Bereitet die E2E-Datenbank vor: neu anlegen, migrieren, Seed, Admin mit bekanntem
 * Passwort. Schreibt das TOTP-Secret nach E2E_STATE_FILE.
 */
import { writeFileSync } from 'node:fs';
import pg from 'pg';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL!;
  const u = new URL(url);
  const dbName = u.pathname.slice(1);
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const c = new pg.Client({ connectionString: adminUrl.toString() });
  await c.connect();
  await c.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await c.query(`CREATE DATABASE "${dbName}"`);
  await c.end();

  const { runMigrations } = await import('../src/db/migrate');
  const { seedDefaults } = await import('../src/services/seed');
  const { createAdmin } = await import('../src/auth/admin');
  const { closeDb } = await import('../src/db/client');
  await runMigrations();
  await seedDefaults();
  const { secret } = await createAdmin('e2e@example.com', 'e2e-passwort-sehr-sicher');
  writeFileSync(
    process.env.E2E_STATE_FILE!,
    JSON.stringify({ email: 'e2e@example.com', password: 'e2e-passwort-sehr-sicher', secret }),
  );
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
