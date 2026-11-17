/**
 * QR-Pförtner (17.11.2026): Ein Scan (/q/{token} oder /{kurzcode}) soll die Demo sofort öffnen, nie erst nach dem
 * Kaltstart der Next-Serverfunktion (bis 11 s). Ablauf:
 *  1. Ziel über /qz/{t|k}/{id} abfragen – liegt im Netlify-Zwischenspeicher, startet also keine Funktion.
 *  2. Sofort per 302 zur Demo (/d/{slug}?start=1, ebenfalls im Zwischenspeicher).
 *  3. Im Hintergrund dieselbe Adresse noch einmal mit Kennzeichen aufrufen: Dann übernimmt die bisherige Route,
 *     zählt den Scan und schickt die Benachrichtigung – egal wie lange die Funktion zum Aufwachen braucht.
 * Bei jedem Problem (Bot, kein Ziel, Zeitüberschreitung, Fehler) passiert nichts Neues: Die bisherige Route
 * antwortet wie vorher (onError: bypass).
 */

type Ctx = { waitUntil(p: Promise<unknown>): void };

const COUNT_HEADER = 'x-sw-zaehlen';
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|curl|wget|python|scanner/i;

export default async (req: Request, context: Ctx): Promise<Response | undefined> => {
  if (req.method !== 'GET' || req.headers.get(COUNT_HEADER)) return;
  const ua = req.headers.get('user-agent') ?? '';
  if (!ua || BOT.test(ua)) return;
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/$/, '');
  const token = /^\/q\/([A-Za-z0-9]{16,64})$/.exec(path)?.[1];
  const code = token ? undefined : /^\/([a-hjkmnp-zA-HJKMNP-Z2-9]{6})$/.exec(path)?.[1];
  if (!token && !code) return;
  const target = token ? `/qz/t/${token}` : `/qz/k/${(code ?? '').toLowerCase()}`;

  let slug: string | null = null;
  try {
    const res = await fetch(new URL(target, url), { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const body = (await res.json()) as { slug?: unknown };
      if (typeof body.slug === 'string' && /^[A-Za-z0-9]{20,64}$/.test(body.slug)) slug = body.slug;
    } else {
      await res.body?.cancel();
    }
  } catch {
    slug = null;
  }
  if (!slug) return;

  // Scan wie bisher zählen (bisherige Route), ohne dass der Betrieb darauf wartet
  const headers = new Headers({ [COUNT_HEADER]: '1', 'user-agent': ua });
  const lang = req.headers.get('accept-language');
  if (lang) headers.set('accept-language', lang);
  context.waitUntil(
    fetch(url.toString(), { headers, redirect: 'manual' })
      .then((r) => r.body?.cancel())
      .catch(() => undefined),
  );

  return new Response(null, {
    status: 302,
    headers: {
      location: `/d/${slug}?start=1`,
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex',
    },
  });
};

export const config = {
  pattern: ['^/q/[A-Za-z0-9]{16,64}/?$', '^/[a-hjkmnp-zA-HJKMNP-Z2-9]{6}/?$'],
  onError: 'bypass',
};
