import type { Env } from './env';

/** Schlüssel UND Signatursecret derselben Umgebung. Keine Secret-Werte in Fehlern. */
export function stripeRuntime(env: Env): {
  secretKey: string;
  webhookSecret?: string;
  allowLive: boolean;
} {
  const live = env.STRIPE_MODE === 'live';
  if (live && env.DRY_RUN) throw new Error('DRY_RUN erlaubt ausschließlich Stripe-Testschlüssel.');
  const secretKey = live ? env.STRIPE_SECRET_KEY_LIVE : env.STRIPE_SECRET_KEY;
  const webhookSecret = live ? env.STRIPE_WEBHOOK_SECRET_LIVE : env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey) throw new Error(`PAYMENT_PROVIDER=stripe verlangt ${live ? 'STRIPE_SECRET_KEY_LIVE' : 'STRIPE_SECRET_KEY'}.`);
  if (!(live ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/).test(secretKey))
    throw new Error(
      live ? 'STRIPE_MODE=live verlangt einen Stripe-Live-Schlüssel.' : 'Testmodus erlaubt ausschließlich Stripe-Testschlüssel.',
    );
  if ((live || env.NODE_ENV === 'production') && !webhookSecret)
    throw new Error(`${live ? 'STRIPE_WEBHOOK_SECRET_LIVE' : 'STRIPE_WEBHOOK_SECRET'} fehlt (Webhook-Signaturen sind Pflicht).`);
  return { secretKey, webhookSecret, allowLive: live };
}
