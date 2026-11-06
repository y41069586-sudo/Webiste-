import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { customers, orders, outboundEmails } from '../src/db/schema';
import { updateConfig } from '../src/config/service';
import { stopBoss } from '../src/queue';
import { clearDomainCache } from '../src/services/domains';
import { startBillingV4 } from '../src/services/billing-v4';
import { requestCancellationV4, requestTariffChange } from '../src/services/tariffs-v4';
import { sendOrderInvoice } from '../src/render/invoice';
import { startHostedCheckout } from '../src/services/orders';
import { v4CheckoutTerms, v4Offer, v4OfferedTiers } from '../src/services/offers-v4';
import { getProviders } from '../src/providers';
import { resetDb } from './helpers';
import { buy, live } from './v4-helpers';

describe('Tarif „Komplett“: 0 € Einrichtung, 179 €/Monat, erste Abbuchung 7 Tage nach Go-Live, 12 Monate', () => {
  beforeEach(async () => {
    await resetDb();
    clearDomainCache();
    await updateConfig({ offers: { activeVersion: 'v4', billingMode: 'saved_mandate', komplettEnabled: true } }, 'test:komplett');
  });
  afterAll(() => stopBoss());

  it('Angebot: ersetzt Care+ für Neukunden, Bedingungen klar benannt', () => {
    expect(v4OfferedTiers({ offers: { komplettEnabled: true } })).toEqual(['basis', 'komplett']);
    expect(v4OfferedTiers({})).toEqual(['basis', 'care_plus']);
    const o = v4Offer('komplett');
    expect(o).toMatchObject({
      setupCents: 0,
      monthlyCents: 17900,
      minTermMonths: 12,
      billingDelayDays: 7,
      billingMode: 'saved_mandate',
    });
    const t = v4CheckoutTerms('komplett');
    expect(t).toMatch(/nichts abgebucht/);
    expect(t).toMatch(/7 Tage nach dem bestätigten Go-Live/);
    expect(t).toMatch(/Mindestlaufzeit 12 Monate/);
  });

  it('Care+ ist bei aktivem Komplett nicht mehr bestellbar', async () => {
    await expect(buy('care_plus')).rejects.toThrow(/angebotenen Tarife/);
  });

  it('Bestellung bucht nichts ab, erzeugt keine 0-€-Rechnung, Bestätigung mit Onboarding-Link geht trotzdem raus', async () => {
    const { order, customer } = await buy('komplett');
    expect(order.status).toBe('paid');
    expect(order.amountCents).toBe(0);
    expect(order.invoiceNumber).toBeNull();
    expect(order.offerSnapshot?.tier).toBe('komplett');
    expect(await sendOrderInvoice(order.id)).toBe('sent');
    const mail = await getDb().query.outboundEmails.findFirst({ where: eq(outboundEmails.orderId, order.id) });
    expect(mail?.subject).toMatch(/SeitenWerk Komplett/);
    expect(mail?.subject).not.toMatch(/Rechnung/);
    expect(customer.accessToken.length).toBeGreaterThan(10);
  });

  it('Go-Live: Abo startet mit erster Abbuchung 7 Tage später, Mindestlaufzeit 12 Monate ab dann', async () => {
    const { order, customer } = await buy('komplett');
    await expect(startBillingV4(order.id)).rejects.toThrow(/Go-Live/);
    await live(customer.id);
    const sub = await startBillingV4(order.id);
    const after = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    const site = await getDb().query.sites.findFirst({
      where: eq((await import('../src/db/schema')).sites.customerId, customer.id),
    });
    const firstCharge = site!.liveAt!.getTime() + 7 * 86_400_000;
    expect((sub as { status: string }).status).toBe('trialing');
    expect(Math.abs(after.billingStartedAt!.getTime() - firstCharge)).toBeLessThan(2000);
    const months = (after.minTermEndsAt!.getTime() - firstCharge) / 86_400_000;
    expect(months).toBeGreaterThan(360);
    expect(months).toBeLessThan(370);
    // genau ein Abo, auch bei erneutem Aufruf
    expect((await startBillingV4(order.id)) as { id: string }).toMatchObject({ id: after.stripeSubscriptionId });
  });

  it('Kündigung wirkt zum Ende der Mindestlaufzeit; Tarifwechsel vorher gesperrt, Wechsel nach Komplett nie', async () => {
    const { order, customer } = await buy('komplett');
    await live(customer.id);
    await startBillingV4(order.id);
    await getDb().update(orders).set({ subscriptionStatus: 'active' }).where(eq(orders.id, order.id));
    await expect(requestTariffChange(customer.accessToken, 'basis', true)).rejects.toThrow(/Mindestlaufzeit/);
    await requestCancellationV4(customer.accessToken, true);
    const after = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(after.cancelAtPeriodEnd).toBe(true);
    const state = (await getProviders().payment.subscriptionState!(after.stripeSubscriptionId!)) as unknown as {
      cancelAt?: string;
    };
    expect(state.cancelAt).toBe(after.minTermEndsAt!.toISOString());
    const basis = await buy('basis');
    await live(basis.customer.id);
    await startBillingV4(basis.order.id);
    await expect(requestTariffChange(basis.customer.accessToken, 'komplett', true)).rejects.toThrow(/Neubestellung/);
  });

  it('ohne Schalter bleibt alles wie bisher (Basis/Care+), Komplett ist nicht bestellbar', async () => {
    await updateConfig(
      { offers: { activeVersion: 'v4', billingMode: 'saved_mandate', komplettEnabled: false } },
      'test:komplett',
    );
    await expect(buy('komplett')).rejects.toThrow(/angebotenen Tarife/);
    void startHostedCheckout;
    void customers;
  });
});
