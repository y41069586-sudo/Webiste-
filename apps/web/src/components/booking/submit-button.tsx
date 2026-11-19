'use client';

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Absende-Knopf der Terminanfrage: zeigt sofort „Wird gesendet …“ und verhindert doppeltes Absenden.
 * Ohne JavaScript bleibt es ein normaler Knopf (Formular funktioniert trotzdem).
 */
export function BookingSubmit({ disabled = false }: { disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    // „submit“ feuert erst, wenn der Browser alle Pflichtfelder geprüft hat
    // sofort zeichnen, bevor der Browser die nächste Seite lädt
    const onSubmit = () => flushSync(() => setSending(true));
    const onShow = () => setSending(false); // Zurück-Taste: Knopf wieder freigeben
    form.addEventListener('submit', onSubmit);
    window.addEventListener('pageshow', onShow);
    return () => {
      form.removeEventListener('submit', onSubmit);
      window.removeEventListener('pageshow', onShow);
    };
  }, []);
  return (
    <button ref={ref} type="submit" className="bk-btn" disabled={disabled} aria-disabled={sending || undefined} data-sending={sending || undefined}>
      {sending ? 'Wird gesendet …' : 'Termin anfragen'}
      {sending ? <span className="bk-spin" aria-hidden="true" /> : null}
    </button>
  );
}
