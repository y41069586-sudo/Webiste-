import 'server-only';
import { headers } from 'next/headers';
import { getEnv, sha256 } from '@wbm/core';

/** IP des Clients (hinter Caddy aus X-Forwarded-For). Wird nie gespeichert. */
export function clientIpFrom(h: Headers): string {
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? '0.0.0.0';
}

/**
 * Gehashte IP mit täglich rotierendem Salt (nicht über Tage verknüpfbar).
 * Nur für Rate-Limits und Duplikat-Erkennung – keine vollständige IP wird gespeichert.
 */
export function dailyIpHash(ip: string, now = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  return sha256(`${getEnv().SESSION_SECRET}:${day}:${ip}`).slice(0, 16);
}

export async function requestIpHash(): Promise<string> {
  return dailyIpHash(clientIpFrom(await headers()));
}

/** User-Agent gekürzt auf Gerätetyp/Browser-Familie (keine Fingerprints). */
export function shortUserAgent(ua: string | null): string {
  if (!ua) return 'unbekannt';
  const device = /mobile|iphone|android/i.test(ua) ? 'mobil' : /ipad|tablet/i.test(ua) ? 'tablet' : 'desktop';
  const browser = /edg\//i.test(ua)
    ? 'edge'
    : /chrome|crios/i.test(ua)
      ? 'chrome'
      : /firefox|fxios/i.test(ua)
        ? 'firefox'
        : /safari/i.test(ua)
          ? 'safari'
          : /bot|crawl|spider|preview/i.test(ua)
            ? 'bot'
            : 'andere';
  return `${device}/${browser}`;
}

export function isBot(ua: string | null): boolean {
  return !ua || /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python|scanner/i.test(ua);
}

/** Anfrage-Metadaten für Tracking (ohne IP, ohne Cookies). */
export function requestMetaFrom(h: Headers): { ua: string; ipHash: string; isBot: boolean } {
  const ua = h.get('user-agent');
  return { ua: shortUserAgent(ua), ipHash: dailyIpHash(clientIpFrom(h)), isBot: isBot(ua) };
}
