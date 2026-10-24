import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getConfig, updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { armAllocations, budgetLedger, events, leads, letters, orders, reports, variants } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { kpiRows, kpiSummary } from '../src/services/kpis';
import { applyReport, betaSample, runWeeklyOptimizer, seededRandom, thompsonAllocation } from '../src/services/optimizer';
import { seedDefaults } from '../src/services/seed';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

async function lead(
  segment: string,
  branch: string,
  variantId: string | null,
  opts: { scan?: boolean; cta?: boolean; buy?: boolean; sentDaysAgo?: number; test?: boolean } = {},
) {
  const db = getDb();
  const [l] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: `Betrieb ${randomToken(4)}`,
      branch,
      branchGroup: segment.split(':')[1] as 'handwerk' | 'beauty',
      city: 'Dortmund',
      segmentKey: segment,
      trackToken: randomToken(24),
      status: 'letter_delivered',
    })
    .returning();
  const sentAt = addDays(new Date(), -(opts.sentDaysAgo ?? 10));
  await db.insert(letters).values({
    leadId: l!.id,
    sequence: 1,
    status: 'delivered',
    variantId,
    sentAt,
    costCents: 140,
    isTest: Boolean(opts.test),
    pdfStorageKey: 'x',
  });
  if (opts.scan) await db.insert(events).values({ leadId: l!.id, type: 'scan' });
  if (opts.cta) await db.insert(events).values({ leadId: l!.id, type: 'cta_click' });
  if (opts.buy) {
    await db.insert(orders).values({
      leadId: l!.id,
      amountCents: 59000,
      netCents: 59000,
      status: 'paid',
      customerCompany: 'X',
      customerName: 'Y',
      customerEmail: 'x@example.org',
      billingAddressJson: { street: 'A 1', postalCode: '44137', city: 'Dortmund', country: 'DE' },
      paidAt: new Date(),
    });
  }
  return l!;
}

describe('Thompson Sampling', () => {
  it('Beta-Stichproben haben den richtigen Mittelwert', () => {
    const rng = seededRandom(1);
    const xs = Array.from({ length: 4000 }, () => betaSample(3, 7, rng));
    expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(0.3, 1);
  });

  it('besserer Arm bekommt mehr, Exploration bleibt ≥ 20 %, Summe = 1', () => {
    const res = thompsonAllocation(
      [
        { key: 'a', label: 'a', n: 60, scans: 12, purchases: 4 },
        { key: 'b', label: 'b', n: 60, scans: 3, purchases: 0 },
        { key: 'c', label: 'c', n: 0, scans: 0, purchases: 0 },
      ],
      { exploration: 0.05, samples: 4000, rng: seededRandom(7) },
    );
    const by = Object.fromEntries(res.map((r) => [r.key, r]));
    expect(by.a!.share).toBeGreaterThan(by.b!.share);
    for (const r of res) expect(r.share).toBeGreaterThanOrEqual(0.2 / 3 - 1e-9);
    expect(res.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1, 6);
    // Scan-Rate als Prior: ohne Käufe ist der Arm mit mehr Scans im Vorteil
    const prior = thompsonAllocation(
      [
        { key: 'x', label: 'x', n: 30, scans: 9, purchases: 0 },
        { key: 'y', label: 'y', n: 30, scans: 1, purchases: 0 },
      ],
      { exploration: 0.2, samples: 4000, rng: seededRandom(3) },
    );
    expect(prior[0]!.priorMean).toBeGreaterThan(prior[1]!.priorMean);
  });
});

