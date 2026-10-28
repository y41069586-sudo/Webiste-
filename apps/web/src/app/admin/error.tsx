'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'wbm-admin-reload';

/**
 * Fehlerseite der Verwaltung. War die Seite noch von einer älteren Version geöffnet (neuer Deploy dazwischen),
 * findet der Server die Aktion nicht mehr – dann einmal automatisch neu laden statt einer leeren Fehlerseite.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = /server action|unexpected response|failed to fetch|older or newer deployment|chunk/i.test(error.message);
  useEffect(() => {
    if (!stale) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
      if (Date.now() - last < 30_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    } catch {
      // ohne Speicher trotzdem neu laden
    }
    window.location.reload();
  }, [stale]);

  return (
    <div className="ui-card mx-auto max-w-lg p-8 text-center">
      <h1 className="text-lg font-semibold">{stale ? 'Neue Version geladen' : 'Etwas ist schiefgelaufen'}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {stale
          ? 'Die Verwaltung wurde gerade aktualisiert. Die Seite lädt neu – bitte die letzte Eingabe danach noch einmal speichern.'
          : 'Die Seite konnte nicht vollständig geladen werden. Bitte noch einmal versuchen.'}
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <button type="button" onClick={() => window.location.reload()} className="ui-btn ui-btn-primary">
          Seite neu laden
        </button>
        {!stale ? (
          <button type="button" onClick={reset} className="ui-btn ui-btn-secondary">
            Erneut versuchen
          </button>
        ) : null}
      </div>
    </div>
  );
}
