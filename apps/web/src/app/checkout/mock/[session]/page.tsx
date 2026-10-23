import { notFound } from 'next/navigation';
import { formatEuro, getConfig, mockCheckoutInfo } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';
import { mockPayAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Testzahlung', robots: { index: false, follow: false } };

/** Simulierte Bezahlseite (nur PAYMENT_PROVIDER=mock außerhalb der Produktion). */
export default async function MockCheckoutPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const info = await mockCheckoutInfo(session);
  if (!info) notFound();
  const cfg = await getConfig();
  const btn = 'w-full rounded-xl px-4 py-3 text-left font-medium shadow-sm';
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Testmodus – keine echte Zahlung
        </p>
        <h1 className="mb-1 text-2xl font-semibold">Testzahlung</h1>
        <p className="mb-6 text-slate-600">
          {info.order.plan === 'monthly' ? cfg.pricing.monthlyName : cfg.pricing.packageName} ·{' '}
          {formatEuro(info.order.amountCents)}
          {info.order.plan === 'monthly' ? ' pro Monat' : ''} · {info.order.domainWish}
        </p>
        <form action={mockPayAction.bind(null, session)} className="space-y-3">
          <button name="outcome" value="paid" className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>
            Erfolgreich bezahlen (Karte)
          </button>
          <button name="outcome" value="sepa_processing" className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}>
            Lastschrift – Zahlung in Bearbeitung
          </button>
          <button name="outcome" value="sepa_failed" className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}>
            Lastschrift – Zahlung fehlgeschlagen
          </button>
          <button name="outcome" value="cancel" className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}>
            Abbrechen
          </button>
        </form>
      </PublicCard>
    </PublicShell>
  );
}
