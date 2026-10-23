import type { Metadata } from 'next';
import { checkoutAvailability, demoUrl, formatEuro, getCheckoutContext, getConfig, priceTaxSuffix } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';
import { CheckoutForm, type PlanOffer } from './checkout-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Website bestellen', robots: { index: false, follow: false } };

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ abgebrochen?: string; plan?: string }>;
}) {
  const { slug } = await params;
  const { abgebrochen, plan: chosenPlan } = await searchParams;
  const cfg = await getConfig();
  const ctx = await getCheckoutContext(slug);

  if (ctx.state !== 'ok') {
    const text =
      ctx.state === 'ordered'
        ? 'Für diesen Entwurf liegt bereits eine Bestellung vor. Den Link für Ihre Angaben zur Website haben wir per E-Mail geschickt.'
        : ctx.state === 'disabled'
          ? `${ctx.reason} Schreiben Sie uns gern an ${cfg.sender.email}.`
          : `Dieser Entwurf ist nicht mehr verfügbar. Bei Fragen erreichen Sie uns unter ${cfg.sender.email}.`;
    return (
      <PublicShell company={cfg.sender.company}>
        <PublicCard>
          <h1 className="mb-3 text-2xl font-semibold">
            {ctx.state === 'ordered' ? 'Bereits bestellt' : 'Bestellung nicht möglich'}
          </h1>
          <p className="text-slate-700">{text}</p>
        </PublicCard>
      </PublicShell>
    );
  }

  const mode = checkoutAvailability();
  const { lead, demo, price, monthly } = ctx;
  const p = cfg.pricing;
  const months = p.hostingMonthsIncluded;
  const care = `${formatEuro(p.subscriptionCents)}/Monat`;
  const tax = priceTaxSuffix(cfg);
  const plans: PlanOffer[] = [
    {
      id: 'one_time',
      title: 'Einmalzahlung',
      price: price.label,
      unit: tax ? `einmalig ${tax}` : 'einmalig',
      buttonLabel: price.label,
      points: [
        `Eigene Domain und ${months} Monate Hosting inklusive`,
        `Danach optional „${p.subscriptionName}“ für ${care}, monatlich kündbar`,
      ],
    },
    ...(monthly
      ? [
          {
            id: 'monthly' as const,
            title: 'Monatlich',
            price: monthly.label,
            unit: tax ? `pro Monat ${tax}` : 'pro Monat',
            buttonLabel: `${monthly.label} pro Monat`,
            points: [
              `${p.minTermMonths} Monate Mindestlaufzeit`,
              `Ab Monat ${p.minTermMonths + 1} nur noch ${care}, dann monatlich kündbar`,
              'Eigene Domain und Hosting inklusive',
            ],
          },
        ]
      : []),
  ];
  const guaranteeNote = cfg.guarantee.enabled
    ? `${cfg.guarantee.days} Tage Zufriedenheitsgarantie: Gefällt Ihnen die Website nicht, bekommen Sie Ihr Geld zurück${monthly ? ' (bei monatlicher Zahlung endet der Vertrag sofort)' : ''}.`
    : null;
  const minTermNote = monthly
    ? `Monatliche Zahlung: ${monthly.label} pro Monat, Mindestlaufzeit ${p.minTermMonths} Monate, ab Monat ${p.minTermMonths + 1} ${care}, dann monatlich kündbar.`
    : null;
  return (
    <PublicShell company={cfg.sender.company} wide>
      {mode.ok && mode.mode !== 'live' ? (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Testmodus: Es wird keine echte Zahlung ausgelöst
          {mode.mode === 'mock' ? ' (simulierte Bezahlseite)' : ' (Stripe-Testumgebung)'}.
        </div>
      ) : null}
      {abgebrochen ? (
        <div role="status" className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Die Zahlung wurde abgebrochen – es wurde nichts berechnet. Sie können die Bestellung jederzeit erneut abschließen.
        </div>
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Ihre Website übernehmen</h1>
          <p className="mt-2 mb-6 text-slate-600">
            Wählen Sie, wie Sie zahlen möchten – beide Optionen enthalten dasselbe. Danach Rechnungsadresse und Wunschdomain
            angeben und bezahlen; anschließend tragen Sie Ihre Angaben für Impressum, Leistungen und Öffnungszeiten ein.
          </p>
          <PublicCard>
            <CheckoutForm
              slug={slug}
              prefill={ctx.prefill}
              plans={plans}
              initialPlan={plans.some((x) => x.id === chosenPlan) ? (chosenPlan as PlanOffer['id']) : null}
              guaranteeNote={guaranteeNote}
              minTermNote={minTermNote}
              termsVersion={cfg.legal.termsVersion}
            />
          </PublicCard>
        </div>
        <aside aria-label="Ihre Bestellung" className="lg:pt-14">
          <PublicCard className="lg:sticky lg:top-6">
            <h2 className="text-base font-semibold">{cfg.pricing.packageName}</h2>
            <p className="mt-1 text-sm text-slate-600">für {lead.businessName}</p>
            {demo.screenshotDesktopKey ? (
              <a
                href={demoUrl(`/d/${slug}`)}
                className="mt-4 block overflow-hidden rounded-lg border border-slate-200"
                title="Entwurf ansehen"
              >
                <img
                  src={`/d/${slug}/vorschau.jpg`}
                  alt="Vorschau Ihres Website-Entwurfs"
                  width={720}
                  height={450}
                  className="h-auto w-full"
                />
              </a>
            ) : null}
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                'Ihre Website auf Basis des Entwurfs – mit Ihren Texten, Leistungen und Öffnungszeiten',
                'Eigene Domain, registriert auf Ihren Namen',
                'Hosting mit SSL',
                `Bis zu ${cfg.onboarding.includedChangeRounds} Änderungsrunden vor dem Start`,
                'Kontaktformular, das an Ihre E-Mail-Adresse geht',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden="true" className="text-emerald-600">
                    ✓
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Einmalzahlung</span>
                <span className="font-semibold">{price.label}</span>
              </div>
              {monthly ? (
                <div className="flex justify-between gap-3">
                  <span>
                    Monatlich
                    <span className="block text-xs text-slate-500">
                      {p.minTermMonths} Monate Mindestlaufzeit, danach {care}
                    </span>
                  </span>
                  <span className="font-semibold whitespace-nowrap">{monthly.label}/Monat</span>
                </div>
              ) : null}
              <p className="pt-1 text-xs text-slate-500">
                {price.vatCents
                  ? `inkl. ${cfg.tax.vatRatePercent} % Umsatzsteuer (${formatEuro(price.vatCents)} bei Einmalzahlung).`
                  : cfg.tax.kleinunternehmerNote}{' '}
                Keine versteckten Kosten.
              </p>
            </div>
          </PublicCard>
        </aside>
      </div>
    </PublicShell>
  );
}
