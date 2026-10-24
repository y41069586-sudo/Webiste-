import Link from 'next/link';
import { getConfig } from '@wbm/core';
import { ExamplesCarousel } from '@/components/site/examples';
import { HeroBuild } from '@/components/site/hero-build';
import { PriceCards } from '@/components/site/price-cards';
import { Arrow, Check, DarkBand, delay, ICONS, SectionHead, t } from '@/components/site/section';
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
  const cfg = await getConfig();
  const p = sitePricing(cfg);
  return (
    <>
      {/* Hero: asymmetrisch – große Aussage links, Collage Mitte/rechts, kurzer Text mit Button unten rechts */}
      <section className="mx-auto max-w-[90rem] px-5 pt-10 pb-20 sm:px-8 sm:pt-16 lg:pb-28">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-6">
          <div className="lg:pt-10">
            <p className="build font-tight text-nav text-[#555555]">Für Betriebe in {cfg.sender.city} ohne eigene Website</p>
            <h1 style={t(60)} className="build text-hero mt-4 max-w-[11ch] text-[#222222]">
              Ihre Website ist schon fertig.
            </h1>
          </div>
          <HeroBuild />
        </div>
        <div className="mt-10 grid gap-6 lg:mt-4 lg:grid-cols-[1fr_1.15fr] lg:gap-6">
          <div className="hidden lg:block" />
          <div style={t(900)} className="build max-w-[46ch] lg:ml-auto">
            <p className="text-[1.0625rem] leading-relaxed text-[#333333]">
              Wir bauen Ihrem Betrieb einen fertigen Website-Entwurf und schicken ihn per Brief. Gefällt er Ihnen, geht er auf
              Ihrer eigenen Domain online – ohne Termin und ohne Verkaufsgespräch.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/so-funktionierts" className="btn-site btn-primary btn-compact">
                So funktioniert’s <Arrow />
              </Link>
              <Link href="/preise" className="btn-site btn-secondary">
                Preise
              </Link>
            </div>
            <p className="font-tight text-nav mt-5 text-[#555555]">
              {p.oneTime} einmalig{p.monthlyEnabled ? ` oder ${p.monthly}/Monat (${p.minTerm} Monate Mindestlaufzeit)` : ''}
              {p.guarantee ? ` · ${p.guarantee.days} Tage Garantie` : ''}
            </p>
          </div>
        </div>
      </section>

      {/* Drei Schritte auf dunklem Band */}
      <section className="bg-[#222222] text-white">
        <div className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 sm:py-28">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-end">
            <h2 data-reveal className="text-section max-w-[16ch]">
              Drei Schritte. Kein Termin.
            </h2>
            <p data-reveal style={delay(100)} className="max-w-[44ch] leading-relaxed text-[#dddddd]">
              Sie müssen nichts vorbereiten. Den Entwurf gibt es schon, bevor wir uns kennen.
            </p>
          </div>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-[8px] bg-[#333333] md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} data-reveal style={delay(i * 120)} className="bg-[#222222] p-7 sm:p-9">
                <span className="grid h-11 w-11 place-items-center rounded-[4px] bg-white text-[#222222]">{s.icon}</span>
                <p className="font-tight text-nav mt-8 text-[#bbbbbb]">Schritt {i + 1}</p>
                <h3 className="mt-1 text-[1.75rem] font-semibold tracking-[-0.04em]">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-[#dddddd]">{s.text}</p>
              </li>
            ))}
          </ol>
          <p data-reveal className="mt-10">
            <Link href="/so-funktionierts" className="btn-site btn-compact bg-white text-[#333333]">
              Der Ablauf im Detail <Arrow />
            </Link>
          </p>
        </div>
      </section>

      {/* Beispiele: Bilder liefern die Farbe */}
      <section className="mx-auto max-w-[90rem] px-5 py-20 sm:px-8 sm:py-28">
        <SectionHead title="Beispiele je Branche.">
          Erfundene Musterbetriebe, damit Sie sehen, wie ein Entwurf aussieht. Ihr Entwurf nutzt Ihre eigenen Angaben.
        </SectionHead>
        <div data-reveal style={delay(120)} className="mt-12">
          <ExamplesCarousel />
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
          className="card-site mt-12 grid gap-x-10 gap-y-4 p-7 text-[#333333] sm:grid-cols-2 sm:p-10 lg:grid-cols-4"
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
        <Link href="/kontakt" className="btn-site btn-compact bg-white text-[#333333]">
          Kontakt aufnehmen <Arrow />
        </Link>
        <Link href="/ueber-mich" className="btn-site border border-white/40 text-white">
          Wer steckt dahinter?
        </Link>
      </DarkBand>
    </>
  );
}
