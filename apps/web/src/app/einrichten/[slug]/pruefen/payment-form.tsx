'use client';
import { useActionState, type ReactNode } from 'react';
import { paySetup } from '../actions';

/** Tarif wählen und bezahlen (Weg „Angaben zuerst“), 19.11.2026 im Stil der Tarifkarten neu gestaltet. */
export function PaymentForm({
  slug,
  fingerprint,
  options,
  children,
}: {
  slug: string;
  fingerprint: string;
  options: {
    plan: string;
    title: string;
    price: string;
    terms: string;
    includes: string;
    recommended?: boolean;
    dueNow?: string;
  }[];
  /** zwischen Tarif und Häkchen: eingeklappte Zusammenfassung der Angaben */
  children?: ReactNode;
}) {
  const [state, action, pending] = useActionState(paySetup.bind(null, slug), {});
  const check = 'mt-0.5 h-5 w-5 shrink-0 accent-brand-600';
  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="fingerprint" value={fingerprint} />
      <fieldset>
        <legend className="font-tight text-lg font-semibold tracking-[-0.02em]">Ihr Tarif</legend>
        <div className={`mt-3 grid gap-4 ${options.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {options.map((o) => (
            <label
              key={o.plan}
              className="card-site has-checked:border-brand-600 has-checked:ring-brand-100 flex cursor-pointer flex-col p-5 transition-shadow has-checked:ring-4"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <input type="radio" name="plan" value={o.plan} required className={check} />
                  <strong className="font-tight text-lg font-semibold tracking-[-0.02em] text-slate-900">{o.title}</strong>
                </span>
                {o.recommended ? (
                  <span className="bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">Empfohlen</span>
                ) : null}
              </span>
              {o.dueNow ? (
                <span className="mt-3 block pl-8">
                  <span className="font-tight text-[1.9rem] leading-none font-semibold tracking-[-0.04em] text-slate-900">
                    {o.dueNow}
                  </span>
                  <span className="ml-2 text-sm text-slate-500">heute</span>
                </span>
              ) : null}
              <span className="mt-1 block pl-8 text-sm text-slate-600">{o.price}</span>
              {o.includes ? <span className="mt-2 block pl-8 text-sm text-slate-600">{o.includes}</span> : null}
              <details className="mt-2 pl-8 text-xs text-slate-500">
                <summary className="cursor-pointer">Vertragsdetails</summary>
                <span className="mt-2 block">{o.terms}</span>
              </details>
            </label>
          ))}
        </div>
      </fieldset>
      {children}
      <div className="space-y-3 text-sm">
        <label className="flex items-start gap-3">
          <input type="checkbox" name="b2b" required className={check} />
          <span>Ich bestelle für mein Unternehmen.</span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="terms" required className={check} />
          <span>
            Ich akzeptiere die{' '}
            <a href="/agb" target="_blank" rel="noopener noreferrer" className="underline">
              AGB
            </a>
            . Die{' '}
            <a href="/datenschutz" target="_blank" rel="noopener noreferrer" className="underline">
              Datenschutzhinweise
            </a>{' '}
            habe ich zur Kenntnis genommen.
          </span>
        </label>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="subscription" required className={check} />
          <span>Ich stimme dem gewählten Monatstarif und der beschriebenen Zahlungsweise ausdrücklich zu.</span>
        </label>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="btn-site btn-primary w-full disabled:opacity-60">
        {pending ? 'Bezahlseite öffnet …' : 'Weiter zur Bezahlung'}
        <span className="arrow" aria-hidden="true">
          →
        </span>
      </button>
      <p className="text-center text-xs text-slate-500">
        Sichere Bezahlung über Stripe.
        {options.some((o) => o.plan === 'komplett') ? ' Bei Komplett wird erst 7 Tage nach der Bestellung abgebucht.' : ''}{' '}
        Die Bestellung gilt erst nach Ihrer Bestätigung dort.
      </p>
    </form>
  );
}
