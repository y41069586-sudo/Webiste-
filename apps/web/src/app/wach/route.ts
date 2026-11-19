/**
 * Spar-Wecker (19.11.2026): Der Worker ruft diese Adresse jede Minute auf, damit die Serverfunktion wach bleibt.
 * Absichtlich ohne Datenbank, ohne @wbm/core und ohne Seitenaufbau – antwortet sofort mit 204. Vorher lief der
 * Weckruf auf /q/warm (404-Seite, ~0,5 s Rechenzeit je Aufruf ≈ 60 Credits/Monat bei 1 Aufruf pro Minute).
 * Nie zwischenspeichern, sonst erreicht der Weckruf die Funktion nicht.
 */
export const dynamic = 'force-dynamic';

const HEADERS = {
  'cache-control': 'no-store, max-age=0',
  'netlify-cdn-cache-control': 'no-store',
  'x-robots-tag': 'noindex',
};

export function GET(): Response {
  return new Response(null, { status: 204, headers: HEADERS });
}

export function HEAD(): Response {
  return new Response(null, { status: 204, headers: HEADERS });
}
