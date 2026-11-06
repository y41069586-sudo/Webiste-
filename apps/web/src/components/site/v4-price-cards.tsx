import Link from 'next/link';
import { v4Offer, v4FirstYearCents, v4TierLabel, formatEuroShort, type V4Tier } from '@wbm/core';

export function V4PriceCards({ tiers }: { tiers: V4Tier[] }) {
  return (
    <section aria-label="Tarife" className="grid gap-6 md:grid-cols-2">
      {tiers.map((tier) => {
        const offer = v4Offer(tier);
        return (
          <article key={tier} className="card-site flex flex-col p-7 sm:p-9">
            {tier === 'basis' && tiers.includes('komplett') ? (
              <p className="mb-3 inline-flex w-fit rounded-full bg-[#111827] px-3 py-1 text-xs font-semibold text-white">
                Empfohlen
              </p>
            ) : null}
            <h2 className="text-xl font-semibold">SeitenWerk {v4TierLabel(tier)}</h2>
            <p className="mt-3 text-[#5b6475]">
              {tier === 'basis'
                ? 'Ihre professionelle Website – einfach und zuverlässig online.'
                : tier === 'komplett'
                  ? 'Ohne Einrichtungsgebühr – bei der Bestellung zahlen Sie 0 €.'
                  : 'Ihre Website – wir kümmern uns auch danach darum.'}
            </p>
            {tier === 'komplett' ? (
              <>
                <p className="mt-6 text-4xl font-semibold">
                  {formatEuroShort(offer.monthlyCents)} <span className="text-base font-normal">pro Monat</span>
                </p>
                <p className="mt-2 text-xl">0 € Einrichtung · erste Abbuchung 7 Tage nach Bestellung</p>
              </>
            ) : (
              <>
                <p className="mt-6 text-4xl font-semibold">
                  {formatEuroShort(offer.setupCents)} <span className="text-base font-normal">einmalig</span>
                </p>
                <p className="mt-2 text-xl">+ {formatEuroShort(offer.monthlyCents)}/Monat insgesamt ab Go-Live</p>
              </>
            )}
            <ul className="my-6 flex-1 space-y-3 text-sm">
              <li>Individuelle Website, Standard-Domain und zwei Änderungsrunden</li>
              <li>Hosting, SSL und Basis-Support bei Betriebsstörungen</li>
              <li>
                {tier === 'komplett'
                  ? '12 Monate Mindestlaufzeit ab der ersten Abbuchung, danach monatlich kündbar'
                  : 'Monatlich kündbar, keine zwölfmonatige Mindestbindung'}
              </li>
              {tier === 'komplett' ? (
                <>
                  <li>Regelmäßige Änderungen: bis zu 60 Minuten pro Monat, kein Übertrag</li>
                  <li>Lokale Auffindbarkeit: Seitentitel, Beschreibungen und Firmendaten für die Suche gepflegt</li>
                  <li>Bevorzugter Support – Ihre Anfragen zuerst</li>
                </>
              ) : null}
              {tier === 'care_plus' ? (
                <>
                  <li>Technik-Check, Monitoring und persönlicher Support</li>
                  <li>Bis zu 60 Minuten kleine Inhaltsänderungen pro Monat; kein Übertrag ungenutzter Minuten</li>
                  <li>Größere Umbauten nur nach gesondertem Angebot</li>
                </>
              ) : null}
            </ul>
            <p className="text-sm text-[#5b6475]">
              {tier === 'komplett'
                ? `Erstes Jahr: ${formatEuroShort(offer.monthlyCents * 12)} (12 × ${formatEuroShort(offer.monthlyCents)}), keine Einrichtungsgebühr.`
                : `Erstes volles Betriebsjahr: ${formatEuroShort(v4FirstYearCents(tier))} bei zwölf berechneten Monaten.${tier === 'care_plus' ? ' Care+ enthält das Basis-Hosting vollständig.' : ''}`}
            </p>
            <Link href="/kontakt" className="btn-site btn-primary mt-6">
              Zu {v4TierLabel(tier)} anfragen
            </Link>
          </article>
        );
      })}
      <p className="text-sm text-[#5b6475] md:col-span-2">
        {tiers.includes('komplett')
          ? 'Basis: Die Monatsgebühr beginnt erst nach dem bestätigten Go-Live. Komplett: Die erste Monatsgebühr wird 7 Tage nach der Bestellung abgebucht. Beides über das beim Kauf ausdrücklich vereinbarte Zahlungsmittel.'
          : 'Die Monatsgebühr beginnt erst nach dem bestätigten Go-Live über das beim Kauf ausdrücklich vereinbarte Zahlungsmittel.'}
        Steuerstatus und verbindliche Steuerangaben sind noch zu klären; der echte Verkauf bleibt gesperrt. Keine Zahlung durch
        bloßes Ansehen einer Demo.
      </p>
    </section>
  );
}
