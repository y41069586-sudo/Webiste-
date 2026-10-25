import { getEnv, getProviders } from '@wbm/core';
import { Resend } from 'resend';
import { adminOrNull } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Authenticated, read-only checks. Never returns credentials or upstream payloads. */
export async function GET() {
  if (!(await adminOrNull())) return new Response('unauthorized', { status: 401 });
  const env = getEnv();
  const key = env.STRIPE_SECRET_KEY ?? '';
  const stripeMode = /^(sk|rk)_test_/.test(key) ? 'test' : /^(sk|rk)_live_/.test(key) ? 'live' : 'unknown';
  const [stripeRead, storageRead, resendRead] = await Promise.all([
    (async () => {
      if (stripeMode !== 'test') return { ok: false, reason: 'test_key_required' };
      try {
        const response = await fetch('https://api.stripe.com/v1/products?limit=1', {
          headers: { authorization: `Bearer ${key}` },
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        await response.body?.cancel();
        return { ok: response.ok, status: response.status };
      } catch {
        return { ok: false, reason: 'unreachable' };
      }
    })(),
    (async () => {
      if (env.STORAGE_DRIVER !== 's3') return { ok: false, reason: 's3_not_enabled' };
      try {
        await getProviders().storage.list('health/');
        return { ok: true };
      } catch {
        return { ok: false, reason: 'storage_unavailable' };
      }
    })(),
    (async () => {
      const apiKey = process.env.RESEND_API_KEY;
      const inboxId = process.env.RESEND_INBOX_ID;
      if (!apiKey || !inboxId) return { ok: false, reason: 'not_configured' };
      try {
        const result = await new Resend(apiKey).inboxes.get(inboxId);
        return { ok: !result.error && Boolean(result.data) };
      } catch {
        return { ok: false, reason: 'unreachable' };
      }
    })(),
  ]);
  return Response.json(
    {
      dryRun: env.DRY_RUN,
      stripe: {
        mode: stripeMode,
        provider: env.PAYMENT_PROVIDER,
        webhookConfigured: Boolean(env.STRIPE_WEBHOOK_SECRET),
        read: stripeRead,
      },
      storage: { driver: env.STORAGE_DRIVER, read: storageRead },
      resend: {
        webhookConfigured: Boolean(process.env.RESEND_WEBHOOK_SECRET),
        outgoingProvider: env.EMAIL_PROVIDER,
        read: resendRead,
      },
    },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
