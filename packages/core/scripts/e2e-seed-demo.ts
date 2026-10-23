/** E2E: veröffentlichte Demo anlegen und Slug/Token als JSON ausgeben. */
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { findLeads } from '../src/services/lead-finder';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { buildDemo } from '../src/demos/build';
import { stopBoss } from '../src/queue';
import { randomToken } from '../src/util/crypto';

async function main(): Promise<void> {
  const db = getDb();
  let lead = (await db.select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0];
  if (!lead) {
    await findLeads({ actor: 'e2e' });
    lead = (
      await db
        .select()
        .from(leads)
        .where(eq(leads.status, 'qualified'))
        .orderBy(sql`random()`)
        .limit(1)
    )[0];
  }
  if (!lead) {
    // Mock-Quelle erschöpft (viele E2E-Läufe): fiktiven Betrieb direkt anlegen
    const suffix = randomToken(5);
    [lead] = await db
      .insert(leads)
      .values({
        source: 'mock',
        sourceId: `e2e-${suffix}`,
        businessName: `Malerwerkstatt Beispiel ${suffix}`,
        branch: 'maler',
        branchGroup: 'handwerk',
        city: 'Dortmund',
        street: 'Musterweg',
        houseNumber: '7',
        postalCode: '44137',
        phone: '0231 0000000',
        segmentKey: 'dortmund:handwerk:maler',
        trackToken: randomToken(24),
        identityHash: randomToken(16),
        status: 'qualified',
      })
      .returning();
  }
  if (!lead) throw new Error('Kein Lead für die Demo');
  const demoId = await buildDemo(lead.id, { actor: 'e2e' });
  await db.update(demos).set({ status: 'pending_review' }).where(eq(demos.id, demoId));
  await approveDemo(demoId, 'e2e', { manual: true });
  await publishDemo(demoId, 'e2e');
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, demoId) });
  process.stdout.write(JSON.stringify({ slug: demo!.slug, trackToken: lead.trackToken, leadId: lead.id, demoId }));
  await stopBoss();
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
