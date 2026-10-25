import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import {
  checkoutAvailability,
  getConfig,
  getProviders,
  getDb,
  schema,
  MockPayment,
  processPaymentWebhook,
  randomToken,
} from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Test-Abo', robots: { index: false, follow: false } };

/** Simulierter Abo-Abschluss (nur PAYMENT_PROVIDER=mock außerhalb der Produktion). */
export default async function MockSubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ session: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { session } = await params;
  const { ref = '' } = await searchParams;
  const avail = checkoutAvailability();
  if (!avail.ok || avail.mode !== 'mock' || !/^[0-9a-f-]{36}$/.test(ref)) notFound();
  const cfg = await getConfig();
  async function confirm() {
    'use server';
    const p = getProviders().payment;
    if (!(p instanceof MockPayment)) throw new Error('nur im Testmodus');
    const customer = await getDb().query.customers.findFirst({ where: eq(schema.customers.id, ref) });
    if (!customer) throw new Error('Kunde nicht gefunden');
    const order = await getDb().query.orders.findFirst({ where: eq(schema.orders.id, customer.orderId) });
    const metadata = {
      kind: 'subscription',
      customerId: ref,
      ...(order?.offerSnapshot ? { orderId: order.id, offerVersion: 'v4', tier: order.offerSnapshot.tier } : {}),
    };
    const subscriptionId = `sub_mock_${session.replace(/[^a-zA-Z0-9]/g, '')}`;
    const raw = JSON.stringify({
      eventId: `evt_mock_${randomToken(16)}`,
      type: 'checkout.completed',
      rawType: 'checkout.session.completed',
      sessionId: session,
      mode: 'subscription',
      subscriptionId,
      metadata,
    });
    await processPaymentWebhook(raw, p.sign(raw));
    if (order?.offerSnapshot) {
      const invoice = JSON.stringify({
        eventId: `evt_mock_invoice_${session}`,
        type: 'invoice.paid',
        rawType: 'invoice.paid',
        subscriptionId,
        invoiceId: `in_mock_${session}`,
        amountTotal: order.offerSnapshot.monthlyCents,
        currency: 'eur',
        billingReason: 'subscription_create',
        metadata,
      });
      await processPaymentWebhook(invoice, p.sign(invoice));
      redirect(`/verlaengern/${customer.accessToken}`);
    }
    redirect('/');
  }
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Testmodus</p>
        <h1 className="mb-4 text-2xl font-semibold">Test-Abo abschließen</h1>
        <form action={confirm}>
          <button className="rounded-[8px] bg-brand-600 px-5 py-3 font-semibold text-white">Abo simulieren</button>
        </form>
      </PublicCard>
    </PublicShell>
  );
}
