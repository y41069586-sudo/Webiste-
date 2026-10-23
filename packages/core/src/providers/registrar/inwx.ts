import { totp } from '../../auth/totp';
import { HttpError, withRetry } from '../../util/retry';
import type { DnsRecord, DomainAvailability, DomainOwner, DomainRegistration, RegistrarProvider } from '../types';

/**
 * INWX DomRobot JSON-RPC (geprüft 23.10.2026, account.inwx.de/en/help/apidoc):
 * Produktion https://api.domrobot.com/jsonrpc/, OT&E (Test) https://api.ote.domrobot.com/jsonrpc/.
 * Anfrage {method, params}, Antwort {code, msg, resData}; 1000 = OK, 1001 = OK, ausstehend; ≥ 2000 = Fehler.
 * Sitzung über das Cookie aus account.login; bei aktivierter 2FA account.unlock mit TAN (TOTP).
 */
export const INWX_ENDPOINTS = {
  production: 'https://api.domrobot.com/jsonrpc/',
  sandbox: 'https://api.ote.domrobot.com/jsonrpc/',
} as const;

/** Standard-Nameserver von INWX (für Records direkt bei INWX, z. B. mit Netlify). */
export const INWX_DEFAULT_NS = ['ns.inwx.de', 'ns2.inwx.de', 'ns3.inwx.eu'];

export class InwxError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly method: string,
  ) {
    super(`INWX ${method}: ${code} ${message}`);
    this.name = 'InwxError';
  }
}

export interface InwxConfig {
  user: string;
  password: string;
  env: 'sandbox' | 'production';
  /** Base32-Secret, falls 2FA im INWX-Konto aktiv ist */
  totpSecret?: string;
}

interface RpcResponse<T> {
  code: number;
  msg: string;
  resData?: T;
}

/** Telefonnummer ins INWX-Format „+49.2311234567“. */
export function inwxPhone(raw: string): string {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (!d.startsWith('+')) d = `+49${d.replace(/^0/, '')}`;
  if (d.startsWith('+49')) return `+49.${d.slice(3).replace(/^0/, '')}`;
  const digits = d.slice(1);
  for (const len of [3, 2, 1]) {
    const cc = digits.slice(0, len);
    if (COUNTRY_CODES.has(cc)) return `+${cc}.${digits.slice(len).replace(/^0/, '')}`;
  }
  return d;
}

/** Ländervorwahlen Europa/Nordamerika (für Telefonnummern ausländischer Kunden). */
const COUNTRY_CODES = new Set(['1', '7', '30', '31', '32', '33', '34', '36', '39', '40', '41', '43', '44', '45', '46', '47', '48', '351', '352', '353', '354', '356', '357', '358', '359', '370', '371', '372', '385', '386', '420', '421', '423']);

/** Hausnummer/Straße sind für INWX ein Feld; Rechtsformen deuten auf eine Organisation hin. */
function contactType(owner: DomainOwner): 'ORG' | 'PERSON' {
  return /\b(gmbh|ug|ag|kg|ohg|gbr|e\.\s?k\.|e\.\s?v\.|mbh|partg)\b/i.test(owner.company) ? 'ORG' : 'PERSON';
}

export class InwxRegistrar implements RegistrarProvider {
  readonly name = 'inwx';
  private cookie: string | null = null;
  private readonly url: string;

  constructor(
    private readonly cfg: InwxConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.url = INWX_ENDPOINTS[cfg.env];
  }

