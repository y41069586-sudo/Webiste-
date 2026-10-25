import Link from 'next/link';
import { v4Offer, v4FirstYearCents, V4_TIERS, formatEuroShort } from '@wbm/core';

export function V4PriceCards() {
  return (
    <section aria-label="Tarife" className="grid gap-6 md:grid-cols-2">
      {V4_TIERS.map((tier) => {
        const offer = v4Offer(tier);
        return (
          <article key={tier} className="card-site flex flex-col p-7 sm:p-9">
            <h2 className="text-xl font-semibold">SeitenWerk {tier === 'basis' ? 'Basis' : 'Care+'}</h2>
            <p className="mt-3 text-[#5b6475]">
              {tier === 'basis'
                ? 'Ihre professionelle Website – einfach und zuverlässig online.'
                : 'Ihre Website – wir kümmern uns auch danach darum.'}
            </p>
            <p className="mt-6 text-4xl font-semibold">
              {formatEuroShort(offer.setupCents)} <span className="text-base font-normal">einmalig</span>
            </p>
            <p className="mt-2 text-xl">+ {formatEuroShort(offer.monthlyCents)}/Monat insgesamt ab Go-Live</p>
            <ul className="my-6 flex-1 space-y-3 text-sm">
              <li>Individuelle Website, Standard-Domain und zwei Änderungsrunden</li>
              <li>Hosting, SSL und Basis-Support bei Betriebsstörungen</li>
              <li>Monatlich kündbar, keine zwölfmonatige Mindestbindung</li>
              {tier === 'care_plus' ? (
                <>
                  <li>Technik-Check, Monitoring und persönlicher Support</li>
                  <li>Bis zu 60 Minuten kleine Inhaltsänderungen pro Monat; kein Übertrag ungenutzter Minuten</li>
                  <li>Größere Umbauten nur nach gesondertem Angebot</li>
                </>
              ) : null}
            </ul>
            <p className="text-sm text-[#5b6475]">
              Erstes volles Betriebsjahr: {formatEuroShort(v4FirstYearCents(tier))} bei zwölf berechneten Monaten. Care+ enthält
              das Basis-Hosting vollständig.
            </p>
            <Link href="/kontakt" className="btn-site btn-primary mt-6">
              Zu {tier === 'basis' ? 'Basis' : 'Care+'} anfragen
            </Link>
          </article>
        );
      })}
      <p className="text-sm text-[#5b6475] md:col-span-2">
        Die Monatsgebühr beginnt erst nach dem bestätigten Go-Live über das beim Kauf ausdrücklich vereinbarte Zahlungsmittel.
        Steuerstatus und verbindliche Steuerangaben sind noch zu klären; der echte Verkauf bleibt gesperrt. Keine Zahlung durch
        bloßes Ansehen einer Demo.
      </p>
    </section>
  );
}
