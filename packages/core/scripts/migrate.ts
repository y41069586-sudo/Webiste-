import { closeDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { seedDefaults } from '../src/services/seed';

async function main(): Promise<void> {
  await runMigrations();
  await seedDefaults();
  console.log(JSON.stringify({ level: 'info', msg: 'Migrationen und Seed ausgeführt' }));
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});
