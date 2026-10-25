import { getSiteConfig } from '@/lib/site-config';
import Link from 'next/link';
import { ExampleStage, ExamplesGrid } from '@/components/site/examples';
import { PriceCards } from '@/components/site/price-cards';
import { Arrow, Check, DarkBand, delay, ICONS, SectionHead } from '@/components/site/section';
import { sitePricing } from '@/lib/site';

export const metadata = {
  title: { absolute: 'Seitenwerk – fertige Websites für lokale Betriebe' },
  description:
    'Wir bauen lokalen Betrieben ohne Website einen fertigen Entwurf. Gefällt er, geht er auf Ihrer eigenen Domain online.',
};

const STEPS = [
  { icon: ICONS.letter, title: 'Brief', text: 'Sie bekommen Post mit einem QR-Code zu Ihrem fertigen Website-Entwurf.' },
  { icon: ICONS.demo, title: 'Entwurf', text: 'Sie sehen sich den Entwurf auf dem Handy an – in Ruhe, ohne Anmeldung.' },
  {
    icon: ICONS.online,
    title: 'Online',
    text: 'Gefällt er Ihnen, ergänzen Sie Ihre Angaben, und er geht auf Ihrer Domain live.',
  },
];

export default async function Home() {
  const cfg = await getSiteConfig();
  const p = sitePricing(cfg);
  return (
    <>
      <section className="site-premium-hero mx-auto max-w-[90rem] px-5 py-14 sm:px-8 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.2fr]">
          <div>
            <p className="text-sm font-medium tracking-wide text-[#5b6475]">Websites für lokale Betriebe</p>
            <h1 className="mt-5 max-w-[12ch] text-[clamp(3.1rem,6vw,6rem)] font-semibold leading-[1.02] tracking-[-.065em] text-[#0f172a]">
              Erst sehen.
              <br />
              <span className="text-[#1f4fd8]">Dann entscheiden.</span>
            </h1>
            <p className="mt-7 max-w-[38ch] text-lg leading-relaxed text-[#3c4454]">
              Ihr eigener Website-Entwurf, bevor Sie etwas kaufen. Für Ihren Betrieb gestaltet, kostenlos anzusehen und ohne
              Anmeldung.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/beispiele" className="btn-site btn-primary">
                Website-Beispiele ansehen <Arrow />
              </Link>
              <Link href="/preise" className="btn-site btn-secondary">
                Preise & Leistungen
              </Link>
            </div>
            <p className="mt-6 max-w-[44ch] text-sm leading-relaxed text-[#5b6475]">
              {p.oneTime} einmalig
              {p.version === 'v4' ? ` + ${p.basis} Basis oder insgesamt ${p.carePlus} Care+ pro Monat ab Go-Live` : ''}.
              Schriftlich bestellen und abstimmen – ohne Verkaufsgespräch.
            </p>
          </div>
          <ExampleStage />
        </div>
      </section>
      <section className="mx-auto max-w-[90rem] px-5 pb-20 sm:px-8 sm:pb-28">
        <SectionHead title="Ein guter Entwurf zeigt, was möglich ist.">
          Handwerk, Studio, Restaurant oder Geschäft: Gestaltung und Aufbau passen zur Branche. Diese Muster sind fiktiv; Ihr
          persönlicher Entwurf verwendet die bekannten Angaben Ihres Betriebs.
        </SectionHead>
        <div className="mt-12">
          <ExamplesGrid limit={2} />
          <Link href="/beispiele" className="btn-site btn-secondary mt-8">
            Alle fünf Branchen ansehen <Arrow />
          </Link>
        </div>
      </section>

      {/* Drei Schritte */}
      <section className="bg-[#f7f8fa]">
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-end">
            <h2 data-reveal className="text-section max-w-[16ch] text-[#0f172a]">
              Drei Schritte. Kein Termin.
            </h2>
            <p data-reveal style={delay(100)} className="max-w-[44ch] leading-relaxed text-[#3c4454]">
              Zum Ansehen brauchen Sie keine Anmeldung. Für die Veröffentlichung ergänzen Sie anschließend Ihre tatsächlichen
              Inhalte.
            </p>
          </div>
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal style={delay(i * 120)} className="card-site card-hover p-7 sm:p-9">
                <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-[#eef3ff] text-[#1f4fd8]">{s.icon}</span>
                <p className="font-tight text-nav mt-8 text-[#5b6475]">Schritt {i + 1}</p>
                <h3 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em] text-[#0f172a]">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-[#3c4454]">{s.text}</p>
              </li>
            ))}
          </ol>
          <p data-reveal className="mt-10">
            <Link href="/so-funktionierts" className="btn-site btn-compact bg-white text-[#3c4454]">
              Der Ablauf im Detail <Arrow />
            </Link>
          </p>
        </div>
      </section>

      {/* Leistungsumfang */}
      <section className="mx-auto max-w-[90rem] px-5 pb-20 sm:px-8 sm:pb-28">
        <SectionHead title="Alles drin, was eine Website braucht.">
          Gebaut für das Handy, schnell geladen und mit Ihren echten Angaben. Texte und Leistungen passen wir mit Ihnen an, bevor
          die Seite online geht.
        </SectionHead>
        <ul
          data-reveal
          style={delay(120)}
          className="card-site mt-12 grid gap-x-10 gap-y-4 p-7 text-[#3c4454] sm:grid-cols-2 sm:p-10 lg:grid-cols-4"
        >
          <Check>Eigene Domain inklusive</Check>
          <Check>Hosting und SSL inklusive</Check>
          <Check>Für Handy, Tablet und Computer</Check>
          <Check>Anfrageformular an Ihre E-Mail</Check>
          <Check>Öffnungszeiten, Anfahrt, Kontakt</Check>
          <Check>Bis zu zwei Änderungsrunden vor dem Start</Check>
          <Check>Impressum und Datenschutz mit Ihren Angaben</Check>
          <Check>Kein Baukasten, den Sie selbst pflegen müssen</Check>
        </ul>
      </section>

      {/* Preise */}
      <section className="mx-auto max-w-[90rem] px-5 pb-20 sm:px-8 sm:pb-28">
        <SectionHead title="Offene Preise.">
          Zwei Wege, beide gleich viel wert. Sie entscheiden, was besser zu Ihnen passt.
        </SectionHead>
        <div className="mt-12">
          <PriceCards p={p} />
        </div>
      </section>

      <DarkBand
        title="Fragen? Schreiben Sie mir direkt."
        text={`Persönlich, ohne Callcenter.${p.guarantee ? ` Und mit ${p.guarantee.days} Tagen Zufriedenheitsgarantie nach dem Start.` : ''}`}
      >
        <Link href="/kontakt" className="btn-site btn-compact bg-white text-[#3c4454]">
          Kontakt aufnehmen <Arrow />
        </Link>
        <Link href="/ueber-mich" className="btn-site btn-secondary">
          Wer steckt dahinter?
        </Link>
      </DarkBand>
    </>
  );
}
