import { and, eq, isNull } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { events, leads, letters, safetyActions, variants } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { applyAllocations, evaluateIndustries } from '../src/services/arms';
import { refreshFunnel } from '../src/services/funnel';
import { chooseLetterVariant } from '../src/services/letters';
import { costWeeks, DECEPTION_RE, runSafetyNets } from '../src/services/safety-nets';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb, resetVariants } from './helpers';

async function neutralControl() {
  const db = getDb();
  const rows = await db
    .select()
    .from(variants)
    .where(and(eq(variants.kind, 'letter'), eq(variants.sequence, 1), eq(variants.status, 'active'), isNull(variants.industry)));
  return rows.sort((a, b) => +a.createdAt - +b.createdAt)[0]!;
}

/** Handwerk-Variante ohne Claims (immer nutzbar); die mitgelieferten Handwerk-Varianten werden pausiert */
async function testVariant(name = `TEST_HW_${randomToken(4)}`) {
  await getDb().update(variants).set({ status: 'paused' }).where(eq(variants.industry, 'handwerk'));
  const [v] = await getDb()
    .insert(variants)
    .values({ kind: 'letter', name, content: {}, sequence: 1, industry: 'handwerk', status: 'active', active: true })
    .returning();
  return v!;
}

async function sentLetter(
  variantId: string,
  o: { sentDaysAgo?: number; scan?: boolean; optOut?: boolean; undeliverable?: boolean; costCents?: number } = {},
) {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Malerbetrieb Beispiel',
      branch: 'maler',
      branchGroup: 'handwerk',
      industry: 'handwerk',
      city: 'Dortmund',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status: 'letter_delivered',
    })
    .returning();
  const sentAt = addDays(new Date(), -(o.sentDaysAgo ?? 10));
  await db.insert(letters).values({
    leadId: lead!.id,
    sequence: 1,
    status: 'delivered',
    provider: 'letterxpress', // Synthetic provider-confirmed cohort, no API call.
    deliveredAt: addDays(sentAt, 3),
    variantId,
    industry: 'handwerk',
    sentAt,
    estimatedDeliveredAt: addDays(sentAt, 3),
    costCents: o.costCents ?? 150,
    undeliverable: Boolean(o.undeliverable),
    pdfStorageKey: 'x',
  });
  if (o.scan) await db.insert(events).values({ leadId: lead!.id, type: 'scan', createdAt: addDays(sentAt, 4) });
  if (o.optOut) await db.insert(events).values({ leadId: lead!.id, type: 'opt_out', createdAt: addDays(sentAt, 4) });
  return lead!;
}

describe('Optimizer je Branche (L5)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetVariants();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('ohne Daten: Kontrolle = neutrale Variante, Gleichverteilung 50/50 (B10)', async () => {
    const control = await neutralControl();
    const v = await testVariant();
    await refreshFunnel();
    const evs = await evaluateIndustries();
    const hw = evs.find((e) => e.industry === 'handwerk')!;
    expect(hw.equalSplit).toBe(true);
    expect(hw.arms.find((a) => a.arm === control.id)!.isControl).toBe(true);
    expect(hw.arms.find((a) => a.arm === control.id)!.share).toBeCloseTo(0.5, 6);
    expect(hw.arms.find((a) => a.arm === v.id)!.share).toBeCloseTo(0.5, 6);
    expect(hw.arms.find((a) => a.arm === v.id)!.verdict).toBe('zu_wenig_daten');
  });

  it('Quote je Charge: 13 Briefe bei 50/50 → 7/6; bei 15 % Kontrolle mindestens 2', async () => {
    const db = getDb();
    const control = await neutralControl();
    const v = await testVariant();
    const run = async (shares: [number, number]) => {
      await db.delete(letters);
      await applyAllocations(
        [
          {
            industry: 'handwerk',
            arms: [
              { variantId: control.id, share: shares[0], isControl: true },
              { variantId: v.id, share: shares[1], isControl: false },
            ],
          },
        ],
        'admin:test',
      );
      const counts: Record<string, number> = {};
      for (let i = 0; i < 13; i++) {
        const pick = await chooseLetterVariant(db, 1, { industry: 'handwerk', random: (i * 0.37) % 1 });
        counts[pick.id] = (counts[pick.id] ?? 0) + 1;
        const [lead] = await db
          .insert(leads)
          .values({
            source: 'mock',
            sourceId: randomToken(10),
            businessName: 'X',
            branch: 'maler',
            branchGroup: 'handwerk',
            industry: 'handwerk',
            city: 'Dortmund',
            segmentKey: 'dortmund:handwerk:maler',
            trackToken: randomToken(24),
          })
          .returning();
        await db
          .insert(letters)
          .values({ leadId: lead!.id, sequence: 1, variantId: pick.id, industry: 'handwerk', status: 'generated' });
      }
      return counts;
    };
    const even = await run([0.5, 0.5]);
    expect([even[control.id], even[v.id]].sort()).toEqual([6, 7]);
    const skewed = await run([0.15, 0.85]);
    expect(skewed[control.id]).toBe(2);
    expect(skewed[v.id]).toBe(11);
  });

  it('mit Daten: Spannen, P(besser als Kontrolle), Tendenz statt Gewinner unter 100 Briefen', async () => {
    const control = await neutralControl();
    const v = await testVariant();
    for (let i = 0; i < 40; i++) await sentLetter(control.id, { scan: i < 1 });
    for (let i = 0; i < 40; i++) await sentLetter(v.id, { scan: i < 6 });
    await refreshFunnel();
    const hw = (await evaluateIndustries()).find((e) => e.industry === 'handwerk')!;
    const arm = hw.arms.find((a) => a.arm === v.id)!;
    expect(hw.equalSplit).toBe(false);
    expect(arm.delivered).toBe(40);
    expect(arm.scan.lo).toBeLessThan(arm.scan.mean);
    expect(arm.scan.hi).toBeGreaterThan(arm.scan.mean);
    expect(arm.pBetterThanControl!).toBeGreaterThan(0.8);
    expect(['tendenz_besser', 'zu_wenig_daten']).toContain(arm.verdict);
    expect(hw.arms.find((a) => a.arm === control.id)!.share).toBeGreaterThanOrEqual(0.15);
  });
});

