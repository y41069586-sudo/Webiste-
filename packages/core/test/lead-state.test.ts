import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { auditLog, leads } from '../src/db/schema';
import { canTransition, PIPELINE, transitionLead, TransitionError, TRANSITIONS } from '../src/services/lead-state';
import { LEAD_STATUSES } from '../src/types';
import { randomToken } from '../src/util/crypto';
import { resetDb } from './helpers';

async function makeLead(status: (typeof LEAD_STATUSES)[number] = 'discovered') {
  const [row] = await getDb()
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Testbetrieb',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status,
    })
    .returning();
  return row!;
}

describe('Lead-Zustandsmaschine', () => {
  beforeEach(resetDb);

  it('jeder Zustand ist in der Übergangstabelle definiert', () => {
    for (const s of LEAD_STATUSES) expect(TRANSITIONS[s]).toBeDefined();
  });

  it('die Hauptpipeline ist schrittweise durchlaufbar', () => {
    const main = PIPELINE.filter((s) => s !== 'followup_sent');
    for (let i = 0; i < main.length - 1; i++) {
      expect(canTransition(main[i]!, main[i + 1]!), `${main[i]} → ${main[i + 1]}`).toBe(true);
    }
  });

  it('Endzustände: suppressed und live haben keine Übergänge', () => {
    expect(TRANSITIONS.suppressed).toEqual([]);
    expect(TRANSITIONS.live).toEqual([]);
  });

  it('protokolliert Übergänge im Audit-Log', async () => {
    const lead = await makeLead();
    expect(await transitionLead(getDb(), lead.id, 'qualified', { actor: 'job:test' })).toBe(true);
    const row = await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) });
    expect(row?.status).toBe('qualified');
    const logs = await getDb().select().from(auditLog).where(eq(auditLog.entityId, lead.id));
    expect(logs).toHaveLength(1);
    expect(logs[0]!.action).toBe('status:discovered->qualified');
    expect(logs[0]!.actor).toBe('job:test');
  });

  it('wirft bei unzulässigem Übergang', async () => {
    const lead = await makeLead();
    await expect(transitionLead(getDb(), lead.id, 'paid', { actor: 'job:test' })).rejects.toBeInstanceOf(TransitionError);
  });

  it('onlyForward ignoriert Rückschritte (z. B. Scan nach CTA-Klick)', async () => {
    const lead = await makeLead('cta_clicked');
    expect(await transitionLead(getDb(), lead.id, 'scanned', { actor: 'public:q', onlyForward: true })).toBe(false);
    const row = await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) });
    expect(row?.status).toBe('cta_clicked');
  });

  it('Scan direkt nach Versand (vor Zustellmeldung) ist erlaubt', async () => {
    const lead = await makeLead('letter_sent');
    expect(await transitionLead(getDb(), lead.id, 'scanned', { actor: 'public:q', onlyForward: true })).toBe(true);
  });
});
