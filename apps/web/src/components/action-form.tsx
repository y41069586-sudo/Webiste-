'use client';

import { useActionState, type ReactNode } from 'react';
import { SubmitButton } from '@/components/admin/submit-button';

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
  const [state, formAction] = useActionState(action, {});
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
      <SubmitButton className="ui-btn ui-btn-primary">{submit}</SubmitButton>
    </form>
  );
}
