import { and, eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { auditLog, demos, leads } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { currentDemoForLead, publishDemo } from '../src/services/demo-review';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

async function seed() {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Doppelte Demo GmbH',
      branch: 'elektriker',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Weg',
      houseNumber: '1',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:elektriker',
      trackToken: randomToken(24),
      status: 'demo_built' as never,
    })
    .returning();
  const make = async (status: string, expiresAt: Date | null = null) =>
    (
      await db
        .insert(demos)
        .values({
          leadId: lead!.id,
          slug: randomToken(24),
          templateId: 'handwerk-solid',
          palette: 'werkblau',
          status: status as never,
          ...(status === 'published' ? { publishedAt: new Date(Date.now() - 60_000), expiresAt } : {}),
        })
        .returning()
    )[0]!;
  return { lead: lead!, make };
}

describe('Je Betrieb genau eine Demo online (10.11.2026)', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('zwei freigegebene Demos desselben Betriebs: nach dem Veröffentlichen ist nur die zuletzt veröffentlichte online', async () => {
    const { lead, make } = await seed();
    const a = await make('approved');
    const b = await make('approved');
    await publishDemo(a.id, 'admin:test');
    await publishDemo(b.id, 'admin:test');
    const online = await getDb()
      .select()
      .from(demos)
      .where(and(eq(demos.leadId, lead.id), eq(demos.status, 'published')));
    expect(online.map((d) => d.id)).toEqual([b.id]);
    expect((await currentDemoForLead(getDb(), lead.id))?.id).toBe(b.id);
    const log = await getDb().select().from(auditLog).where(eq(auditLog.entityId, a.id));
    expect(log.some((l) => l.action === 'replace')).toBe(true);
  });

  it('ein im Brief zugesagtes Ablaufdatum der ersetzten Demo gilt für die neue weiter', async () => {
    const { make } = await seed();
    const promised = addDays(new Date(), 90);
    await make('published', promised);
    const next = await make('approved');
    await publishDemo(next.id, 'admin:test');
    const row = (await getDb().query.demos.findFirst({ where: eq(demos.id, next.id) }))!;
    expect(row.expiresAt!.getTime()).toBeGreaterThanOrEqual(promised.getTime());
  });
});
