import type { CSSProperties, ReactNode } from 'react';
import { INDUSTRY_EXAMPLES } from '@/lib/site';

const n = INDUSTRY_EXAMPLES.length;

/**
 * Beispiel-Websites als diagonale Treppe: je Reihe eine Vorschau und ein Farbfeld mit Namen; die Reihen
 * laufen langsam nach rechts oben (zweimal gerendert für die nahtlose Schleife). Reines CSS, nur transform.
 * Überschrift und Text sitzen breit in den freien Ecken. Anhalten per Hover oder Schalter (WCAG 2.2.2),
 * bei reduzierter Bewegung steht sie still. Die Treppe ist Dekoration; die Inhalte stehen in der Liste darunter.
 */
export function ExamplesCascade({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div>
      <div className="cascade">
        <div className="cascade-head">
          <h2 className="text-section text-[#0f172a]">{title}</h2>
        </div>
        <div className="cascade-stage" style={{ '--n': n } as CSSProperties}>
          <div className="cascade-track" aria-hidden="true">
            {[...INDUSTRY_EXAMPLES, ...INDUSTRY_EXAMPLES].map((ex, i) => (
              <div key={i} className="cascade-row" style={{ '--i': i } as CSSProperties}>
                <div className="cascade-shot">
                  <img
                    src={`/beispiele/${ex.id}-karte.webp`}
                    alt=""
                    width={960}
                    height={600}
                    loading={i < 4 ? 'eager' : 'lazy'}
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
          {children ? <div className="leading-relaxed text-[#3c4454]">{children}</div> : null}
          <label className="font-tight mt-4 inline-flex cursor-pointer items-center gap-2 rounded-[4px] border border-[#e3e7ee] bg-white px-2.5 py-1.5 text-xs font-medium text-[#3c4454] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#1f4fd8]">
            <input type="checkbox" className="cascade-pause h-3.5 w-3.5 accent-[#1f4fd8]" />
            Bewegung anhalten
          </label>
        </div>
      </div>
      <ul aria-label="Beispiel-Websites je Branche" className="mt-8 grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-5">
        {INDUSTRY_EXAMPLES.map((ex) => (
          <li key={ex.id} className="border-t border-[#e3e7ee] pt-4">
            <p className="flex items-center gap-2">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px]" style={{ background: ex.color }} />
              <span className="text-strong text-[#0f172a]">{ex.name}</span>
            </p>
            <p className="font-tight text-nav mt-1 text-[#5b6475]">{ex.label} · erfundener Musterbetrieb</p>
            <p className="mt-1 text-sm text-[#5b6475]">{ex.hook}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
