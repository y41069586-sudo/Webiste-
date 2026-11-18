import { appUrl, getEnv } from '../config/env';
import { logger } from '../logger';

/**
 * Warmhalten der QR-Strecke (17.11.2026): Ohne Aufrufe schläft die Serverfunktion der Web-App ein, der erste Scan
 * danach brauchte ~11 s. Der Worker ruft deshalb regelmäßig /q/warm direkt auf der Web-App auf: dieselbe
 * Serverfunktion wie ein Scan, aber der Token ist absichtlich zu kurz → 404 ohne Datenbankabfrage.
 * Kosten (Netlify Free, Credits): Die erste Fassung (über TRACK_DOMAIN, mit Datenbankabfrage) lief ~1,7 s bei 1 GB
 * ≈ 50 Credits/Monat; so nur Bruchteile einer Sekunde. Zählt nie als Scan (Token ungültig, Bot-Kennung).
 */
export const KEEP_WARM_TOKEN = 'warm';

export function keepWarmUrl(): string | null {
  const url = appUrl(`/q/${KEEP_WARM_TOKEN}`);
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

/** Stunde in deutscher Zeit (0–23). */
function berlinHour(d: Date): number {
  const part = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Europe/Berlin' })
    .formatToParts(d)
    .find((p) => p.type === 'hour');
  return Number(part?.value ?? d.getUTCHours());
}

/**
 * Liegt der Zeitpunkt im Warmhalte-Fenster (18.11.2026: nur tagsüber, spart nachts Credits)? „7-21“ heißt 7:00 bis
 * 20:59 Uhr deutscher Zeit; „0-24“ heißt immer.
 */
export function keepWarmActiveAt(d: Date, hours: string): boolean {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(hours);
  if (!m) return true;
  const from = Number(m[1]);
  const to = Number(m[2]);
  const h = berlinHour(d);
  return from <= to ? h >= from && h < to : h >= from || h < to;
}

/** Startet den Takt; gibt eine Stopp-Funktion zurück. Fehler werden nur protokolliert. */
export function startKeepWarm(fetchFn: typeof fetch = fetch): () => void {
  const { KEEP_WARM_MINUTES: minutes, KEEP_WARM_HOURS: hours } = getEnv();
  if (!minutes || !keepWarmUrl()) return () => undefined;
  let slowLogged = false;
  const tick = () => {
    if (!keepWarmActiveAt(new Date(), hours)) return;
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
  };
  tick();
  const timer = setInterval(tick, minutes * 60_000);
  timer.unref();
  logger.info({ minutes, hours }, 'Warmhalten der QR-Strecke aktiv');
  return () => clearInterval(timer);
}