describe('KPIs und Wochenbericht', () => {
  beforeEach(async () => {
    await resetDb();
    await getDb().delete(variants);
    await seedDefaults(getDb());
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('Funnel je Segment und Variante; Testbriefe zählen nicht; CAC und ROI', async () => {
    const db = getDb();
    const vs = await db.select().from(variants).where(eq(variants.sequence, 1));
    const [va, vb] = [vs[0]!.id, vs[1]!.id];
    const maler = 'dortmund:handwerk:maler';
    const nails = 'dortmund:beauty:nagelstudio';
    await lead(maler, 'maler', va, { scan: true, cta: true, buy: true });
    await lead(maler, 'maler', va, { scan: true });
    await lead(maler, 'maler', vb);
    await lead(nails, 'nagelstudio', vb, { scan: true, cta: true });
    await lead(nails, 'nagelstudio', vb, { test: true, scan: true });
    await db.insert(budgetLedger).values([
      { category: 'letter', amountCents: 560 },
      { category: 'llm', amountCents: 40, amountMicroCents: 500_000 },
      { category: 'domain', amountCents: 600 },
    ]);
    const f = { from: addDays(new Date(), -30), to: addDays(new Date(), 1) };
    const seg = await kpiRows(f, 'segment');
    expect(seg.find((r) => r.key === maler)).toMatchObject({
      leads: 3,
      letters: 3,
      scans: 2,
      ctaClicks: 1,
      purchases: 1,
      revenueCents: 59000,
      letterCostCents: 420,
      costPerLetterCents: 140,
    });
    expect(seg.find((r) => r.key === nails)).toMatchObject({ leads: 1, scans: 1, purchases: 0 });
    const byVar = await kpiRows(f, 'variant');
    expect(byVar.find((r) => r.key === va)!.label).toBe(vs[0]!.name);
    const s = await kpiSummary(f);
    expect(s).toMatchObject({ leads: 4, purchases: 1, revenueCents: 59000, acquisitionCostCents: 601 });
    expect(s.cacCents).toBe(601);
    expect(s.roi).toBeCloseTo((59000 - 601) / 601, 5);
    const onlyNails = await kpiSummary({ ...f, branch: 'nagelstudio' });
    expect(onlyNails.leads).toBe(1);
  });

  it('Wochenbericht: Vorschlag ohne AUTO_OPTIMIZE, Übernahme setzt Segment-Anteile und Zuteilung je Branche', async () => {
    const db = getDb();
    const vs = await db.select().from(variants).where(eq(variants.sequence, 1));
    for (let i = 0; i < 6; i++) await lead('dortmund:handwerk:maler', 'maler', vs[0]!.id, { scan: i < 3, buy: i === 0 });
    for (let i = 0; i < 6; i++) await lead('dortmund:beauty:nagelstudio', 'nagelstudio', vs[1]!.id, { scan: i < 1 });
    await updateConfig({ switches: { autoOptimize: false } }, 'test');
    const r = await runWeeklyOptimizer(new Date(), seededRandom(11));
    expect(r.applied).toBe(false);
    expect(r.markdown).toContain('Budgetanteile je Segment');
    const maler = r.segments.find((x) => x.key === 'dortmund:handwerk:maler')!;
    const nails = r.segments.find((x) => x.key === 'dortmund:beauty:nagelstudio')!;
    expect(maler.share).toBeGreaterThan(nails.share);
    expect((await getConfig({ fresh: true })).budget.segmentShares).toEqual({});
    // erneuter Lauf derselben Woche ersetzt den Bericht
    await runWeeklyOptimizer(new Date(), seededRandom(11));
    expect(await db.select().from(reports)).toHaveLength(1);

    await applyReport(r.reportId, 'admin:test');
    const cfg = await getConfig({ fresh: true });
    expect(cfg.budget.segmentShares['dortmund:handwerk:maler']).toBeCloseTo(maler.share, 3);
    // L5: Briefvarianten je Branche mit Kontrolle ≥ 15 % – Übernahme schreibt die Zuteilung
    expect(r.markdown).toContain('Briefvarianten je Branche');
    const alloc = await db.select().from(armAllocations).where(eq(armAllocations.industry, 'handwerk'));
    expect(alloc.length).toBeGreaterThanOrEqual(2);
    expect(alloc.reduce((a, x) => a + x.share, 0)).toBeCloseTo(1, 2);
    expect(alloc.find((x) => x.isControl)!.share).toBeGreaterThanOrEqual(0.15);

    await updateConfig({ switches: { autoOptimize: true } }, 'test');
    expect((await runWeeklyOptimizer(new Date(), seededRandom(12))).applied).toBe(true);
  });
});
