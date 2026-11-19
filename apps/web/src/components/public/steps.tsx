import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Fortschritt der Kauf-Strecke (19.11.2026, Betreiber: „richtig clean und schön“): erledigte Schritte mit Häkchen,
 * aktueller Schritt blau, kommende grau. Reines HTML/CSS, funktioniert ohne Skript.
 */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm" aria-label="Fortschritt">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                done ? 'bg-brand-50 text-brand-700' : active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
              aria-hidden="true"
            >
              {done ? '✓' : i + 1}
            </span>
            <span className={active ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</span>
            {i < steps.length - 1 ? <span className="mx-1 h-px w-5 bg-slate-300 sm:w-8" aria-hidden="true" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Kopf einer Kauf-Seite: Fortschritt, große Überschrift, ein kurzer Satz. */
export function StepHeader({
  steps,
  current,
  title,
  lead,
  back,
}: {
  steps: string[];
  current: number;
  title: string;
  lead?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="mb-8">
      <Steps steps={steps} current={current} />
      <h1 className="font-tight mt-6 text-[clamp(1.9rem,6vw,2.6rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-slate-900">
        {title}
      </h1>
      {lead ? <p className="mt-3 max-w-xl text-[1.05rem] leading-relaxed text-slate-600">{lead}</p> : null}
      {back ? (
        <p className="mt-3 text-sm">
          <Link href={back.href} className="text-slate-500 underline-offset-4 hover:text-slate-900 hover:underline">
            ← {back.label}
          </Link>
        </p>
      ) : null}
    </header>
  );
}
