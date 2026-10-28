'use client';

import { useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Absende-Knopf für Server-Aktionen: sofort sichtbare Rückmeldung (Drehkreis, gesperrt gegen Doppelklick),
 * danach kurz ein Häkchen. Ohne umgebendes Formular verhält er sich wie ein normaler Knopf.
 */
export function SubmitButton({ className = '', children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { pending } = useFormStatus();
  const [done, setDone] = useState(false);
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setDone(false);
      return;
    }
    if (!wasPending.current) return;
    wasPending.current = false;
    setDone(true);
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [pending]);
  return (
    <button
      type="submit"
      {...rest}
      className={`ui-submit ${className}`}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      data-done={done || undefined}
    >
      <span className="ui-btn-label">{children}</span>
      {pending ? (
        <span className="ui-btn-spinner" aria-hidden="true">
          <span className="ui-spinner" />
        </span>
      ) : null}
      {done ? (
        <span className="ui-btn-done" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5 10 17.5 19 7" />
          </svg>
        </span>
      ) : null}
      <span className="sr-only" role="status">
        {pending ? 'Wird ausgeführt …' : done ? 'Erledigt' : ''}
      </span>
    </button>
  );
}
