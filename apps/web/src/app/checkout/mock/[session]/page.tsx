import { notFound } from 'next/navigation';
import { formatEuro, getConfig, mockCheckoutInfo } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';
import { mockPayAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Testzahlung', robots: { index: false, follow: false } };

const field =
  'mt-1 block w-full rounded-[8px] border border-slate-200 bg-white px-3 py-2.5 text-base focus:border-brand-600 focus:outline-none sm:text-sm';

/**
 * Simulierte Bezahlseite (nur PAYMENT_PROVIDER=mock außerhalb der Produktion). Bildet Stripe Checkout nach:
 * Firmenname, Name, E-Mail, Adresse, Telefon, Wunschdomain, „Unternehmer“ und AGB werden hier erfasst.
 */
export default async function MockCheckoutPage({ params }: { params: Promise<{ session: string }> }) {
  const { session } = await params;
  const info = await mockCheckoutInfo(session);
  if (!info) notFound();
  const cfg = await getConfig();
  const o = info.order;
  const addr = (o.billingAddressJson ?? {}) as { street?: string; postalCode?: string; city?: string };
  const btn = 'w-full rounded-[8px] px-4 py-3 text-left font-medium shadow-sm';
  return (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <p className="mb-2 inline-block rounded-[4px] bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
          Testmodus – simuliert Stripe Checkout, keine echte Zahlung
        </p>
        <h1 className="mb-1 text-2xl font-semibold">Testzahlung</h1>
        <p className="mb-6 text-slate-600">
          {o.plan === 'monthly' ? cfg.pricing.monthlyName : cfg.pricing.packageName} · {formatEuro(o.amountCents)}
          {o.plan === 'monthly' ? ` pro Monat · ${cfg.pricing.minTermMonths} Monate Mindestlaufzeit` : ''}
        </p>
        <form action={mockPayAction.bind(null, session)} className="space-y-3">
          {info.hosted ? (
            <fieldset className="mb-6 grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-semibold">Angaben (erfasst Stripe)</legend>
              <label className="text-sm sm:col-span-2">
                Firmenname
                <input name="company" required defaultValue={o.customerCompany} className={field} />
              </label>
              <label className="text-sm">
                Ihr Name
                <input name="name" required className={field} />
              </label>
              <label className="text-sm">
                E-Mail
                <input name="email" type="email" required className={field} />
              </label>
              <label className="text-sm sm:col-span-2">
                Straße und Hausnummer
                <input name="street" required defaultValue={addr.street ?? ''} className={field} />
              </label>
              <label className="text-sm">
                PLZ
                <input name="postalCode" required defaultValue={addr.postalCode ?? ''} className={field} />
              </label>
              <label className="text-sm">
                Ort
                <input name="city" required defaultValue={addr.city ?? ''} className={field} />
              </label>
              <label className="text-sm">
                Telefon
                <input name="phone" className={field} />
              </label>
              <label className="text-sm">
                Wunschdomain
                <input name="domain" required defaultValue={info.domainDefault} className={field} />
              </label>
              <label className="flex gap-2 text-sm sm:col-span-2">
                <input name="b2b" type="checkbox" required className="mt-0.5" /> Bestellung als Unternehmer (§ 14 BGB)
              </label>
              <label className="flex gap-2 text-sm sm:col-span-2">
                <input name="terms" type="checkbox" required className="mt-0.5" /> AGB (Stand {cfg.legal.termsVersion}) gelesen
                und akzeptiert
              </label>
            </fieldset>
          ) : null}
          <button name="outcome" value="paid" className={`${btn} bg-brand-600 text-white hover:bg-brand-700`}>
            Erfolgreich bezahlen (Karte)
          </button>
          <button name="outcome" value="sepa_processing" className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}>
            Lastschrift – Zahlung in Bearbeitung
          </button>
          <button name="outcome" value="sepa_failed" className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}>
            Lastschrift – Zahlung fehlgeschlagen
          </button>
          <button
            name="outcome"
            value="cancel"
            formNoValidate
            className={`${btn} border border-slate-300 bg-white hover:bg-slate-50`}
          >
            Abbrechen
          </button>
        </form>
      </PublicCard>
    </PublicShell>
  );
}
