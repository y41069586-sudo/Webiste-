import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { orders, orderPayments } from '../src/db/schema';
import { updateConfig } from '../src/config/service';
import { getProviders } from '../src/providers';
import { StripePayment } from '../src/providers/payment/stripe';
import { stopBoss } from '../src/queue';
import { closeBrowser } from '../src/render/browser';
import { sendCancellationInvoice, sweepRefundDocuments } from '../src/render/invoice';
import { pdfTextItems } from '../src/render/pdf';
import { financeReportV4 } from '../src/services/economics-v4';
import { applyRefund } from '../src/services/orders';
import { buildCancellationData } from '../src/invoices/build';
import { resetDb } from './helpers';
import { buy, live, webhook } from './v4-helpers';

describe('Bestätigte Erstattungen: richtige Rechnung und unveränderliche Differenzbelege', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ offers: { activeVersion: 'v4' } }, 'test:refund');
  });
  afterAll(async () => {
    await closeBrowser();
    await stopBoss();
  });
  async function monthly() {
    const { order, customer } = await buy('care_plus');
    await live(customer.id);
    await getDb().update(orders).set({ stripeSubscriptionId: 'sub_refund_fixture' }).where(eq(orders.id, order.id));
    await webhook({
      eventId: 'evt_invoice_refund_fixture',
      type: 'invoice.paid',
      rawType: 'invoice.paid',
      invoiceId: 'in_refund_fixture',
      subscriptionId: 'sub_refund_fixture',
      amountTotal: 9900,
      currency: 'eur',
      billingReason: 'subscription_cycle',
    });
    const pay = (await getDb().query.orderPayments.findFirst({ where: eq(orderPayments.orderId, order.id) }))!;
    return { order, pay };
  }
  const event = {
    type: 'charge.refunded',
    rawType: 'charge.refunded',
    invoiceId: 'in_refund_fixture',
    paymentIntentId: 'pi_monthly_fixture',
    amountTotal: 9900,
    amountRefunded: 500,
    currency: 'eur',
  };
  it('Teil-/Vollerstattung der Monatszahlung lässt 597-Euro-Bestellung unverändert; zwei Belege schreiben nur die Differenz gut', async () => {
    const { order, pay } = await monthly();
    await webhook({ ...event, eventId: 'evt_monthly_partial' });
    expect(await sendCancellationInvoice(order.id, pay.id)).toBe('sent');
    let saved = (await getDb().query.orderPayments.findFirst({ where: eq(orderPayments.id, pay.id) }))!;
    expect(saved.refundedCents).toBe(500);
    expect(saved.refundDocuments).toHaveLength(1);
    const originalPdf = await getProviders().storage.get(saved.refundDocuments[0]!.pdfKey);
    const before = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(before.status).toBe('paid');
    expect(before.refundedCents).toBe(0);
    expect((await financeReportV4()).refundsCents).toBe(500);
    await webhook({ ...event, eventId: 'evt_monthly_full', amountRefunded: 9900 });
    await webhook({ ...event, eventId: 'evt_monthly_old_again' });
    expect(await sendCancellationInvoice(order.id, pay.id)).toBe('sent');
    expect(await sendCancellationInvoice(order.id, pay.id)).toBe('already');
    saved = (await getDb().query.orderPayments.findFirst({ where: eq(orderPayments.id, pay.id) }))!;
    expect(saved.refundDocuments.map((d) => d.deltaCents)).toEqual([500, 9400]);
    expect(saved.refundDocuments.every((d) => d.sentAt)).toBe(true);
    expect(new Set(saved.refundDocuments.map((d) => d.number)).size).toBe(2);
    expect(await getProviders().storage.get(saved.refundDocuments[0]!.pdfKey)).toEqual(originalPdf);
    const text = (await pdfTextItems((await getProviders().storage.get(saved.refundDocuments[1]!.pdfKey))!)).items
      .map((x) => x.str)
      .join(' ');
    expect(text).toContain(pay.invoiceNumber);
    expect(text).toMatch(/94,00/);
    expect((await financeReportV4()).refundsCents).toBe(9900);
    expect(await sweepRefundDocuments()).toBe(0);
  });
  it('falsche Summen/Währung und zu frühe unbekannte Rechnung bleiben retriable; verlorene Belegjobs werden nachgeholt', async () => {
    const { order, pay } = await monthly();
    await expect(webhook({ ...event, eventId: 'evt_bad_sum', amountRefunded: 10000 })).rejects.toThrow(/passt nicht/);
    await expect(webhook({ ...event, eventId: 'evt_bad_ccy', currency: 'usd' })).rejects.toThrow(/passt nicht/);
    await expect(webhook({ ...event, eventId: 'evt_not_yet', invoiceId: 'in_not_yet' })).rejects.toThrow(/noch nicht zugeordnet/);
    expect((await financeReportV4()).reconciliationPending).toBe(1);
    expect((await financeReportV4()).contributionCents).toBeNull();
    await webhook({ ...event, eventId: 'evt_known' });
    expect(await sweepRefundDocuments()).toBe(1);
    await sendCancellationInvoice(order.id, pay.id);
    // The delayed invoice is recorded; retrying the SAME failed webhook must now work.
    await webhook({
      eventId: 'evt_delayed_invoice',
      type: 'invoice.paid',
      rawType: 'invoice.paid',
      invoiceId: 'in_not_yet',
      subscriptionId: 'sub_refund_fixture',
      amountTotal: 9900,
      currency: 'eur',
      billingReason: 'subscription_cycle',
    });
    await webhook({ ...event, eventId: 'evt_not_yet', invoiceId: 'in_not_yet' });
    expect((await financeReportV4()).reconciliationPending).toBe(0);
  });
  it('ältere gespeicherte Stornorechnung behält PDF und Zustell-Idempotenz beim Retry', async () => {
    const { order } = await buy('basis');
    await applyRefund(order.id, 59700, 'test');
    await sendCancellationInvoice(order.id);
    const before = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    await getDb().update(orders).set({ refundDocuments: [], cancellationSentAt: null }).where(eq(orders.id, order.id));
    expect(await sendCancellationInvoice(order.id)).toBe('sent');
    expect(await sendCancellationInvoice(order.id)).toBe('already');
    const after = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(after.cancellationNumber).toBe(before.cancellationNumber);
    expect(after.cancellationPdfKey).toBe(before.cancellationPdfKey);
    expect(after.refundDocuments).toEqual([]);
  });
  it('auch Einrichtung: auf eine Teilerstattung folgt ein eigener ergänzender Beleg statt verlorener Restkorrektur', async () => {
    const { order } = await buy('basis');
    await applyRefund(order.id, 10000, 'test');
    await sendCancellationInvoice(order.id);
    await applyRefund(order.id, 59700, 'test');
    await sendCancellationInvoice(order.id);
    const saved = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(saved.refundDocuments.map((d) => d.deltaCents)).toEqual([10000, 49700]);
    const original = saved.invoiceJson as unknown as Parameters<typeof buildCancellationData>[0];
    const amounts = { grossCents: 3, netCents: 2, vatCents: 1, vatRatePercent: 19 };
    const corrections = [0, 1, 2].map((prior) =>
      buildCancellationData(original, {
        number: 'test',
        issuedAt: new Date(),
        refundedCents: 1,
        alreadyRefundedCents: prior,
        amounts,
      }),
    );
    expect(corrections.map((c) => c.vat)).toEqual([null, '-0,01 €', null]);
  });
});

