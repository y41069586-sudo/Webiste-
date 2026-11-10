import { trackUrl } from '../config/env';

/**
 * Ist die öffentliche Website erreichbar, auf die QR-Code und Kurz-URL der Briefe zeigen? (10.11.2026)
 * Ohne erreichbare Seite wird kein Brief erzeugt und keiner versendet: ein Brief mit totem QR-Code kostet Porto und
 * Vertrauen. Ergebnis wird kurz zwischengespeichert, damit ein Stapelversand nicht je Brief anfragt.
 */
let probe: (() => Promise<boolean>) | null = null;
let cache: { at: number; ok: boolean } | null = null;

/** Nur für Tests: Erreichbarkeit vorgeben (null = Standard). */
export function setSiteProbeForTests(fn: (() => Promise<boolean>) | null): void {
  probe = fn;
  cache = null;
}

export async function publicSiteReachable(timeoutMs = 6000): Promise<boolean> {
  if (probe) return probe();
  if (process.env.NODE_ENV === 'test') return true;
  if (cache && Date.now() - cache.at < 60_000) return cache.ok;
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt++) {
    try {
      const res = await fetch(trackUrl('/quellen'), { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
      ok = res.ok;
    } catch {
      ok = false;
    }
  }
  cache = { at: Date.now(), ok };
  return ok;
}

export const SITE_DOWN_MESSAGE =
  'Öffentliche Website nicht erreichbar (QR-Code und Demo-Link würden ins Leere führen). Hosting prüfen; der Vorgang wird automatisch wiederholt.';
