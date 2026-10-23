import { errInfo, InvalidWebhookError, logger, processPaymentWebhook } from '@wbm/core';

export const dynamic = 'force-dynamic';

/**
 * Stripe-Webhook. Signatur über den unveränderten Body (Header Stripe-Signature),
 * Replay-Schutz über webhook_events. Ungültig → 400 (kein Retry), Verarbeitungsfehler → 500 (Stripe wiederholt).
 * Benötigte Events: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired, charge.refunded.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    const res = await processPaymentWebhook(raw, req.headers.get('stripe-signature'));
    return Response.json({ received: true, ...res });
  } catch (err) {
    if (err instanceof InvalidWebhookError) {
      logger.warn({ ...errInfo(err) }, 'Zahlungs-Webhook abgelehnt');
      return new Response('invalid', { status: 400 });
    }
    logger.error({ ...errInfo(err) }, 'Zahlungs-Webhook fehlgeschlagen');
    return new Response('error', { status: 500 });
  }
}
