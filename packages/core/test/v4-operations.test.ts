import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { budgetLedger, orders, tariffChanges } from '../src/db/schema';
import { updateConfig } from '../src/config/service';
import { stopBoss } from '../src/queue';
import { clearDomainCache } from '../src/services/domains';
import { startBillingV4, sweepBillingV4 } from '../src/services/billing-v4';
import {
  requestTariffChange,
  approveTariffChange,
  reconcileTariffV4,
  requestCancellationV4,
  withdrawTariffChange,
} from '../src/services/tariffs-v4';
import {
  billingPeriodV4,
  careOverview,
  recordCareWork,
  priceCareWork,
  voidCareWork,
  runCareTechnicalCheck,
  reviewCareCheck,
} from '../src/services/care-v4';
import { financeReportV4, financeRange, confirmFinanceCoverage, recordOperatingCost } from '../src/services/economics-v4';
import { stripeV4Price } from '../src/config/stripe-v4-prices';
import { resetDb } from './helpers';
import { buy, live, webhook } from './v4-helpers';
import { randomToken } from '../src/util/crypto';
import { getProviders, setProviders } from '../src/providers';

describe('V4 Betrieb: Mandat, Tarif, Betreuung und belegte Wirtschaftlichkeit', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
    await updateConfig({ offers: { activeVersion: 'v4', billingMode: 'saved_mandate' } }, 'test:v4');
  });
  afterAll(() => stopBoss());
  const currentOrder = (id: string) => getDb().query.orders.findFirst({ where: eq(orders.id, id) });
  async function active(tier: 'basis' | 'care_plus' = 'care_plus') {
    const fixture = await buy(tier);
    await live(fixture.customer.id);
    await startBillingV4(fixture.order.id);
    return fixture;
  }
  const work = (customerId: string, minutes = 20, hourlyCostCents: number | null = 3000) => ({
    customerId,
    minutes,
    hourlyCostCents,
    workedAt: new Date(),
    kind: 'included_content' as const,
    note: 'Bestätigten Text aktualisiert',
    extraApproved: false,
    idempotencyKey: `work-${randomToken(16)}`,
  });

  it.each(['basis', 'care_plus'] as const)('%s startet genau ein Monatsabo erst nach belegtem Go-Live', async (tier) => {
    const { order, customer } = await buy(tier);
    await expect(startBillingV4(order.id)).rejects.toThrow(/Go-Live/);
    await live(customer.id);
    const result = await Promise.all([startBillingV4(order.id), startBillingV4(order.id)]);
    expect(result[0].id).toBe(result[1].id);
    const saved = await currentOrder(order.id);
    expect(saved?.billingStartedAt).toBeInstanceOf(Date);
    expect(saved?.stripeSubscriptionId).toBe(result[0].id);
    expect(await sweepBillingV4()).toBe(0);
    await webhook({
      eventId: `evt_first_${tier}`,
      type: 'invoice.paid',
      rawType: 'invoice.paid',
      subscriptionId: result[0].id,
      invoiceId: `in_first_${tier}`,
      amountTotal: tier === 'basis' ? 1900 : 9900,
      currency: 'eur',
      metadata: { kind: 'subscription', orderId: order.id, customerId: customer.id, offerVersion: 'v4' },
      periodStart: saved!.billingStartedAt,
      periodEnd: new Date(Date.now() + 30 * 86400000),
    });
    const report = await financeReportV4();
    expect(report.setupReceivedCents).toBe(59700);
    expect(report.monthlyReceivedCents).toBe(tier === 'basis' ? 1900 : 9900);
  });
  it('fehlende oder zukünftige Zustimmung, ungezahlte oder beendete Bestellung blockiert den Start', async () => {
    const { order, customer } = await buy('basis');
    await live(customer.id);
    await getDb()
      .update(orders)
      .set({ offerSnapshot: { ...order.offerSnapshot!, consentAt: null } })
      .where(eq(orders.id, order.id));
    await expect(startBillingV4(order.id)).rejects.toThrow(/Zustimmung/);
    await getDb().update(orders).set({ offerSnapshot: order.offerSnapshot, endedAt: new Date() }).where(eq(orders.id, order.id));
    await expect(startBillingV4(order.id)).rejects.toThrow(/Zustimmung/);
    expect((await currentOrder(order.id))?.stripeSubscriptionId).toBeNull();
  });

  it('Live-Monatsstart verweigert alte Testzahlungen und den Dashboard-Dry-Run', async () => {
    const { order, customer } = await buy('basis');
    await live(customer.id);
    await getDb().update(orders).set({ provider: 'stripe', paymentMode: 'test' }).where(eq(orders.id, order.id));
    const previous = getProviders().payment;
    const start = vi.fn();
    try {
      setProviders({
        payment: {
          name: 'stripe',
          testMode: false,
          createCheckoutSession: vi.fn(),
          parseWebhook: vi.fn(),
          startSavedSubscription: start,
        },
      });
      await expect(startBillingV4(order.id)).rejects.toThrow(/Testbestellungen/);
      await getDb().update(orders).set({ paymentMode: 'live' }).where(eq(orders.id, order.id));
      await expect(startBillingV4(order.id)).rejects.toThrow(/DRY_RUN/);
      expect(start).not.toHaveBeenCalled();
    } finally {
      setProviders({ payment: previous });
    }
  });
  it('Tarifwechsel hat Zustimmung, Freigabe und Preisnachweis; Kauf-Snapshot bleibt unverändert', async () => {
    const { order, customer } = await active('basis');
    await expect(requestTariffChange(customer.accessToken, 'care_plus', false)).rejects.toThrow(/Zustimmung/);
    const r = await requestTariffChange(customer.accessToken, 'care_plus', true);
    expect((await requestTariffChange(customer.accessToken, 'care_plus', true)).id).toBe(r.id);
    const scheduled = await approveTariffChange(r.id, 'test:admin');
    expect(scheduled.status).toBe('scheduled');
    expect((await approveTariffChange(r.id, 'test:admin')).scheduleId).toBe(scheduled.scheduleId);
    expect(await reconcileTariffV4(order.id, stripeV4Price('care_plus', true, 9900, 'eur'))).toBe(false);
    const due = new Date(scheduled.effectiveAt!.getTime() + 1);
    expect(await reconcileTariffV4(order.id, stripeV4Price('basis', true, 1900, 'eur'), due)).toBe(false);
    expect(await reconcileTariffV4(order.id, stripeV4Price('care_plus', true, 9900, 'eur'), due)).toBe(true);
    const changed = await currentOrder(order.id);
    expect(changed?.offerSnapshot).toEqual(order.offerSnapshot);
    expect(changed?.activeOfferSnapshot?.tier).toBe('care_plus');
    expect(changed?.stripeSubscriptionId).toBe((await currentOrder(order.id))?.stripeSubscriptionId);
  });
  it('fremder Token darf keinen Wechsel zurücknehmen; Kündigung stoppt geplanten Wechsel', async () => {
    const { order, customer } = await active('basis');
    const r = await requestTariffChange(customer.accessToken, 'care_plus', true);
    await approveTariffChange(r.id, 'test:admin');
    await expect(withdrawTariffChange('invalid', r.id)).rejects.toThrow();
    await requestCancellationV4(customer.accessToken, true);
    await requestCancellationV4(customer.accessToken, true);
    expect((await currentOrder(order.id))?.cancelAtPeriodEnd).toBe(true);
    expect((await getDb().query.tariffChanges.findFirst({ where: eq(tariffChanges.id, r.id) }))?.status).toBe('cancelled');
    await expect(requestTariffChange(customer.accessToken, 'care_plus', true)).rejects.toThrow(/ungekündigt/);
  });
  it('60 Minuten pro Abrechnungsmonat sind auch bei parallelen Buchungen ein hartes Limit', async () => {
    const { customer } = await active();
    const attempts = await Promise.allSettled([
      recordCareWork(work(customer.id, 40), 'test:admin'),
      recordCareWork(work(customer.id, 40), 'test:admin'),
    ]);
    expect(attempts.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await careOverview(customer.id)).remainingMinutes).toBe(20);
    const i = work(customer.id, 20);
    const row = await recordCareWork(i, 'test:admin');
    expect((await recordCareWork(i, 'test:admin')).id).toBe(row.id);
    expect((await careOverview(customer.id)).usedMinutes).toBe(60);
    await expect(recordCareWork(work(customer.id, 1), 'test:admin')).rejects.toThrow(/kontingent/i);
  });
  it('Basis enthält keine Inhaltsminuten, Zusatzarbeit benötigt gesonderte Kundenfreigabe', async () => {
    const { customer } = await active('basis');
    await expect(recordCareWork(work(customer.id), 'test:admin')).rejects.toThrow(/kontingent/i);
    await expect(recordCareWork({ ...work(customer.id), kind: 'extra_content' }, 'test:admin')).rejects.toThrow(/Kundenfreigabe/);
    await recordCareWork({ ...work(customer.id), kind: 'extra_content', extraApproved: true }, 'test:admin');
  });
  it('unbewertete Arbeit blockiert Beitrag; Bewertung und Storno buchen Kosten genau einmal', async () => {
    const { customer } = await active();
    const row = await recordCareWork(work(customer.id, 30, null), 'test:admin');
    const range = financeRange();
    expect((await financeReportV4()).contributionCents).toBeNull();
    await expect(confirmFinanceCoverage(range.from, range.to, true, 'test:admin')).rejects.toThrow(/Unbewertet/);
    await priceCareWork(row.id, 3000, 'test:admin');
    expect((await financeReportV4()).actualCostCents).toBe(1500);
    await expect(priceCareWork(row.id, 3000, 'test:admin')).rejects.toThrow(/bewertet/);
    await voidCareWork(row.id, 'test:admin');
    await voidCareWork(row.id, 'test:admin');
    expect((await financeReportV4()).actualCostCents).toBe(0);
    expect((await careOverview(customer.id)).usedMinutes).toBe(0);
    expect(await getDb().select().from(budgetLedger)).toHaveLength(2);
  });
  it('Kosten vollständig nur für geprüften Fingerprint; neue Daten heben Bestätigung auf', async () => {
    const { customer } = await active();
    const range = financeRange();
    const cost = {
      kind: 'hosting' as const,
      amountCents: 1000,
      customerId: customer.id,
      incurredAt: new Date(),
      reference: 'Fiktiver Hostingbeleg',
      idempotencyKey: 'fixture-hosting-1',
    };
    await recordOperatingCost(cost, 'test:admin');
    await recordOperatingCost(cost, 'test:admin');
    await confirmFinanceCoverage(range.from, range.to, true, 'test:admin');
    expect((await financeReportV4()).contributionCents).toBe(58700);
    await recordOperatingCost({ ...cost, amountCents: 500, idempotencyKey: 'fixture-hosting-2' }, 'test:admin');
    expect((await financeReportV4()).coverageInvalidated).toBe(true);
    expect((await financeReportV4()).contributionCents).toBeNull();
  });
  it('Monatscheck unterscheidet simuliert / technisch / manuell; keine Produktionsabnahme durch Mock', async () => {
    const { customer } = await active();
    const r = await runCareTechnicalCheck(customer.id);
    expect(r.simulated).toBe(true);
    expect(r.status).toBe('passed');
    await expect(reviewCareCheck(r.id, '', false, 'test:admin')).rejects.toThrow();
    await reviewCareCheck(r.id, 'Fiktive Testvorschau tatsächlich geprüft', true, 'test:admin');
    expect((await careOverview(customer.id)).checks[0]?.status).toBe('reviewed');
  });
  it('Monatsende bleibt am ursprünglichen Anker; Kalender- und Zeitraumvalidierung', () => {
    const p = billingPeriodV4(new Date('2026-01-31T12:00:00Z'), new Date('2026-03-01T12:00:00Z'));
    expect(p.start.toISOString()).toBe('2026-02-28T12:00:00.000Z');
    expect(p.end.toISOString()).toBe('2026-03-31T12:00:00.000Z');
    expect(() => financeRange('2026-02-30', '2026-03-01')).toThrow();
  });
});
