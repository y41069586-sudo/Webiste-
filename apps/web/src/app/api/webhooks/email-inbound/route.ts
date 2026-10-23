import { errInfo, getEnv, ingestInboundEmail, logger, parseInboundPayload, safeEqual } from '@wbm/core';

export const dynamic = 'force-dynamic';

/**
 * Eingehende E-Mails per Webhook (Postmark Inbound oder generisches JSON).
 * Absicherung: Geheimnis EMAIL_INBOUND_SECRET als Query-Parameter ?token=… oder als Passwort der
 * HTTP-Basic-Auth (z. B. https://inbound:GEHEIMNIS@app.example.de/api/webhooks/email-inbound).
 */
export async function POST(req: Request) {
  const secret = getEnv().EMAIL_INBOUND_SECRET;
  if (!secret) return new Response('not configured', { status: 404 });
  const url = new URL(req.url);
  const auth = req.headers.get('authorization') ?? '';
  const basicPass = auth.startsWith('Basic ') ? (Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':')[1] ?? '') : '';
  const token = url.searchParams.get('token') ?? basicPass;
  if (!token || !safeEqual(token, secret)) return new Response('forbidden', { status: 403 });
  const raw = await req.text();
  if (raw.length > 5_000_000) return new Response('too large', { status: 413 });
  const mail = parseInboundPayload(raw);
  if (!mail) return new Response('bad request', { status: 400 });
  try {
    const res = await ingestInboundEmail(mail);
    return Response.json({ ok: true, duplicate: res.duplicate });
  } catch (err) {
    logger.error({ ...errInfo(err) }, 'E-Mail-Eingang fehlgeschlagen');
    return new Response('error', { status: 500 });
  }
}
