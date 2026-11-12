import { createHash } from 'node:crypto';
import map from './demo-fallback-map.json';
import { simplePage } from './public-page';

/**
 * Notbetrieb (13.11.2026): Supabase drohte wegen überschrittenem Kontingent die Organisation zu sperren (402). Damit
 * QR-Codes und Kurz-URLs der 58 versendeten Briefe dann nicht ins Leere laufen, gibt es für diese Demos statische
 * Kopien unter /notfall/<slug>.html (beim Veröffentlichen erzeugt, siehe infra/netlify/snapshot-demos.mjs) und eine
 * Zuordnung Token/Kurzcode → Slug als gekürzte Hashwerte. Greift nur, wenn Datenbank oder Speicher nicht antworten.
 * Ein Scan im Notbetrieb wird per Resend direkt gemeldet (ohne Datenbank).
 */
const h = (v: string) => createHash('sha256').update(v).digest('hex').slice(0, 24);

export function fallbackSlugForToken(token: string): string | null {
  return (map.tokens as Record<string, string>)[h(token)] ?? null;
}

export function fallbackSlugForCode(code: string): string | null {
  return (map.codes as Record<string, string>)[h(code.toLowerCase())] ?? null;
}

export function isFallbackSlug(slug: string): boolean {
  return Object.values(map.tokens as Record<string, string>).includes(slug);
}

/** Statische Kopie vom selben Host holen; null, wenn sie fehlt (z. B. Veröffentlichung ohne Kopien). */
export async function fallbackSnapshot(req: Request, slug: string): Promise<string | null> {
  if (!isFallbackSlug(slug)) return null;
  try {
    const res = await fetch(new URL(`/notfall/${slug}.html`, req.url), { cache: 'no-store' });
    if (!res.ok) return null;
    const html = await res.text();
    return html.includes('<html') ? html : null;
  } catch {
    return null;
  }
}

/** Scan im Notbetrieb melden: direkt über Resend, ohne Datenbank. Fehler werden verschluckt. */
export async function alertFallbackScan(slug: string, via: string, ua: string | null): Promise<void> {
  const key = process.env.EMAIL_API_KEY;
  const to = process.env.ACTIVITY_EMAIL || process.env.ADMIN_EMAIL;
  const from = process.env.EMAIL_FROM;
  if (!key || !to || !from || /@example\.(com|org|net)$/i.test(to)) return;
  if (ua && /bot|crawl|spider|preview|headless|curl|wget|python|scanner/i.test(ua)) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Website-Brief] QR-Code gescannt (Notbetrieb): ${slug.slice(0, 6)}…`,
        text: `Ein Betrieb hat seinen QR-Code gescannt (${via}), während die Datenbank nicht erreichbar war.\nDemo: /d/${slug}\nDer Betrieb sieht die gespeicherte Kopie seiner Demo mit Kontakt per E-Mail. Bitte Claude Bescheid geben, dann ordnen wir den Betrieb zu.`,
      }),
    });
  } catch {
    // Meldung ist ein Zusatz
  }
}

export const FALLBACK_HEADERS: Record<string, string> = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex, nofollow',
  'referrer-policy': 'no-referrer',
};

/** Notbetrieb: Datenbank nicht erreichbar → gespeicherte Kopie der Demo (nur für versendete Briefe). */
export async function fallbackRedirect(req: Request, slug: string | null, via: string): Promise<Response> {
  if (!slug) return simplePage('Kurz nicht erreichbar', '<p>Bitte versuchen Sie es in ein paar Minuten erneut.</p>', 503);
  await alertFallbackScan(slug, via, req.headers.get('user-agent'));
  return new Response(null, {
    status: 302,
    headers: { location: `/notfall/${slug}.html`, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' },
  });
}

/** Hängende Verbindungen (gesperrte Datenbank) nicht bis zum Funktions-Timeout abwarten. */
export function withTimeout<T>(p: Promise<T>, ms = 7000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Zeitüberschreitung')), ms))]);
}
