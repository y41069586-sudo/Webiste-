import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { leads } from '../src/db/schema';
import { WEBSITE_METHODS } from '../src/leads/acquisition';
import { stopBoss } from '../src/queue';
import { findLeads } from '../src/services/lead-finder';
import {
  nextLeadForReview,
  quickResearch,
  rejectInQuickReview,
  saveQuickReview,
  workflowStatus,
  type QuickReviewInput,
} from '../src/services/workflow';
import { resetDb } from './helpers';

const complete: QuickReviewInput = {
  websiteFound: false,
  methods: [...WEBSITE_METHODS],
  addressOk: true,
  operational: true,
  independent: true,
  privateClients: true,
  businessClients: false,
  services: ['Badsanierung', '', 'Fliesen verlegen'],
  demand: { kind: 'service_advertising', text: 'Wirbt im Profil aktuell für Badsanierungen' },
  lawfulUse: true,
};

describe('Schnellprüfung (Bausteine)', () => {
  it('übersetzt die Haken in eine geprüfte Recherche mit interner Prüfreferenz', () => {
    const r = quickResearch(complete, new Date('2026-10-29T10:00:00Z'));
    expect(r.website).toMatchObject({
      result: 'not_found',
      methods: [...WEBSITE_METHODS],
      source: 'review:schnellpruefung/2026-10-29',
    });
    expect(r.signals.map((s) => s.kind)).toEqual([
      'address',
      'operational',
      'independent',
      'private_clients',
      'service',
      'service',
      'service_advertising',
    ]);
    expect(r.signals.every((s) => s.verified && s.observedAt === '2026-10-29T00:00:00.000Z')).toBe(true);
  });
  it('übernimmt nur HTTPS-Quellen und verlangt die Bestätigung', () => {
    expect(quickResearch({ ...complete, source: 'https://example.org/profil' }).website.source).toBe(
      'https://example.org/profil',
    );
    expect(quickResearch({ ...complete, source: 'http://example.org' }).website.source).toMatch(/^review:schnellpruefung\//);
    expect(() => quickResearch({ ...complete, lawfulUse: false })).toThrow(/bestätigen/);
    expect(() => quickResearch({ ...complete, services: ['x'.repeat(41)] })).toThrow(/40 Zeichen/);
  });
});

describe('Schnellprüfung (Datenbank)', () => {
  let ids: string[] = [];
  beforeAll(async () => {
    await resetDb();
    await findLeads({ actor: 'job:test' });
    const db = getDb();
    const rows = await db.select({ id: leads.id }).from(leads).limit(3);
    ids = rows.map((r) => r.id);
    for (const [i, id] of ids.entries())
      await db
        .update(leads)
        .set({
          status: 'discovered',
          branch: 'fliesenleger',
          phone: '+49 231 123456',
          street: 'Testweg',
          houseNumber: String(i + 1),
          postalCode: '44137',
          city: 'Dortmund',
          prescreenScore: 90 - i * 10,
        })
        .where(eq(leads.id, id));
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('zeigt die Betriebe nach Vorauswahl und lässt übersprungene aus', async () => {
    expect((await nextLeadForReview()).lead?.id).toBe(ids[0]);
    expect((await nextLeadForReview([ids[0]!])).lead?.id).toBe(ids[1]);
  });

  it('vollständig geprüft → geeignet und weiter zum Demo-Bau; unvollständig bleibt mit Hinweis stehen', async () => {
    const ready = await saveQuickReview(ids[0]!, complete, 'admin:test');
    expect(ready.state).toBe('ready');
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, ids[0]!) }))?.status).toBe('qualified');

    const open = await saveQuickReview(ids[1]!, { ...complete, methods: ['name_city'] }, 'admin:test');
    expect(open.state).toBe('review');
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, ids[1]!) }))?.status).toBe('discovered');
    // Bereits begonnene Prüfungen rutschen hinter noch nie geprüfte Betriebe
    expect((await nextLeadForReview()).lead?.id).toBe(ids[2]);
  });

  it('aussortieren und Ablauf-Zähler', async () => {
    await rejectInQuickReview(ids[2]!, 'has_website', 'admin:test');
    expect((await getDb().query.leads.findFirst({ where: eq(leads.id, ids[2]!) }))?.status).toBe('rejected');
    const { steps, nextStep } = await workflowStatus();
    expect(steps.map((s) => s.key)).toEqual([
      'finden',
      'pruefen',
      'demo_bauen',
      'demo_pruefen',
      'brief_erstellen',
      'brief_freigeben',
      'versand',
      'antworten',
    ]);
    expect(steps.find((s) => s.key === 'pruefen')?.count).toBe(1);
    expect(nextStep).toBe('pruefen');
  });
});