describe('Sicherheitsnetze (B6.7)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetVariants();
  });

  it('Opt-out-Bremse: über 5 % der Scans → Variante pausiert, genau einmal', async () => {
    const db = getDb();
    const v = await testVariant();
    for (let i = 0; i < 20; i++) await sentLetter(v.id, { scan: i < 10, optOut: i < 2 });
    await refreshFunnel();
    const a = await runSafetyNets();
    expect(a.map((x) => x.kind)).toEqual(['opt_out']);
    expect((await db.query.variants.findFirst({ where: eq(variants.id, v.id) }))!.status).toBe('paused');
    // erneuter Lauf: keine zweite Aktion; nach Reaktivierung erst bei neuem Opt-out
    await db.update(variants).set({ status: 'active' }).where(eq(variants.id, v.id));
    await refreshFunnel();
    expect(await runSafetyNets()).toHaveLength(0);
    await sentLetter(v.id, { scan: true, optOut: true });
    await refreshFunnel();
    expect((await runSafetyNets()).map((x) => x.kind)).toEqual(['opt_out']);
  });

  it('ein einzelner Opt-out pausiert nicht', async () => {
    const v = await testVariant();
    for (let i = 0; i < 5; i++) await sentLetter(v.id, { scan: i < 2, optOut: i < 1 });
    await refreshFunnel();
    expect(await runSafetyNets()).toHaveLength(0);
  });

  it('Beschwerde „Abzocke/Täuschung“ → Variante sofort pausiert', async () => {
    const db = getDb();
    const v = await testVariant();
    const lead = await sentLetter(v.id, { scan: true });
    await db.insert(events).values({ leadId: lead.id, type: 'complaint', metaJson: { deception: true } });
    await refreshFunnel();
    const a = await runSafetyNets();
    expect(a.map((x) => x.kind)).toEqual(['complaint']);
    expect((await db.query.variants.findFirst({ where: eq(variants.id, v.id) }))!.status).toBe('paused');
    expect(DECEPTION_RE.test('Das ist doch Abzocke!')).toBe(true);
    expect(DECEPTION_RE.test('Reine Täuschung, unseriös')).toBe(true);
    expect(DECEPTION_RE.test('Kein Interesse, danke')).toBe(false);
  });

  it('Unzustellbar-Bremse: mehr als 3 % einer Charge → Versand pausiert', async () => {
    const v = await testVariant();
    for (let i = 0; i < 20; i++) await sentLetter(v.id, { sentDaysAgo: 2, undeliverable: i === 0 });
    await refreshFunnel();
    expect((await runSafetyNets()).map((x) => x.kind)).toEqual(['undeliverable']);
    expect((await getConfig({ fresh: true })).switches.sendingPaused).toBe(true);
    await updateConfig({ switches: { sendingPaused: false } }, 'admin:test');
    await refreshFunnel();
    expect(await runSafetyNets()).toHaveLength(0);
  });

  it('Kostenbremse: 4 ausgewertete Wochen über MAX_CAC → Wochenbudget halbiert, Bericht', async () => {
    const db = getDb();
    const v = await testVariant();
    for (const d of [60, 67, 74, 81]) await sentLetter(v.id, { sentDaysAgo: d, costCents: 25_000 });
    await refreshFunnel();
    const weeks = await costWeeks();
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(weeks.every((w) => w.over)).toBe(true);
    const before = (await getConfig({ fresh: true })).budget.weeklyBudgetCents;
    expect((await runSafetyNets()).map((x) => x.kind)).toEqual(['cost']);
    expect((await getConfig({ fresh: true })).budget.weeklyBudgetCents).toBe(Math.floor(before / 2));
    // gleiche Wochen lösen nicht erneut aus
    expect(await runSafetyNets()).toHaveLength(0);
    expect(await db.select().from(safetyActions)).toHaveLength(1);
  });
});
