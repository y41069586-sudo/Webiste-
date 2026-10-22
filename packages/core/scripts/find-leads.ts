/** Lead-Suche direkt ausführen (ohne Queue): pnpm --filter @wbm/core exec tsx scripts/find-leads.ts */
import { closeDb } from '../src/db/client';
import { runMigrations } from '../src/db/migrate';
import { seedDefaults } from '../src/services/seed';
import { findLeads } from '../src/services/lead-finder';

async function main(): Promise<void> {
  await runMigrations();
  await seedDefaults();
  const summary = await findLeads({ actor: 'admin:cli' });
  console.log(JSON.stringify(summary, null, 2));
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});
