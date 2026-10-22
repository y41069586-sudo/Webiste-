import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { auditLog, leads } from '../src/db/schema';
import { findLeads, resolveLeadSources } from '../src/services/lead-finder';
import { addSuppression, isSuppressed, optOutLead } from '../src/services/suppression';
import { getConfig } from '../src/config/service';
import { resetDb } from './helpers';

describe('Lead-Finder (Mock-Quelle)', () => {
  beforeEach(resetDb);

  it('findet, qualifiziert und begründet Ablehnungen', async () => {
    const s = await findLeads({ actor: 'job:test' });
    expect(s.source).toBe('mock');
    expect(s.queries).toBe(4); // Dortmund × 4 Branchen
    expect(s.found).toBe(24);
    expect(s.qualified + s.rejected).toBe(24);
    expect(s.byReason.has_website).toBeGreaterThan(0);
    expect(s.byReason.incomplete_address).toBeGreaterThan(0);
    const rows = await getDb().select().from(leads);
    const qualified = rows.filter((r) => r.status === 'qualified');
    expect(qualified.length).toBe(s.qualified);
    for (const r of rows.filter((x) => x.status === 'rejected')) expect(r.rejectionReasons.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.trackToken.length >= 24)).toBe(true);
    expect(rows[0]!.segmentKey).toMatch(/^dortmund:(beauty|handwerk):/);
    const social = rows.find((r) => r.socialOnly);
    expect(social?.status).not.toBe('rejected');
  });

  it('ist idempotent (zweiter Lauf legt nichts doppelt an)', async () => {
    const a = await findLeads({ actor: 'job:test' });
    const b = await findLeads({ actor: 'job:test' });
    expect(b.created).toBe(0);
    expect(b.updated).toBe(a.found);
    expect((await getDb().select().from(leads)).length).toBe(a.found);
  });

  it('Sperrliste greift bei erneuter Suche', async () => {
    await findLeads({ actor: 'job:test' });
    const lead = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')))[0]!;
    await addSuppression(getDb(), { name: lead.businessName, street: lead.street, houseNumber: lead.houseNumber, postalCode: lead.postalCode }, 'test');
    await getDb().delete(leads).where(eq(leads.id, lead.id));
    await findLeads({ actor: 'job:test' });
    const again = await getDb().query.leads.findFirst({ where: eq(leads.sourceId, lead.sourceId) });
    expect(again?.status).toBe('rejected');
    expect(again?.rejectionReasons).toContain('suppressed');
  });

  it('Opt-out anonymisiert und speichert nur Hashes', async () => {
    await findLeads({ actor: 'job:test' });
    const lead = (await getDb().select().from(leads).where(eq(leads.status, 'qualified')))[0]!;
    await optOutLead(getDb(), lead.id, 'public:optout', 'kein_interesse');
    const after = await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) });
    expect(after?.status).toBe('suppressed');
    expect(after?.businessName).toBe('[gelöscht]');
    expect(after?.street).toBeNull();
    expect(await isSuppressed(getDb(), { name: lead.businessName, street: lead.street, houseNumber: lead.houseNumber, postalCode: lead.postalCode })).toBe(true);
    const logs = await getDb().select().from(auditLog).where(eq(auditLog.entityId, lead.id));
    expect(logs.some((l) => l.action === 'opt_out')).toBe(true);
  });

  it('Kettenerkennung: gleicher Name an ≥ 3 Standorten', async () => {
    await updateConfig({ targeting: { cities: ['Dortmund', 'Bochum', 'Essen'] } }, 'test');
    const s = await findLeads({ actor: 'job:test', branches: ['maler'] });
    expect(s.byReason.chain).toBeGreaterThan(0);
  });
});

describe('Compliance-Gate Lead-Quelle', () => {
  beforeEach(resetDb);
  it('Google-Modi verlangen Key und dokumentierte Freigabe', async () => {
    process.env.LEAD_SOURCE = 'osm';
    const { resetProviders } = await import('../src/providers');
    const { resetEnvCache } = await import('../src/config/env');
    resetEnvCache();
    resetProviders();
    await updateConfig({ leadSource: { mode: 'google_text_search' } }, 'test');
    const cfg = await getConfig({ fresh: true });
    expect(() => resolveLeadSources(cfg)).toThrow(/GOOGLE_PLACES_API_KEY|Genehmigung/);
    process.env.GOOGLE_PLACES_API_KEY = 'test-key';
    resetEnvCache();
    expect(() => resolveLeadSources(cfg)).toThrow(/Genehmigung|3\.3\.2/);
    const approved = await updateConfig({ leadSource: { googleTextSearchApproval: 'Vertrag X vom 01.01.2027' } }, 'test');
    expect(resolveLeadSources(approved).primary.kind).toBe('google_places');
    const signal = await updateConfig({ leadSource: { mode: 'osm_google_signal' } }, 'test');
    expect(() => resolveLeadSources(signal)).toThrow(/rechtlicher Prüfung/);
    delete process.env.GOOGLE_PLACES_API_KEY;
    process.env.LEAD_SOURCE = 'mock';
    resetEnvCache();
    resetProviders();
  });
});
