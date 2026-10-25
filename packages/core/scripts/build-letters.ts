/**
 * Für einzeln freigegebene, bereits veröffentlichte Demos Briefe erzeugen. Keine Sammelfreigabe.
 *   pnpm --filter @wbm/core exec tsx scripts/build-letters.ts
 */
import { eq } from 'drizzle-orm';
import { closeDb, getDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { closeBrowser, generateLetter } from '../src/render';
import { stopBoss } from '../src/queue';

async function main(): Promise<void> {
  const db = getDb();
  const pending = await db.select().from(demos).where(eq(demos.status, 'published'));
  for (const d of pending) {
    const lead = await db.query.leads.findFirst({ where: eq(leads.id, d.leadId) });
    const res = await generateLetter(d.leadId, 1, { actor: 'admin:cli' });
    console.log(
      JSON.stringify({
        name: lead?.businessName,
        status: res.status,
        pages: res.pages,
        issues: res.issues,
        domain: (await db.query.leads.findFirst({ where: eq(leads.id, d.leadId) }))?.domainSuggestion,
      }),
    );
  }
  await closeBrowser();
  await stopBoss();
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
