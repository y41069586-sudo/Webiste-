import { getEnv, trackUrl } from '../config/env';
import { logger } from '../logger';

/**
 * Warmhalten der QR-/Kurz-Link-Strecke (17.11.2026): Ohne Aufrufe schläft die Serverfunktion der Web-App ein,
 * der erste Scan danach brauchte ~12 s. Der Worker ruft deshalb regelmäßig einen ungültigen QR-Token über
 * dieselbe Strecke wie der Brief auf (TRACK_DOMAIN → Web-App → eine Datenbankabfrage → 404).
 * Zählt nie als Scan (kein Lead zum Token, Bot-Kennung), schreibt nichts, kostet nichts außer einem Funktionsaufruf.
 */
export const KEEP_WARM_TOKEN = 'warmhaltenSeitenWerk0000';

export function keepWarmUrl(): string | null {
  const url = trackUrl(`/q/${KEEP_WARM_TOKEN}`);
  // lokal/Tests: nichts aufwecken
  if (!url.startsWith('https://')) return null;
  return url;
}

export async function pingKeepWarm(fetchFn: typeof fetch = fetch): Promise<{ status: number; ms: number } | null> {
  const url = keepWarmUrl();
  if (!url) return null;
  const started = Date.now();
  const res = await fetchFn(url, {
    redirect: 'follow',
    headers: { 'user-agent': 'SeitenWerk-Warmhalten bot' },
    signal: AbortSignal.timeout(30_000),
  });
  await res.arrayBuffer().catch(() => undefined);
  return { status: res.status, ms: Date.now() - started };
}

/** Startet den Takt; gibt eine Stopp-Funktion zurück. Fehler werden nur protokolliert. */
export function startKeepWarm(fetchFn: typeof fetch = fetch): () => void {
  const minutes = getEnv().KEEP_WARM_MINUTES;
  if (!minutes || !keepWarmUrl()) return () => undefined;
  let slowLogged = false;
  const tick = () =>
    void pingKeepWarm(fetchFn)
      .then((r) => {
        if (!r) return;
        // 404 ist das erwartete Ergebnis (ungültiger Token); alles ab 500 heißt: Strecke kaputt
        if (r.status >= 500) logger.warn({ status: r.status, ms: r.ms }, 'Warmhalten: QR-Strecke antwortet mit Fehler');
        else if (r.ms > 8000 && !slowLogged) {
          slowLogged = true;
          logger.info({ ms: r.ms }, 'Warmhalten: QR-Strecke war eingeschlafen');
        }
      })
      .catch((err) => logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Warmhalten fehlgeschlagen'));
  tick();
  const timer = setInterval(tick, minutes * 60_000);
  timer.unref();
  logger.info({ minutes }, 'Warmhalten der QR-Strecke aktiv');
  return () => clearInterval(timer);
}
