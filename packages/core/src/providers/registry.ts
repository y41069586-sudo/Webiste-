import type { Env } from '../config/env';
import { stripeRuntime } from '../config/stripe-runtime';
import { PostmarkEmail } from './email/postmark';
import { CloudflareHosting } from './hosting/cloudflare';
import { NetlifyHosting } from './hosting/netlify';
import { InwxRegistrar } from './registrar/inwx';
import { ResendEmail } from './email/resend';
import os from 'node:os';
import path from 'node:path';
import { DEFAULT_CONFIG } from '../config/settings';
import { OsmExtractLeadSource } from './lead-source/osm-extract';
import { OverpassLeadSource } from './lead-source/overpass';
import { EasyNovaMailProvider } from './mail/easynova';
import { LetterXpressMailProvider } from './mail/letterxpress';
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
    const userAgent = `SeitenWerk-LeadFinder/1.0 (+${env.APP_URL}; ${env.EMAIL_FROM?.match(/[^<\s]+@[^>\s]+/)?.[0] ?? 'kontakt über Website'})`;
    const overpass = new OverpassLeadSource(env.OVERPASS_URL, userAgent);
    if (!env.OSM_EXTRACT_URL) return [overpass];
    return [
      new OsmExtractLeadSource({
        url: env.OSM_EXTRACT_URL,
        dir: env.OSM_EXTRACT_DIR ?? path.join(os.tmpdir(), 'wbm-osm'),
        userAgent,
        baseTags: DEFAULT_CONFIG.targeting.branches.flatMap((b) => b.osmTags),
        fallback: overpass,
      }),
    ];
  },
  mail(kind: string, env: Env): MailProvider | undefined {
    if (kind === 'easynova') {
      if (!env.EASYNOVA_USERNAME || !env.EASYNOVA_PASSWORD) {
        throw new Error('MAIL_PROVIDER=easynova verlangt EASYNOVA_USERNAME und EASYNOVA_PASSWORD (sonst MAIL_PROVIDER=mock).');
      }
      return new EasyNovaMailProvider({
        username: env.EASYNOVA_USERNAME,
        password: env.EASYNOVA_PASSWORD,
        mode: env.EASYNOVA_MODE,
        testEmail: env.EASYNOVA_TEST_EMAIL,
      });
    }
    if (kind === 'letterxpress') {
      if (!env.LXP_USERNAME || !env.LXP_APIKEY) {
        throw new Error('MAIL_PROVIDER=letterxpress verlangt LXP_USERNAME und LXP_APIKEY (sonst MAIL_PROVIDER=mock).');
      }
      return new LetterXpressMailProvider({ username: env.LXP_USERNAME, apikey: env.LXP_APIKEY, mode: env.LXP_MODE });
    }
    if (kind !== 'pingen') return undefined;
    if (!env.PINGEN_CLIENT_ID || !env.PINGEN_CLIENT_SECRET || !env.PINGEN_ORGANISATION_ID) {
      throw new Error(
        'MAIL_PROVIDER=pingen verlangt PINGEN_CLIENT_ID, PINGEN_CLIENT_SECRET und PINGEN_ORGANISATION_ID (sonst MAIL_PROVIDER=mock).',
      );
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
    if (kind !== 'inwx') return undefined;
    if (!env.REGISTRAR_USER || !env.REGISTRAR_PASSWORD)
      throw new Error('REGISTRAR_PROVIDER=inwx verlangt REGISTRAR_USER und REGISTRAR_PASSWORD (sonst mock).');
    return new InwxRegistrar({
      user: env.REGISTRAR_USER,
      password: env.REGISTRAR_PASSWORD,
      env: env.REGISTRAR_ENV,
      totpSecret: env.REGISTRAR_TOTP_SECRET,
    });
  },
  hosting(kind: string, env: Env): HostingProvider | undefined {
    const formOrigin = new URL(env.APP_URL).origin;
    if (kind === 'cloudflare') {
      if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID)
        throw new Error('HOSTING_PROVIDER=cloudflare verlangt CLOUDFLARE_API_TOKEN und CLOUDFLARE_ACCOUNT_ID.');
      return new CloudflareHosting({ apiToken: env.CLOUDFLARE_API_TOKEN, accountId: env.CLOUDFLARE_ACCOUNT_ID, formOrigin });
    }
    if (kind === 'netlify') {
      if (!env.NETLIFY_API_TOKEN) throw new Error('HOSTING_PROVIDER=netlify verlangt NETLIFY_API_TOKEN.');
      return new NetlifyHosting({ apiToken: env.NETLIFY_API_TOKEN, formOrigin });
    }
    return undefined;
  },
  email(kind: string, env: Env): EmailProvider | undefined {
    if (kind !== 'resend' && kind !== 'postmark') return undefined;
    if (!env.EMAIL_API_KEY) throw new Error(`EMAIL_PROVIDER=${kind} verlangt EMAIL_API_KEY (sonst EMAIL_PROVIDER=mock).`);
    return kind === 'resend'
      ? new ResendEmail(env.EMAIL_API_KEY, env.EMAIL_FROM)
      : new PostmarkEmail(env.EMAIL_API_KEY, env.EMAIL_FROM);
  },
  payment(kind: string, env: Env): PaymentProvider | undefined {
    if (kind !== 'stripe') return undefined;
    return new StripePayment(stripeRuntime(env));
  },
};
