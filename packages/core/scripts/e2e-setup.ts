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
  if (!['localhost', '127.0.0.1', '::1'].includes(u.hostname) || !/^[a-zA-Z0-9_]*(test|e2e)[a-zA-Z0-9_]*$/.test(dbName))
    throw new Error('E2E-Reset ist nur für lokale test/e2e-Datenbanken erlaubt.');
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
  const { updateConfig } = await import('../src/config/service');
  // Legacy browser regression fixtures retain their original contract; V4 specs explicitly opt in.
  await updateConfig({ offers: { activeVersion: 'legacy' } }, 'e2e:fixture');
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
