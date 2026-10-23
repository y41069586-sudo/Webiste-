import type { Env } from '../config/env';
import { PostmarkEmail } from './email/postmark';
import { ResendEmail } from './email/resend';
import { OverpassLeadSource } from './lead-source/overpass';
import { PingenMailProvider } from './mail/pingen';
import { StripePayment } from './payment/stripe';
import type { EmailProvider, HostingProvider, LeadSource, MailProvider, PaymentProvider, RegistrarProvider } from './types';

/**
 * Fabriken für echte Anbieter. Liefert `undefined`, wenn der Mock verwendet werden soll.
 * Die Implementierungen werden in den jeweiligen Phasen ergänzt.
 */
export const registry = {
  leadSources(kind: string, env: Env): LeadSource[] | undefined {
    if (kind === 'mock') return undefined;
    // Google wird – je nach Compliance-Modus – im Lead-Finder zugeschaltet
    return [new OverpassLeadSource(env.OVERPASS_URL, `WebsiteBriefMaschine/0.1 (+${env.APP_URL})`)];
  },
  mail(kind: string, env: Env): MailProvider | undefined {
    if (kind !== 'pingen') return undefined;
    if (!env.PINGEN_CLIENT_ID || !env.PINGEN_CLIENT_SECRET || !env.PINGEN_ORGANISATION_ID) {
      throw new Error('MAIL_PROVIDER=pingen verlangt PINGEN_CLIENT_ID, PINGEN_CLIENT_SECRET und PINGEN_ORGANISATION_ID (sonst MAIL_PROVIDER=mock).');
    }
    return new PingenMailProvider({
      clientId: env.PINGEN_CLIENT_ID,
      clientSecret: env.PINGEN_CLIENT_SECRET,
      organisationId: env.PINGEN_ORGANISATION_ID,
      env: env.PINGEN_ENV,
      webhookSecret: env.PINGEN_WEBHOOK_SECRET,
    });
  },
  registrar(kind: string, env: Env): RegistrarProvider | undefined {
    void kind;
    void env;
    return undefined;
  },
  hosting(kind: string, env: Env): HostingProvider | undefined {
    void kind;
    void env;
    return undefined;
  },
  email(kind: string, env: Env): EmailProvider | undefined {
    if (kind !== 'resend' && kind !== 'postmark') return undefined;
    if (!env.EMAIL_API_KEY) throw new Error(`EMAIL_PROVIDER=${kind} verlangt EMAIL_API_KEY (sonst EMAIL_PROVIDER=mock).`);
    return kind === 'resend' ? new ResendEmail(env.EMAIL_API_KEY, env.EMAIL_FROM) : new PostmarkEmail(env.EMAIL_API_KEY, env.EMAIL_FROM);
  },
  payment(kind: string, env: Env): PaymentProvider | undefined {
    if (kind !== 'stripe') return undefined;
    if (!env.STRIPE_SECRET_KEY) throw new Error('PAYMENT_PROVIDER=stripe verlangt STRIPE_SECRET_KEY (sonst PAYMENT_PROVIDER=mock).');
    if (env.NODE_ENV === 'production' && !env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET fehlt (Webhook-Signaturen sind Pflicht).');
    return new StripePayment({ secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET });
  },
};
