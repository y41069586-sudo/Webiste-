import type { Env } from '../config/env';
import { OverpassLeadSource } from './lead-source/overpass';
import { PingenMailProvider } from './mail/pingen';
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
    void kind;
    void env;
    return undefined;
  },
  payment(kind: string, env: Env): PaymentProvider | undefined {
    void kind;
    void env;
    return undefined;
  },
};
