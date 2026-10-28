'use client';

import { useActionState } from 'react';
import { createBootstrapCode, type BootstrapState } from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

/** Einmal-Code für das Einrichtungsskript des Worker-Servers */
export function WorkerBootstrapForm() {
  const [state, formAction] = useActionState<BootstrapState, FormData>(createBootstrapCode, {});
  return (
    <form action={formAction} className="space-y-3 text-sm">
      <p className="text-slate-700">
        Das Einrichtungsskript auf dem Server fragt nach diesem Code und holt damit die Zugangsdaten direkt aus dieser App. Der
        Code gilt 30 Minuten und nur einmal; ein neuer Code macht den alten ungültig.
      </p>
      <label className="flex items-start gap-2" htmlFor="bootstrap-confirm">
        <input id="bootstrap-confirm" type="checkbox" name="confirm" className="mt-0.5 h-4 w-4" required />
        <span>Ich richte gerade meinen eigenen Worker-Server ein.</span>
      </label>
      <SubmitButton className="ui-btn ui-btn-primary">Einmal-Code erzeugen</SubmitButton>
      {state.code ? (
        <p className="rounded-lg bg-slate-100 p-3">
          <span className="block font-mono text-2xl tracking-widest text-slate-900">{state.code}</span>
          <span className="text-slate-600">
            Gültig bis {new Date(state.expiresAt!).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr. Nicht
            weitergeben – nur im Server-Terminal eingeben.
          </span>
        </p>
      ) : null}
      {state.error ? <p className="text-red-700">{state.error}</p> : null}
    </form>
  );
}
