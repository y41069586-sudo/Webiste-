'use client';

import { useActionState } from 'react';
import { subscribeAction } from './actions';

export function SubscribeButton({ token, label }: { token: string; label: string }) {
  const [state, action, pending] = useActionState(subscribeAction.bind(null, token), {});
  return (
    <form action={action} className="mt-5">
      {state.error ? (
        <p role="alert" className="mb-3 text-sm text-red-800">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
        {pending ? 'Einen Moment …' : label}
      </button>
    </form>
  );
}
