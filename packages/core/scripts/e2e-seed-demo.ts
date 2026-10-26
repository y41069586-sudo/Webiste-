/** E2E: veröffentlichte Demo anlegen und Slug/Token als JSON ausgeben. */
import { eq, sql } from 'drizzle-orm';
import { getDb, closeDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { findLeads } from '../src/services/lead-finder';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { qaDemo } from '../src/render/demo-qa';
import { closeBrowser } from '../src/render/browser';
import { buildDemo } from '../src/demos/build';
import { stopBoss } from '../src/queue';
import { getConfig } from '../src/config/service';
import { z } from 'zod';
import { randomToken } from '../src/util/crypto';

async function main(): Promise<void> {
  const target = new URL(process.env.DATABASE_URL ?? 'postgres://invalid/invalid');
  if (
    !['localhost', '127.0.0.1', '::1'].includes(target.hostname) ||
    !/(test|e2e)/.test(target.pathname) ||
    [
      'LLM_PROVIDER',
      'LEAD_SOURCE',
      'PAYMENT_PROVIDER',
      'EMAIL_PROVIDER',
      'MAIL_PROVIDER',
      'REGISTRAR_PROVIDER',
      'HOSTING_PROVIDER',
    ].some((key) => process.env[key] !== 'mock')
  )
    throw new Error('E2E-Demodaten ausschließlich lokal mit Testdatenbank und Mock-Providern.');
  const db = getDb();
  const profile = process.env.E2E_DEMO_PROFILE
    ? z
        .object({ name: z.string().min(3).max(120), branch: z.string(), city: z.string().min(2) })
        .parse(JSON.parse(process.env.E2E_DEMO_PROFILE))
    : null;
  const cfg = await getConfig();
  const branch = profile ? cfg.targeting.branches.find((b) => b.key === profile.branch) : null;
  if (profile && !branch) throw new Error('Unbekannte E2E-Branche');
  let lead =
    profile && branch
      ? (
          await db
            .insert(leads)
            .values({
              source: 'mock',
              sourceId: `e2e-trust-${randomToken(8)}`,
              businessName: profile.name,
              branch: branch.key,
              branchGroup: branch.group,
              city: profile.city,
              street: 'Fiktiver Testweg',
              houseNumber: '7',
              postalCode: '12345',
              phone: '030 0000000',
              segmentKey: `test:${branch.group}:${branch.key}`,
              trackToken: randomToken(24),
              identityHash: randomToken(16),
              status: 'qualified',
            })
            .returning()
        )[0]
      : (await db.select().from(leads).where(eq(leads.status, 'qualified')).limit(1))[0];
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
  await qaDemo(demoId, 'e2e', { lighthouse: false });
  if (process.env.E2E_DEMO_PENDING !== '1') {
    await approveDemo(demoId, 'e2e', {
      manual: true,
      review: {
        facts: true,
        desktop: true,
        mobile: true,
        images: true,
        text: true,
        qualityScores: { design: 90, industry: 90, personalization: 90, images: 90, mobile: 90 },
      },
    });
    await publishDemo(demoId, 'e2e');
  }
  const demo = await db.query.demos.findFirst({ where: eq(demos.id, demoId) });
  process.stdout.write(JSON.stringify({ slug: demo!.slug, trackToken: lead.trackToken, leadId: lead.id, demoId }));
  await closeBrowser();
  await stopBoss();
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
