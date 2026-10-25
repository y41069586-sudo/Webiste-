'use client';

import { useActionState, type ReactNode } from 'react';

export interface ActionResult {
  error?: string;
  success?: string;
}
/** Local inputs stay responsive; one server mutation per deliberate submission. */
export function ActionForm({
  action,
  children,
  className = '',
  submit = 'Speichern',
}: {
  action: (previous: ActionResult, data: FormData) => Promise<ActionResult>;
  children: ReactNode;
  className?: string;
  submit?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={`space-y-3 ${className}`}>
      {children}
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Wird gespeichert …' : submit}
      </button>
    </form>
  );
}
