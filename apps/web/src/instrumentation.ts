/**
 * Beim Serverstart (14.11.2026, Tempo): Benachrichtigungen per `after()` erst nach der Antwort senden, damit QR-Scan,
 * „Website übernehmen“ und Bestellung nicht auf den E-Mail-Versand warten. Schlägt etwas fehl, bleibt alles wie bisher
 * (Aufgabe läuft sofort).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const [{ after }, { setBackgroundRunner }] = await Promise.all([import('next/server'), import('@wbm/core')]);
    setBackgroundRunner((task) => after(task));
  } catch {
    // ohne Runner: Benachrichtigungen laufen weiter synchron
  }
}
