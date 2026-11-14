'use client';
import { useActionState, type ReactNode } from 'react';
import { quickOrder } from './actions';

export interface QuickOption {
  plan: string;
  /** z. B. „Basis“ */
  name: string;
  /** groß: z. B. „597 € einmalig“ oder „0 € heute“ */
  headline: string;
  /** eine kurze Zeile: Monatspreis und Laufzeit */
  detail: string;
}

const summaryCls =
  'block cursor-pointer list-none rounded-xl border-2 border-slate-200 bg-white p-4 group-open:border-slate-900 group-open:bg-slate-50 hover:border-slate-400 [&::-webkit-details-marker]:hidden';

/**
 * Erster Schritt nach „Website übernehmen“ (14.11.2026, Betreiber nach Testbrief): zuerst wählen, ob die Angaben jetzt
 * oder nach der Zahlung kommen, jeweils mit ungefährer Dauer. Native Aufklapper (`details`, gegenseitig exklusiv über
 * `name`), damit die Auswahl auch auf langsamen Handys sofort reagiert, bevor das Skript geladen ist. Keine Vorauswahl;
 * verbindlich wird es erst auf der Bezahlseite.
 */
export function SetupChoice({
  slug,
  options,
  preferred,
  formOpen,
  children,
}: {
  slug: string;
  options: QuickOption[];
  preferred?: string;
  /** Schon begonnene Einrichtung: Formular gleich aufgeklappt */
  formOpen?: boolean;
  children: ReactNode;
}) {
  const [state, action, pending] = useActionState(quickOrder.bind(null, slug), {});
  if (!options.length) return <>{children}</>;
  const sorted = [...options].sort((a, b) => Number(b.plan === preferred) - Number(a.plan === preferred));

  return (
    <section aria-labelledby="weg" className="mb-8">
      <h1 id="weg" className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Wie möchten Sie weitermachen?
      </h1>
      <div className="mt-4 space-y-3">
        <details name="weg" className="group" data-weg="zahlung">
          <summary className={summaryCls}>
            <span className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">ca. 2 Minuten</span>
            <strong className="mt-1 block text-lg">Angaben nach der Zahlung</strong>
            <span className="mt-1 block text-sm text-slate-600">Tarif wählen, bestellen, den Rest danach in Ruhe.</span>
          </summary>
          <div className="px-1 pt-4 pb-2">
            <h2 className="text-lg font-semibold">Tarif wählen</h2>
            <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
              {sorted.map((o) => (
                <button
                  key={o.plan}
                  type="submit"
                  name="plan"
                  value={o.plan}
                  disabled={pending}
                  className="rounded-xl bg-slate-900 px-5 py-4 text-left text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <span className="block text-sm font-medium text-slate-300">{o.name}</span>
                  <span className="mt-0.5 block text-2xl font-semibold">{o.headline}</span>
                  <span className="mt-1 block text-sm text-slate-300">{o.detail}</span>
                </button>
              ))}
            </form>
            {pending ? (
              <p role="status" className="mt-3 text-sm text-slate-600">
                Bezahlseite wird geöffnet …
              </p>
            ) : null}
            {state.error ? (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">
                {state.error}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-slate-600">
              Auf der sicheren Bezahlseite (Stripe) sehen und bestätigen Sie Preis, Laufzeit und AGB. Danach bekommen Sie per
              E-Mail den Link für Ihre Angaben. Online geht die Website erst nach Ihrer Freigabe. Nur für Unternehmer.
            </p>
          </div>
        </details>
        <details name="weg" className="group" data-weg="angaben" {...(formOpen ? { open: true } : {})}>
          <summary className={summaryCls}>
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">ca. 15 Minuten</span>
            <strong className="mt-1 block text-lg">Angaben jetzt eintragen</strong>
            <span className="mt-1 block text-sm text-slate-600">Impressum, Texte, Fotos – danach prüfen und bezahlen.</span>
          </summary>
          <div className="pt-6">{children}</div>
        </details>
      </div>
    </section>
  );
}
