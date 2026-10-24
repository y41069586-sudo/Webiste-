import { getDb, ingestInboundEmail, rateLimit } from '@wbm/core';
import { readResendInbound, verifyResendEvent } from '@/lib/resend-inbound';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const inboxId = process.env.RESEND_INBOX_ID;
  const recipient = process.env.RESEND_INBOUND_TO;
  if (!secret || !apiKey || !inboxId || !recipient) return new Response('not configured', { status: 503 });
  if (Number(request.headers.get('content-length') ?? 0) > 1_000_000) return new Response('too large', { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 1_000_000) return new Response('too large', { status: 413 });
  let event;
  try {
    event = verifyResendEvent(raw, request.headers, secret);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }
  if (event.type !== 'email.received' && event.type !== 'inbox.email.received') return Response.json({ received: true });
  try {
    const limit = await rateLimit(getDb(), 'resend:inbound', 120, 60);
    if (!limit.allowed) return new Response('retry later', { status: 429 });
    const mail = await readResendInbound(event, apiKey, inboxId, recipient);
    if (!mail) return Response.json({ received: true, ignored: true });
    const result = await ingestInboundEmail(mail, { queueProcessing: false });
    return Response.json({ received: true, duplicate: result.duplicate });
  } catch {
    // No message bodies, addresses, provider responses or credentials in logs.
    console.error('Resend inbound processing failed');
    return new Response('retry later', { status: 503 });
  }
}
