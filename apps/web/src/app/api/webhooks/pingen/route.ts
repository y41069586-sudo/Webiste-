import { getProviders, logger, processLetterWebhookEvents } from '@wbm/core';

export const dynamic = 'force-dynamic';

/**
 * Pingen-Webhooks (Kategorien sent, delivered, undeliverable, issues).
 * Signatur: Header „Signature“ = HMAC-SHA256 über den unveränderten Body.
 * Replay-Schutz über webhook_events (Event-ID).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const provider = getProviders().mail;
  if (!provider.verifyWebhook(raw, req.headers)) {
    logger.warn({ provider: provider.name }, 'Brief-Webhook mit ungültiger Signatur');
    return new Response('invalid signature', { status: 401 });
  }
  let events;
  try {
    events = provider.parseWebhook(raw);
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const applied = await processLetterWebhookEvents(events, provider.name);
  return Response.json({ ok: true, received: events.length, applied });
}
