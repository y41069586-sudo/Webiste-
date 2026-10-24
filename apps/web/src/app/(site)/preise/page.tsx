import Link from 'next/link';
import { getConfig } from '@wbm/core';
import { PriceToggle, type PlanView } from '@/components/site/price-toggle';
import { DarkBand, PageIntro } from '@/components/site/section';
import { sitePricing } from '@/lib/site';

export const metadata = { title: 'Preise', description: 'Einmalig oder monatlich – offene Endpreise ohne Einrichtungsgebühr.' };

export default async function PricesPage() {
  const cfg = await getConfig();
  const p = sitePricing(cfg);
  const plans: PlanView[] = [
    {
      key: 'one_time',
      label: 'Einmalig',
      price: p.oneTime,
      unit: 'einmalig',
      note: `Website, Domain und ${p.hostingMonths} Monate Hosting – einmal bezahlt.`,
      points: [
        'Fertige Website mit Ihren Angaben',
        `Eigene Domain und ${p.hostingMonths} Monate Hosting inklusive`,
        'Bis zu zwei Änderungsrunden vor dem Start',
        `Danach optional „Hosting & Pflege“ für ${p.follow}/Monat, monatlich kündbar`,
      ],
    },
    ...(p.monthlyEnabled
      ? [
          {
            key: 'monthly' as const,
            label: 'Monatlich',
            price: p.monthly,
            unit: 'pro Monat',
            note: `${p.minTerm} Monate Mindestlaufzeit, erste Rate beim Kauf.`,
            points: [
              'Fertige Website mit Ihren Angaben',
              'Eigene Domain und Hosting inklusive',
              'Bis zu zwei Änderungsrunden vor dem Start',
              `Ab Monat ${p.followFromMonth} nur noch ${p.follow}/Monat, dann monatlich kündbar`,
            ],
          },
        ]
      : []),
  ];
  return (
    <>
      <PageIntro eyebrow="Preise" title="Offene Preise. Zwei Wege, beide gleich viel wert.">
        Keine Einrichtungsgebühr, keine versteckten Kosten. Bezahlt wird erst, wenn Sie Ihren fertigen Entwurf gesehen haben und
        ihn übernehmen möchten.
      </PageIntro>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 pb-6">
        <PriceToggle plans={plans} cta={{ href: '/so-funktionierts', label: 'So kommen Sie zu Ihrer Website' }} />
      </section>
      <section className="mx-auto max-w-[90rem] px-5 sm:px-8 py-16">
        <h2 data-reveal className="text-section text-[#222222]">
          Beide Wege im Vergleich
        </h2>
        <div data-reveal className="card-site mt-6 overflow-x-auto">
          <table className="w-full text-left text-[0.95rem]">
            <caption className="sr-only">Vergleich der Zahlweisen</caption>
            <thead>
              <tr className="border-b border-slate-100 text-sm text-slate-600">
                <th scope="col" className="p-4 font-medium" />
                <th scope="col" className="p-4 font-semibold tracking-[-0.03em] text-[#222222]">
                  Einmalig
                </th>
                {p.monthlyEnabled ? (
                  <th scope="col" className="p-4 font-semibold tracking-[-0.03em] text-[#222222]">
                    Monatlich
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <th scope="row" className="p-4 font-medium text-slate-600">
                  Beim Kauf
                </th>
                <td className="p-4">{p.oneTime}</td>
                {p.monthlyEnabled ? <td className="p-4">{p.monthly} (erste Rate)</td> : null}
              </tr>
              <tr>
                <th scope="row" className="p-4 font-medium text-slate-600">
                  Monat 2 bis {p.minTerm}
                </th>
                <td className="p-4">0 € (Hosting inklusive)</td>
                {p.monthlyEnabled ? <td className="p-4">{p.monthly}/Monat</td> : null}
              </tr>
              <tr>
                <th scope="row" className="p-4 font-medium text-slate-600">
                  Ab Monat {p.followFromMonth}
                </th>
                <td className="p-4">optional {p.follow}/Monat, monatlich kündbar</td>
                {p.monthlyEnabled ? <td className="p-4">{p.follow}/Monat, monatlich kündbar</td> : null}
              </tr>
              <tr>
                <th scope="row" className="p-4 font-medium text-slate-600">
                  Laufzeit
                </th>
                <td className="p-4">keine</td>
                {p.monthlyEnabled ? <td className="p-4">{p.minTerm} Monate Mindestlaufzeit</td> : null}
              </tr>
              <tr>
                <th scope="row" className="p-4 font-medium text-slate-600">
                  Zahlung
                </th>
                <td className="p-4">Karte oder SEPA-Lastschrift</td>
                {p.monthlyEnabled ? <td className="p-4">Karte oder SEPA-Lastschrift</td> : null}
              </tr>
            </tbody>
          </table>
        </div>
        <p data-reveal className="mt-4 text-sm leading-relaxed text-slate-600">
          {!cfg.tax.kleinunternehmer
            ? 'Alle Preise zuzüglich gesetzlicher Umsatzsteuer.'
            : 'Endpreise. Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.'}{' '}
          Das Angebot richtet sich an Unternehmen.
          {p.guarantee ? (
            <>
              {' '}
              Mit{' '}
              <Link href="/garantie" className="text-[#222222] underline underline-offset-4">
                {p.guarantee.days} Tagen Zufriedenheitsgarantie
              </Link>
              .
            </>
          ) : null}
        </p>
      </section>
      <DarkBand title="Erst ansehen, dann entscheiden." text="Ihr Entwurf ist fertig, bevor Sie etwas bezahlen.">
        <Link href="/beispiele" className="btn-site btn-primary">
          Beispiele ansehen
        </Link>
        <Link href="/kontakt" className="btn-site btn-secondary">
          Frage stellen
        </Link>
      </DarkBand>
    </>
  );
}
