'use client';
import { useActionState } from 'react';
import { quickOrder } from './actions';

export interface QuickOption {
  plan: string;
  /** z. B. „Basis“ */
  name: string;
  /** groß: z. B. „597 €“ oder „0 €“ */
  headline: string;
  /** klein unter dem Preis: „einmalig“ oder „heute“ */
  headlineNote?: string;
  /** eine kurze Zeile: Monatspreis und Laufzeit */
  detail: string;
  /** kurze Leistungspunkte */
  includes?: string[];
  recommended?: boolean;
}

/**
 * Weg „Angaben danach“ (19.11.2026 neu gestaltet): Tarifkarten, ein Klick führt zur Bezahlseite (Stripe). Preise,
 * Laufzeit und AGB bestätigt der Kunde dort; Angaben für die Website kommen nach der Zahlung per E-Mail-Link.
 * Keine Vorauswahl; nur dieser ausdrückliche POST erzeugt eine Bezahlsitzung.
 */
export function TariffPicker({ slug, options, preferred }: { slug: string; options: QuickOption[]; preferred?: string }) {
  const [state, action, pending] = useActionState(quickOrder.bind(null, slug), {});
  const sorted = [...options].sort((a, b) => Number(b.plan === preferred) - Number(a.plan === preferred));
  return (
    <form action={action}>
      {/* 19.11.2026: Bestätigung hier statt bei Stripe – im Komplett-Tarif (nur Zahlungsmittel hinterlegen) erlaubt
          Stripe keine eigenen Felder. Gilt für alle Tarife gleich, damit nichts doppelt oder verschieden ist. */}
      <div className="card-site mb-5 space-y-3 p-5 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="b2b" required className="accent-brand-600 mt-0.5 h-5 w-5 shrink-0" />
          <span>Ich bestelle für mein Unternehmen.</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="terms" required className="accent-brand-600 mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Ich akzeptiere die{' '}
            <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline">
              AGB
            </a>{' '}
            einschließlich Preis und Laufzeit des gewählten Tarifs. Die{' '}
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="underline">
              Datenschutzhinweise
            </a>{' '}
            habe ich zur Kenntnis genommen.
          </span>
        </label>
      </div>
      <div className={`grid gap-4 ${sorted.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {sorted.map((o) => (
          <div
            key={o.plan}
            className={`card-site flex flex-col p-6 ${o.recommended ? 'border-brand-600 ring-brand-100 ring-4' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-tight text-lg font-semibold tracking-[-0.02em] text-slate-900">{o.name}</h2>
              {o.recommended ? (
                <span className="bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">Empfohlen</span>
              ) : null}
            </div>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="font-tight text-[2.4rem] leading-none font-semibold tracking-[-0.04em] text-slate-900">
                {o.headline}
              </span>
              {o.headlineNote ? <span className="text-sm text-slate-500">{o.headlineNote}</span> : null}
            </p>
            <p className="mt-2 text-sm text-slate-600">{o.detail}</p>
            {o.includes?.length ? (
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                {o.includes.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="text-brand-600 font-semibold" aria-hidden="true">
                      ✓
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="submit"
              name="plan"
              value={o.plan}
              disabled={pending}
              className="btn-site btn-sw mt-6 w-full disabled:opacity-60"
            >
              {pending ? 'Bezahlseite öffnet …' : `${o.name} wählen`}
              <span className="arrow" aria-hidden="true">
                →
              </span>
            </button>
          </div>
        ))}
      </div>
      {state.error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <p className="mt-5 text-sm text-slate-500">
        Auf der sicheren Bezahlseite (Stripe) sehen Sie Preis, Laufzeit und AGB noch einmal, bevor Sie bestätigen. Nur für
        Unternehmen.
      </p>
    </form>
  );
}