  private async raw<T>(method: string, params: Record<string, unknown>): Promise<RpcResponse<T>> {
    return withRetry(
      async () => {
        const res = await this.fetchImpl(this.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(this.cookie ? { cookie: this.cookie } : {}) },
          body: JSON.stringify({ method, params: { ...params, lang: 'de' } }),
          signal: AbortSignal.timeout(60_000),
        });
        const setCookie = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
        const sessionCookies = setCookie.map((c) => c.split(';')[0]!).filter(Boolean);
        if (sessionCookies.length) this.cookie = sessionCookies.join('; ');
        const text = await res.text();
        if (!res.ok) throw new HttpError(`INWX HTTP ${res.status}`, res.status, text.slice(0, 300));
        return JSON.parse(text) as RpcResponse<T>;
      },
      { retries: 3, baseDelayMs: 1_000 },
    );
  }

  private async login(): Promise<void> {
    this.cookie = null;
    const res = await this.raw<{ tfa?: string }>('account.login', { user: this.cfg.user, pass: this.cfg.password });
    if (res.code !== 1000) throw new InwxError(res.code, res.msg, 'account.login');
    const tfa = res.resData?.tfa;
    if (tfa && tfa !== '0') {
      if (!this.cfg.totpSecret) throw new Error('INWX verlangt 2FA – REGISTRAR_TOTP_SECRET setzen.');
      const unlock = await this.raw('account.unlock', { tan: totp(this.cfg.totpSecret) });
      if (unlock.code !== 1000) throw new InwxError(unlock.code, unlock.msg, 'account.unlock');
    }
  }

  /** Aufruf mit automatischem (Re-)Login. Gibt resData zurück; wirft bei Code ≥ 2000. */
  async call<T>(method: string, params: Record<string, unknown> = {}): Promise<{ code: number; data: T }> {
    if (!this.cookie) await this.login();
    let res = await this.raw<T>(method, params);
    // 2200 = Authentifizierung fehlgeschlagen / Sitzung abgelaufen → einmal neu anmelden
    if (res.code === 2200 || res.code === 2002) {
      await this.login();
      res = await this.raw<T>(method, params);
    }
    if (res.code >= 2000) throw new InwxError(res.code, res.msg, method);
    return { code: res.code, data: (res.resData ?? {}) as T };
  }

  async checkAvailability(domains: string[]): Promise<DomainAvailability[]> {
    if (!domains.length) return [];
    const { data } = await this.call<{ domain?: { domain: string; avail: number; price?: number; premium?: unknown; reason?: string }[] }>('domain.check', {
      domain: domains,
      wide: 2,
    });
    const byName = new Map((data.domain ?? []).map((d) => [d.domain.toLowerCase(), d]));
    return domains.map((domain) => {
      const d = byName.get(domain.toLowerCase());
      if (!d) return { domain, available: false, reason: 'keine Antwort' };
      const premium = Boolean(d.premium && (Array.isArray(d.premium) ? d.premium.length : true));
      return {
        domain,
        available: d.avail === 1 && !premium,
        ...(typeof d.price === 'number' ? { priceCents: Math.round(d.price * 100) } : {}),
        ...(d.avail !== 1 ? { reason: d.reason ?? 'belegt' } : premium ? { reason: 'premium' } : {}),
      };
    });
  }

  private async ownDomainInfo(domain: string): Promise<{ roId: number; registrant?: number; status?: string; exDate?: string } | null> {
    try {
      const { data } = await this.call<{ roId: number; registrant?: number; status?: string; exDate?: string }>('domain.info', { domain });
      return data;
    } catch (err) {
      if (err instanceof InwxError && (err.code === 2303 || err.code === 2201 || err.code === 2202)) return null;
      throw err;
    }
  }

  async registerDomain(input: { domain: string; owner: DomainOwner; nameservers?: string[]; idempotencyKey: string }): Promise<DomainRegistration> {
    // Idempotenz: liegt die Domain schon in unserem Konto, nichts erneut registrieren
    const existing = await this.ownDomainInfo(input.domain);
    if (existing) {
      return { domain: input.domain, registrarDomainId: String(existing.roId), ownerHandle: String(existing.registrant ?? ''), status: 'registered' };
    }
    const o = input.owner;
    const type = contactType(o);
    const { data: contact } = await this.call<{ id: number }>('contact.create', {
      type,
      name: o.name,
      ...(type === 'ORG' || o.company !== o.name ? { org: o.company } : {}),
      street: o.street,
      city: o.city,
      pc: o.postalCode,
      cc: o.country,
      voice: inwxPhone(o.phone),
      email: o.email,
      remarks: input.idempotencyKey.slice(0, 200),
    });
    const created = await this.call<{ roId: number; price?: number }>('domain.create', {
      domain: input.domain,
      period: '1Y',
      registrant: contact.id,
      ns: input.nameservers?.length ? input.nameservers : INWX_DEFAULT_NS,
      renewalMode: 'AUTOEXPIRE',
      transferLock: true,
    });
    return {
      domain: input.domain,
      registrarDomainId: String(created.data.roId),
      ownerHandle: String(contact.id),
      status: created.code === 1001 ? 'pending' : 'registered',
      ...(typeof created.data.price === 'number' ? { costCents: Math.round(created.data.price * 100) } : {}),
    };
  }

  async setNameservers(domain: string, nameservers: string[]): Promise<void> {
    await this.call('domain.update', { domain, ns: nameservers });
  }

  /** DNS-Records in der INWX-Zone setzen (vorhandene gleichen Namens/Typs werden ersetzt). */
  async setDnsRecords(domain: string, records: DnsRecord[]): Promise<void> {
    await this.call('nameserver.create', { domain, type: 'MASTER', ns: INWX_DEFAULT_NS, ignoreExisting: true });
    const { data } = await this.call<{ record?: { id: string; name: string; type: string; content: string }[] }>('nameserver.info', { domain });
    const existing = data.record ?? [];
    for (const r of records) {
      const rel = r.name === '@' ? '' : r.name;
      const fqdn = rel ? `${rel}.${domain}` : domain;
      const type = r.type === 'ALIAS' ? 'ALIAS' : r.type;
      const same = existing.filter((e) => e.type === type && (e.name === fqdn || e.name === rel));
      if (same.length === 1 && same[0]!.content === r.value) continue;
      for (const e of same) await this.call('nameserver.deleteRecord', { id: e.id });
      // apex: CNAME ist dort nicht erlaubt → wird vom Hosting-Provider als A/ALIAS geliefert
      await this.call('nameserver.createRecord', { domain, type, name: rel, content: r.value, ttl: r.ttl ?? 3600, ...(r.priority ? { prio: r.priority } : {}) });
    }
  }

  async getDomainStatus(domain: string): Promise<{ status: string; expiresAt?: Date }> {
    const info = await this.ownDomainInfo(domain);
    if (!info) return { status: 'unknown' };
    return { status: info.status ?? 'ok', ...(info.exDate ? { expiresAt: new Date(info.exDate) } : {}) };
  }
}
