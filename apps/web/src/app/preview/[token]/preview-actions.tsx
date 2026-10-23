'use client';

import { useActionState } from 'react';
import { approveAction, changesAction, type PreviewState } from './actions';

export function PreviewActions({ token, roundsLeft, roundsIncluded }: { token: string; roundsLeft: number; roundsIncluded: number }) {
  const [aState, approve, aPending] = useActionState<PreviewState, FormData>(approveAction.bind(null, token), {});
  const [cState, changes, cPending] = useActionState<PreviewState, FormData>(changesAction.bind(null, token), {});
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={approve} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <h2 className="text-lg font-semibold text-emerald-950">Alles passt?</h2>
        <p className="mt-1 text-sm text-emerald-900">Mit der Freigabe registrieren wir Ihre Domain und schalten die Website live. Das dauert je nach Domain wenige Stunden.</p>
        <label className="mt-3 flex items-start gap-2 text-sm text-emerald-950">
          <input type="checkbox" name="confirm" className="mt-0.5 h-5 w-5 accent-emerald-700" />
          <span>Ich habe die Vorschau geprüft und gebe sie zur Veröffentlichung frei.</span>
        </label>
        {aState.error ? (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {aState.error}
          </p>
        ) : null}
        <button disabled={aPending} className="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          {aPending ? 'Einen Moment …' : 'Freigeben und veröffentlichen'}
        </button>
      </form>
      <form action={changes} className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Änderungen wünschen</h2>
        <p className="mt-1 text-sm text-slate-600">
          {roundsLeft > 0
            ? `Noch ${roundsLeft} von ${roundsIncluded} Änderungsrunden inklusive. Beschreiben Sie alle Wünsche auf einmal.`
            : 'Die inklusiven Änderungsrunden sind aufgebraucht. Wir prüfen Ihren Wunsch persönlich und melden uns.'}
        </p>
        <label htmlFor="aenderung" className="mt-3 mb-1 block text-sm font-medium">
          Was soll geändert werden?
        </label>
        <textarea
          id="aenderung"
          name="text"
          rows={5}
          maxLength={4000}
          required
          className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-base shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none sm:text-sm"
        />
        {cState.error ? (
          <p role="alert" className="mt-2 text-sm text-red-800">
            {cState.error}
          </p>
        ) : null}
        <button disabled={cPending} className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60">
          {cPending ? 'Wird gesendet …' : 'Änderungswunsch senden'}
        </button>
      </form>
    </div>
  );
}
