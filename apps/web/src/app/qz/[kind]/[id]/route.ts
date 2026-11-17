import { demoCdnHeaders, scanTargetSlug, trackTokenForShortCode } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' };

/**
 * Ziel eines QR-Codes (t = Token) oder einer Kurz-URL (k = Kurzcode) für den Pförtner (Edge Function).
 * Zählt nichts. Gültige Ziele liegen im Netlify-Zwischenspeicher (durable) bis zum Ablauf der Demo, damit der
 * Pförtner ohne Kaltstart weiterleiten kann. Ungültige Anfragen werden nicht gespeichert.
 */
export async function GET(req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  let token: string | null = null;
  if (kind === 't') token = id;
  else if (kind === 'k') {
    const t = await trackTokenForShortCode(id, requestMetaFrom(req.headers));
    if (t === 'rate_limited') return new Response('{"slug":null}', { status: 429, headers: NO_STORE });
    token = t;
  }
  const target = token ? await scanTargetSlug(token) : null;
  if (!target) return new Response('{"slug":null}', { status: 404, headers: NO_STORE });
  const cdn = demoCdnHeaders(target.slug, target.expiresAt, { fresh: 35 * 86_400 });
  return new Response(JSON.stringify({ slug: target.slug }), {
    status: 200,
    headers: { ...NO_STORE, ...cdn },
  });
}
