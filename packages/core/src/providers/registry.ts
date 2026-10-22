import type { Env } from '../config/env';
import type { EmailProvider, HostingProvider, LeadSource, MailProvider, PaymentProvider, RegistrarProvider } from './types';

/**
 * Fabriken für echte Anbieter. Liefert `undefined`, wenn der Mock verwendet werden soll.
 * Die Implementierungen werden in den jeweiligen Phasen ergänzt.
 */
export const registry = {
  leadSources(kind: string, env: Env): LeadSource[] | undefined {
    void kind;
    void env;
    return undefined;
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