describe('Stripe SDK: aktuelle Invoice-Payment-Zuordnung, nur bestätigte Refunds und Pagination', () => {
  it.each(['charge.refunded', 'refund.updated'])('%s wird aus API-Belegen einer Monatsrechnung zugeordnet', async (type) => {
    const requests: string[] = [];
    const charge = { id: 'ch_fixture', payment_intent: 'pi_fixture', amount: 9900, currency: 'eur', metadata: {} };
    const p = new StripePayment({
      secretKey: 'rk_test_fixture',
      webhookSecret: 'whsec_fixture',
      httpClient: Stripe.createFetchHttpClient((async (url) => {
        const u = new URL(String(url));
        requests.push(u.pathname + u.search);
        let body: unknown;
        if (u.pathname === '/v1/charges/ch_fixture') body = charge;
        else if (u.pathname === '/v1/refunds')
          body = {
            object: 'list',
            url: '/v1/refunds',
            has_more: !u.searchParams.has('starting_after'),
            data: u.searchParams.has('starting_after')
              ? [
                  { id: 're_2', amount: 200, status: 'succeeded' },
                  { id: 're_pending', amount: 1000, status: 'pending' },
                ]
              : [{ id: 're_1', amount: 300, status: 'succeeded' }],
          };
        else if (u.pathname === '/v1/invoice_payments')
          body = {
            object: 'list',
            url: '/v1/invoice_payments',
            has_more: false,
            data: [
              {
                id: 'inpay_fixture',
                invoice: 'in_fixture',
                status: 'paid',
                payment: { type: 'payment_intent', payment_intent: 'pi_fixture' },
              },
            ],
          };
        else throw Error('Unexpected SDK request ' + u.pathname);
        return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
      }) as typeof fetch),
    });
    const raw = JSON.stringify({
      id: 'evt_fixture',
      type,
      data: {
        object:
          type === 'charge.refunded'
            ? charge
            : {
                id: 're_1',
                charge: 'ch_fixture',
                payment_intent: 'pi_fixture',
                amount: 300,
                currency: 'eur',
                metadata: {},
                status: 'succeeded',
              },
      },
    });
    const normalized = await p.parseWebhook(
      raw,
      Stripe.webhooks.generateTestHeaderString({ payload: raw, secret: 'whsec_fixture' }),
    );
    expect(normalized.invoiceId).toBe('in_fixture');
    expect(normalized.amountRefunded).toBe(500);
    expect(normalized.amountTotal).toBe(9900);
    expect(requests.some((u) => u.includes('starting_after=re_1'))).toBe(true);
    expect(
      requests.some((u) => new URL(u, 'https://fixture.test').searchParams.get('payment[payment_intent]') === 'pi_fixture'),
    ).toBe(true);
  });
});
