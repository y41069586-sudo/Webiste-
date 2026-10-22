import type { DnsRecord, DomainAvailability, DomainOwner, DomainRegistration, RegistrarProvider } from '../types';

/** Simulierter Registrar. Domains mit „vergeben“ oder „taken“ im Namen gelten als belegt. */
export class MockRegistrar implements RegistrarProvider {
  readonly name = 'mock';
  private readonly registered = new Map<string, { owner: DomainOwner; ns?: string[]; records: DnsRecord[] }>();

  async checkAvailability(domains: string[]): Promise<DomainAvailability[]> {
    return domains.map((domain) => {
      const taken = /vergeben|taken/.test(domain) || this.registered.has(domain);
      return { domain, available: !taken, priceCents: 600, ...(taken ? { reason: 'belegt' } : {}) };
    });
  }

  async registerDomain(input: { domain: string; owner: DomainOwner; nameservers?: string[] }): Promise<DomainRegistration> {
    this.registered.set(input.domain, { owner: input.owner, ns: input.nameservers, records: [] });
    return {
      domain: input.domain,
      registrarDomainId: `mockdom_${input.domain}`,
      ownerHandle: `mockcontact_${input.domain}`,
      status: 'registered',
      costCents: 600,
    };
  }

  async setNameservers(domain: string, nameservers: string[]): Promise<void> {
    const r = this.registered.get(domain);
    if (r) r.ns = nameservers;
  }

  async setDnsRecords(domain: string, records: DnsRecord[]): Promise<void> {
    const r = this.registered.get(domain);
    if (r) r.records = records;
  }

  async getDomainStatus(domain: string): Promise<{ status: string; expiresAt?: Date }> {
    return { status: this.registered.has(domain) ? 'ok' : 'unknown' };
  }
}
