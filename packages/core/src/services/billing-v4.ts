import { and, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db/client';
import { customers, orders, sites } from '../db/schema';
import { getProviders } from '../providers';
import { assertV4BillingReady } from './offers-v4';
import { audit } from './audit';
import { assertNotHalted, raiseAlert } from './budget';
import { effectiveSwitches, getConfig } from '../config/service';

/** Called only after the existing live-check has committed actual publication evidence. */
export async function startBillingV4(orderId: string, actor = 'job:go-live') {
  await assertNotHalted();
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`);
    const order = await tx.query.orders.findFirst({ where: eq(orders.id, orderId) });
    if (!order?.offerSnapshot || order.offerSnapshot.billingMode !== 'saved_mandate') return { status: 'manual_checkout' };
    if (order.stripeSubscriptionId) return { status: order.subscriptionStatus ?? 'pending', id: order.stripeSubscriptionId };
    if (order.recurringCheckoutSessionId)
      throw new Error('Offener manueller Checkout muss vor automatischem Start geklärt werden.');
    const customer = await tx.query.customers.findFirst({ where: eq(customers.orderId, order.id) });
    const site = customer
      ? await tx.query.sites.findFirst({ where: and(eq(sites.customerId, customer.id), eq(sites.status, 'live')) })
      : null;
    assertV4BillingReady({
      offer: order.offerSnapshot,
      paid: order.status === 'paid',
      liveAt: site?.liveAt ?? null,
      cancelled: Boolean(order.endedAt),
    });
    if (!customer || !order.stripeSessionId) throw new Error('Einrichtungszahlung/Kunde fehlt.');
    const provider = getProviders().payment;
    if (provider.name !== order.provider) throw new Error('Zahlungsanbieter passt nicht zur bezahlten Bestellung.');
    if (provider.testMode === false) {
      if (order.paymentMode !== 'live') throw new Error('Testbestellungen dürfen kein echtes Monatsabo starten.');
      if (effectiveSwitches(await getConfig({ db: tx, fresh: true })).dryRun)
        throw new Error('DRY_RUN sperrt den Start echter Monatsabos.');
    }
    if (!provider.startSavedSubscription) throw new Error('Anbieter unterstützt keinen Mandatsstart.');
    const sub = await provider.startSavedSubscription({
      orderId,
      customerId: customer.id,
      setupSessionId: order.stripeSessionId,
      tier: order.offerSnapshot.tier,
      amountCents: order.offerSnapshot.monthlyCents,
      liveAt: site!.liveAt!,
      idempotencyKey: `v4-go-live-${order.id}`,
    });
    await tx
      .update(orders)
      .set({
        stripeSubscriptionId: sub.id,
        subscriptionStatus: sub.status,
        billingActionUrl: sub.hostedInvoiceUrl ?? null,
        billingStartedAt: sub.periodStart,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    await tx.update(customers).set({ subscriptionId: sub.id, updatedAt: new Date() }).where(eq(customers.id, customer.id));
    await audit(tx, {
      entity: 'order',
      entityId: order.id,
      action: 'v4_billing_started',
      actor,
      context: { subscriptionId: sub.id, status: sub.status },
    });
    if (sub.status !== 'active')
      await raiseAlert(tx, {
        level: 'warn',
        code: `v4_billing_action_${order.id}`,
        message: 'Monatsabo benötigt Zahlungsbestätigung; kein zweites Abo anlegen.',
        context: { orderId, hostedInvoiceUrl: sub.hostedInvoiceUrl ?? null },
      });
    return sub;
  });
}

/** Retry only missing starts; never re-create an already installed or cancelled subscription. */
export async function sweepBillingV4() {
  const db = getDb();
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(customers, eq(customers.orderId, orders.id))
    .innerJoin(sites, eq(sites.customerId, customers.id))
    .where(
      and(
        eq(orders.status, 'paid'),
        eq(sites.status, 'live'),
        isNull(orders.endedAt),
        isNull(orders.stripeSubscriptionId),
        sql`${orders.offerSnapshot}->>'billingMode'='saved_mandate'`,
      ),
    );
  let started = 0;
  for (const row of rows) {
    try {
      await startBillingV4(row.id);
      started++;
    } catch {
      await raiseAlert(db, {
        level: 'error',
        code: `v4_billing_start_${row.id}`,
        message: 'Abo konnte nach Go-Live nicht gestartet werden; Zahlungsmittel und Verbindung im Admin prüfen.',
        context: { orderId: row.id },
      });
    }
  }
  return started;
}
