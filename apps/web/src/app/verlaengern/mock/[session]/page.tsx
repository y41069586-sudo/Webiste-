import { notFound, redirect } from 'next/navigation';
import { checkoutAvailability, getConfig, getProviders, MockPayment, processPaymentWebhook, randomToken } from '@wbm/core';
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
    const raw = JSON.stringify({
      eventId: `evt_mock_${randomToken(16)}`,
      type: 'checkout.completed',
      rawType: 'checkout.session.completed',
      sessionId: session,
      mode: 'subscription',
      subscriptionId: `sub_mock_${randomToken(12)}`,
      metadata: { kind: 'subscription', customerId: ref },
    });
    await processPaymentWebhook(raw, p.sign(raw));
    redirect('/');
  }
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">Testmodus</p>
        <h1 className="mb-4 text-2xl font-semibold">Test-Abo abschließen</h1>
        <form action={confirm}>
          <button className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white">Abo simulieren</button>
        </form>
      </PublicCard>
    </PublicShell>
  );
}
