import type { Env } from '../config/env';
import { OverpassLeadSource } from './lead-source/overpass';
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
    void kind;
    void env;
    return undefined;
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
