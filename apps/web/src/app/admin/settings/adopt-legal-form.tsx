'use client';

import { useActionState } from 'react';
import { adoptLegalDrafts, type SaveState } from './actions';

/** Ausdrückliche Übernahme der Rechtstext-Entwürfe durch den Betreiber */
export function AdoptLegalForm({ adopted }: { adopted: boolean }) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(adoptLegalDrafts, {});
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <p className="text-slate-700">
        {adopted
          ? 'Gültige Fassungen sind hinterlegt. Eine erneute Übernahme ersetzt sie durch die aktuellen Entwürfe mit Ihren Absenderdaten.'
          : 'Noch keine gültigen Fassungen hinterlegt – die Website zeigt die Entwürfe, und auf Demos erscheint der Hinweis, dass die Online-Bestellung noch nicht freigeschaltet ist.'}
      </p>
      <label className="flex items-start gap-2" htmlFor="adopt-confirm">
        <input id="adopt-confirm" type="checkbox" name="confirm" className="mt-0.5 h-4 w-4" required />
        <span>
          Ich übernehme Impressum, Datenschutzerklärung und Vertragsbedingungen in eigener Verantwortung als gültige Fassung. Eine
          anwaltliche Prüfung hat nicht stattgefunden.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        Rechtstexte übernehmen
      </button>
      {state.ok ? <p className="text-emerald-700">Übernommen und im Audit-Log protokolliert.</p> : null}
      {state.error ? <p className="text-red-700">{state.error}</p> : null}
    </form>
  );
}
