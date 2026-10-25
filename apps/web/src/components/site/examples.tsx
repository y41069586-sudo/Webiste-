import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { INDUSTRY_EXAMPLES } from '@/lib/site';
import { Arrow } from './section';

const n = INDUSTRY_EXAMPLES.length;
// Drei Durchläufe, damit die Treppe auch am Ende einer Schleife bis unten reicht
const rows = [...INDUSTRY_EXAMPLES, ...INDUSTRY_EXAMPLES, ...INDUSTRY_EXAMPLES];

/**
 * Hero-Treppe: Beispiel-Websites erfundener Betriebe, je Reihe Vorschau + Farbfeld, diagonal versetzt
 * (Felder Ecke an Ecke, die Streifen bilden eine Linie). Läuft langsam nach rechts oben – reines CSS, nur
 * transform. `head` sitzt oben links, `children` unten rechts in den freien Ecken. Anhalten per Hover oder
 * Schalter (WCAG 2.2.2), bei reduzierter Bewegung steht sie still. Die Bilder sind Dekoration.
 */
export function ExamplesCascade({ head, children }: { head: ReactNode; children?: ReactNode }) {
  return (
    <div className="cascade">
      <div className="cascade-head">{head}</div>
      <div className="cascade-stage" style={{ '--n': n } as CSSProperties}>
        <p className="sr-only">
          Beispiel-Websites erfundener Betriebe: {INDUSTRY_EXAMPLES.map((ex) => `${ex.name} (${ex.label})`).join(', ')}.
        </p>
        <div className="cascade-track" aria-hidden="true">
          {rows.map((ex, i) => (
            <div key={i} className="cascade-row" style={{ '--i': i } as CSSProperties}>
              <div className="cascade-shot">
                <img
                  src={`/beispiele/${ex.id}-karte.webp`}
                  alt=""
                  width={960}
                  height={600}
                  loading={i < 6 ? 'eager' : 'lazy'}
                  fetchPriority={i < 3 ? 'high' : undefined}
                  decoding="async"
                  draggable={false}
                />
                <span className="font-tight absolute top-2 left-2 rounded-[4px] bg-white/95 px-1.5 py-0.5 text-[0.7rem] font-medium text-[#0f172a] sm:top-3 sm:left-3 sm:px-2 sm:py-1 sm:text-xs">
                  Beispiel
                </span>
              </div>
              <div className="cascade-panel" style={{ background: ex.color }}>
                <span className="cascade-name">{ex.name}</span>
                <span className="cascade-label">{ex.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="cascade-foot">
        {children}
        <label className="font-tight mt-5 inline-flex cursor-pointer items-center gap-2 rounded-[4px] border border-[#e3e7ee] bg-white px-2.5 py-1.5 text-xs font-medium text-[#3c4454] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#1f4fd8]">
          <input type="checkbox" className="cascade-pause h-3.5 w-3.5 accent-[#1f4fd8]" />
          Bewegung anhalten
        </label>
      </div>
    </div>
  );
}

/** Statische Übersicht der Beispiele (Seite „Beispiele“): große Vorschau, Farbfeld-Kante, Name, Branche, Aufhänger. */
export function ExamplesGrid({ limit }: { limit?: number } = {}) {
  return (
    <ul aria-label="Beispiel-Websites je Branche" className="grid gap-x-6 gap-y-12 md:grid-cols-2">
      {INDUSTRY_EXAMPLES.slice(0, limit).map((ex, i) => (
        <li key={ex.id} data-reveal style={{ '--d': `${(i % 2) * 90}ms` } as CSSProperties}>
          <a
            href={`/beispiele/${ex.id}.html`}
            className="tile relative block aspect-[16/10]"
            style={{ borderBottom: `6px solid ${ex.color}` }}
            aria-label={`${ex.label}: fiktive Musterwebsite ansehen`}
          >
            <img
              src={`/beispiele/${ex.id}-karte.webp`}
              alt={`Beispiel-Website für einen erfundenen Betrieb „${ex.name}“ (${ex.label})`}
              width={960}
              height={600}
              loading="lazy"
              decoding="async"
              className="block h-full w-full object-cover object-top"
            />
            <span className="font-tight absolute top-3 left-3 rounded-[4px] bg-white px-2 py-1 text-xs font-medium text-[#0f172a]">
              Beispiel
            </span>
          </a>
          <p className="mt-4 flex items-baseline justify-between gap-4">
            <span className="text-strong text-[#0f172a]">{ex.name}</span>
            <span className="font-tight text-nav text-[#5b6475]">{ex.label} · erfunden</span>
          </p>
          <p className="mt-1 text-sm text-[#5b6475]">{ex.hook}</p>
          <a
            href={`/beispiele/${ex.id}.html`}
            className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#1f4fd8] underline underline-offset-4"
          >
            Musterwebsite ansehen <Arrow />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Calm product presentation: actual rendered sample pages, no invented customer portfolio. */
export function ExampleStage() {
  return (
    <div className="site-example-stage">
      <div className="site-example-stage-head">
        <span className="flex gap-1" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>Ein Entwurf. Viele Möglichkeiten.</span>
      </div>
      <a href="/beispiele/handwerk.html" className="block" aria-label="Musterwebsite für Handwerk ansehen">
        <img
          src="/beispiele/handwerk-karte.webp"
          alt="Fiktiver Handwerksbetrieb – tatsächlich gerenderte Website-Vorschau"
          width="960"
          height="600"
          fetchPriority="high"
          className="block w-full"
        />
      </a>
      <div className="site-example-stage-foot">
        <span>Handwerk · fiktives Beispiel</span>
        <Link href="/beispiele">
          Alle fünf Branchen <Arrow />
        </Link>
      </div>
    </div>
  );
}
