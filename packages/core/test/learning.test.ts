import { and, eq, isNull } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { events, experiments, leads, letters, objections, supportMessages, variants, weeklyReports } from '../src/db/schema';
import { proposalViolations, PROPOSAL_SLOTS, type LearningAnswer } from '../src/learning/agent';
import type { LetterSlots } from '../src/letters/slots';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { approveProposal, isoWeekLabel, rejectProposal, runLearningAgent, VariantReviewError } from '../src/services/learning';
import { purgeObjectionTexts, recordManualObjection } from '../src/services/objections';
import { processSupportMessage } from '../src/services/support';
import { DEFAULT_UNSUPPORTED_PROMISES } from '../src/config/settings';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb, resetVariants } from './helpers';

const SLOTS: LetterSlots = {
  subject: 'Ihre neue Website ist schon fertig',
  opening: 'wer Sie sucht, findet Sie bisher nur über Umwege.',
  claim_slot_1: '',
  claim_slot_2: '',
  benefit: 'Deshalb habe ich Ihnen eine Website gebaut: mit Ihren Leistungen und einem Anfrageformular.',
  offer: 'Gefällt sie Ihnen, gehört sie Ihnen: {preise}, inklusive {eigene_domain} und Hosting. {garantie_satz}',
  risk_reversal: 'Wenn nicht, müssen Sie nichts tun. Der Entwurf ist bis **{ablaufdatum}** online.',
  qr_label: 'Scannen und Ihre Website ansehen – online bis {ablaufdatum}',
};

const proposal = (o: Partial<LearningAnswer['proposals'][number]>): LearningAnswer['proposals'][number] => ({
  industry: 'handwerk',
  parent_variant_id: 'p1',
  changed_slot: 'subject',
  new_text: 'Ihre Website wartet schon auf Sie',
  hypothesis: 'h',
  addresses_objection: 'keiner',
  ...o,
});
const check = (p: LearningAnswer['proposals'][number], extra: Partial<Parameters<typeof proposalViolations>[0]> = {}) =>
  proposalViolations({
    proposal: p,
    parent: { id: 'p1', industry: 'handwerk', slots: SLOTS, sequence: 1, kind: 'letter' },
    usableClaimIds: ['HANDWERK_DIGITAL_ATTRAKTIVER'],
    knownTexts: [],
    unsupportedPromises: DEFAULT_UNSUPPORTED_PROMISES,
    ...extra,
  });

describe('Regeln für Varianten-Vorschläge (Ein-Slot-Regel, B6.5)', () => {
  it('gültiger Betreff-Vorschlag', () => {
    expect(check(proposal({}))).toEqual([]);
  });
  it('nur erlaubte Slots; Garantie und Anrede nie', () => {
    expect(check(proposal({ changed_slot: 'risk_reversal' as never }))[0]).toMatch(/darf nicht geändert/);
    expect(PROPOSAL_SLOTS).not.toContain('risk_reversal');
    expect(PROPOSAL_SLOTS).not.toContain('opening');
  });
  it('Text unverändert, zu lang, Platzhalter entfernt', () => {
    expect(check(proposal({ new_text: SLOTS.subject }))).toContain('Text unverändert');
    expect(check(proposal({ new_text: 'x'.repeat(120) })).join()).toMatch(/zu lang/);
    expect(
      check(
        proposal({ changed_slot: 'offer', new_text: 'Gefällt sie Ihnen, gehört sie Ihnen – inklusive Domain und Hosting.' }),
      ).join(),
    ).toMatch(/Platzhalter \{preise\} fehlt/);
    expect(check(proposal({ changed_slot: 'qr_label', new_text: 'Jetzt scannen und ansehen' })).join()).toMatch(
      /\{ablaufdatum\}/,
    );
  });
  it('Claims nur per ID aus der freigegebenen Bibliothek und nur in Claim-Slots', () => {
    expect(check(proposal({ changed_slot: 'claim_slot_1', new_text: '{CLAIM:HANDWERK_DIGITAL_ATTRAKTIVER}' }))).toEqual([]);
    expect(check(proposal({ changed_slot: 'claim_slot_1', new_text: '{CLAIM:ERFUNDEN}' })).join()).toMatch(/nicht freigegeben/);
    expect(check(proposal({ changed_slot: 'claim_slot_1', new_text: '73 % der Kunden suchen online' })).join()).toMatch(
      /genau eine Referenz/,
    );
    expect(
      check(proposal({ changed_slot: 'benefit', new_text: `${SLOTS.benefit} {CLAIM:HANDWERK_DIGITAL_ATTRAKTIVER}` })).join(),
    ).toMatch(/nur in Claim-Slots/);
  });
  it('keine Versprechen von Funktionen, die es nicht gibt; keine Wiederholung', () => {
    expect(
      check(proposal({ changed_slot: 'benefit', new_text: `${SLOTS.benefit} Ihre vorhandene Domain nehmen Sie mit.` })).join(),
    ).toMatch(/Funktion, die es nicht gibt/);
    expect(check(proposal({}), { knownTexts: ['ihre website wartet  schon auf Sie'] }).join()).toMatch(/schon getestet/);
  });
  it('Ausgangsvariante muss Slot-Variante derselben Branche sein', () => {
    expect(check(proposal({}), { parent: null })[0]).toMatch(/Ausgangsvariante unbekannt/);
    expect(check(proposal({ industry: 'beauty' }))).toContain('Ausgangsvariante gehört zu einer anderen Branche');
  });
  it('Kalenderwoche', () => {
    expect(isoWeekLabel(new Date('2026-10-25T12:00:00Z'))).toBe('2026-KW43');
    expect(isoWeekLabel(new Date('2027-01-01T12:00:00Z'))).toBe('2026-KW53');
  });
});

async function lead(o: { industry?: 'handwerk' | 'beauty' } = {}) {
  const [l] = await getDb()
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Malerbetrieb Beispiel',
      branch: o.industry === 'beauty' ? 'kosmetik' : 'maler',
      branchGroup: o.industry === 'beauty' ? 'beauty' : 'handwerk',
      industry: o.industry ?? 'handwerk',
      city: 'Dortmund',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status: 'letter_delivered',
    })
    .returning();
  return l!;
}

async function sent(variantId: string, o: { scan?: boolean; cta?: boolean; sentDaysAgo?: number } = {}) {
  const db = getDb();
  const l = await lead();
  const sentAt = addDays(new Date(), -(o.sentDaysAgo ?? 9));
  await db.insert(letters).values({
    leadId: l.id,
    sequence: 1,
    status: 'delivered',
    variantId,
    industry: 'handwerk',
    sentAt,
    estimatedDeliveredAt: addDays(sentAt, 3),
    costCents: 150,
    pdfStorageKey: 'x',
  });
  if (o.scan) await db.insert(events).values({ leadId: l.id, type: 'scan', createdAt: addDays(sentAt, 4) });
  if (o.scan) await db.insert(events).values({ leadId: l.id, type: 'demo_view', createdAt: addDays(sentAt, 4) });
  if (o.cta) await db.insert(events).values({ leadId: l.id, type: 'cta_click', createdAt: addDays(sentAt, 4) });
  return l;
}

async function handwerkArms() {
  const db = getDb();
  const all = await db
    .select()
    .from(variants)
    .where(and(eq(variants.kind, 'letter'), eq(variants.sequence, 1)));
  const control = all.filter((v) => v.industry === null && v.status === 'active').sort((a, b) => +a.createdAt - +b.createdAt)[0]!;
  const start = all.find((v) => v.name === 'HANDWERK_B')!;
  return { control, start };
}

describe('Einwände (Support-Agent, B6.5)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetVariants();
  });

  it('Formularfrage „zu teuer“ → Einwand mit Branche und Text; Widerspruch nur Kategorie', async () => {
    const db = getDb();
    const l = await lead();
    const [m] = await db
      .insert(supportMessages)
      .values({
        direction: 'in',
        channel: 'form',
        leadId: l.id,
        fromEmail: 'chef@example.org',
        subject: 'Frage',
        body: 'Schöner Entwurf, aber leider zu teuer für uns.',
      })
      .returning();
    await processSupportMessage(m!.id);
    const [o] = await db.select().from(objections);
    expect(o).toMatchObject({ category: 'zu_teuer', industry: 'handwerk', source: 'form', leadId: l.id });
    expect(o!.text).toContain('zu teuer');

    const l2 = await lead();
    const [m2] = await db
      .insert(supportMessages)
      .values({
        direction: 'in',
        channel: 'email',
        leadId: l2.id,
        fromEmail: 'x@example.org',
        subject: 'Keine Werbung',
        body: 'Bitte keine Werbung mehr schicken, wir haben schon Instagram.',
      })
      .returning();
    await processSupportMessage(m2!.id);
    const o2 = await db.query.objections.findFirst({ where: eq(objections.supportMessageId, m2!.id) });
    expect(o2).toMatchObject({ category: 'habe_social_media', leadId: null, text: null, industry: 'handwerk' });
  });

  it('WhatsApp-Frage von Hand erfassen; Texte nach 90 Tagen gelöscht, Kategorie bleibt', async () => {
    const db = getDb();
    const l = await lead();
    expect(
      await recordManualObjection({ leadId: l.id, text: 'Wer sind Sie überhaupt? Woher haben Sie meine Adresse?' }, 'admin:test'),
    ).toBe('wer_sind_sie');
    expect(await recordManualObjection({ leadId: l.id, text: 'Wann geht die Seite online?' }, 'admin:test')).toBeNull();
    await db.update(objections).set({ createdAt: addDays(new Date(), -91) });
    expect(await purgeObjectionTexts()).toBe(1);
    const [o] = await db.select().from(objections);
    expect(o).toMatchObject({ category: 'wer_sind_sie', text: null, source: 'whatsapp' });
  });
});

describe('Lern-Agent: Probelauf auf simulierten Daten (Abnahme L6)', () => {
  beforeEach(async () => {
    await resetDb();
    await resetVariants();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('erzeugt einen verständlichen Bericht und regelkonforme Vorschläge in der Review-Queue', async () => {
    const db = getDb();
    const { control, start } = await handwerkArms();
    // simulierte Woche: Kontrolle 3/30 Scans, Startvariante 5/30, Demo angesehen, kein Klick
    for (let i = 0; i < 30; i++) await sent(control.id, { scan: i < 3 });
    for (let i = 0; i < 30; i++) await sent(start.id, { scan: i < 5 });
    const l = await lead();
    await recordManualObjection({ leadId: l.id, text: 'Das ist uns zu teuer.' }, 'admin:test');
    await recordManualObjection({ leadId: l.id, text: 'Zu teuer, wir haben kein Budget.' }, 'admin:test');

    const r = await runLearningAgent({ actor: 'test' });
    // Abnahme L6: Bericht des Probelaufs auf Wunsch als Datei (PROBELAUF_OUT=docs/lern-agent-probelauf.md)
    if (process.env.PROBELAUF_OUT) {
      const { writeFileSync } = await import('node:fs');
      writeFileSync(process.env.PROBELAUF_OUT, r.markdown);
    }
    expect(r.skipped).toBe(false);
    expect(r.llmError).toBeNull();
    for (const h of [
      '# Wochenbericht Lern-Agent',
      '## Versand, Reaktionen und Spannen je Branche',
      '## Wo die meisten abspringen',
      '## Häufigste Einwände',
      '## Hypothesen',
      '## Neue Varianten-Vorschläge',
      '## Aufräumen',
    ])
      expect(r.markdown).toContain(h);
    expect(r.markdown).toMatch(/Vorwoche: 8 Scans bei 60 zugestellten Briefen/);
    expect(r.markdown).toContain('„zu teuer“ – 2×');
    expect(r.markdown).not.toContain('Malerbetrieb Beispiel');

    // Vorschläge: höchstens 2 je Branche, je genau ein Slot geändert, Wahrheits-Check bestanden, nichts automatisch aktiv
    const proposed = await db.select().from(variants).where(eq(variants.status, 'proposed'));
    expect(proposed.length).toBeGreaterThanOrEqual(1);
    expect(proposed.length).toBeLessThanOrEqual(2);
    for (const v of proposed) {
      expect(v.createdBy).toBe('learning_agent');
      expect(v.active).toBe(false);
      const parent = (await db.query.variants.findFirst({ where: eq(variants.id, v.parentVariantId!) }))!;
      const a = parent.slotsJson as Record<string, string>;
      const b = v.slotsJson as Record<string, string>;
      const changed = Object.keys({ ...a, ...b }).filter((k) => (a[k] ?? '') !== (b[k] ?? ''));
      expect(changed).toEqual([v.changedSlot]);
      const exp = (await db.select().from(experiments)).find((e) => e.variantIds.includes(v.id))!;
      expect(exp.decision).toBe('proposed');
      expect((exp.resultJson as { truthCheck: { passed: boolean } }).truthCheck.passed).toBe(true);
    }
    expect(r.outcomes.some((o) => o.objection === 'zu_teuer' && o.status === 'review')).toBe(true);
    // Startvariante ins Logbuch übernommen
    expect((await db.select().from(experiments)).some((e) => e.variantIds.includes(start.id) && e.decision === 'running')).toBe(
      true,
    );
    // gespeichert: Tabelle, Datei, Logbuch
    expect(await db.select().from(weeklyReports)).toHaveLength(1);
    expect(await getProviders().storage.get(`reports/woche-${r.week}.md`)).not.toBeNull();
    expect((await getProviders().storage.get('reports/experiments.md'))!.toString()).toContain('# Experiment-Logbuch');
    // zweiter Lauf derselben Woche: übersprungen
    expect((await runLearningAgent()).skipped).toBe(true);
  }, 60_000);

  it('Freigabe und Ablehnung in der Review-Queue', async () => {
    const db = getDb();
    const { control, start } = await handwerkArms();
    for (let i = 0; i < 12; i++) await sent(control.id, { scan: i < 1 });
    for (let i = 0; i < 12; i++) await sent(start.id, { scan: i < 2 });
    await runLearningAgent();
    const proposed = await db.select().from(variants).where(eq(variants.status, 'proposed'));
    expect(proposed.length).toBeGreaterThanOrEqual(1);
    await approveProposal(proposed[0]!.id, 'admin:test');
    expect((await db.query.variants.findFirst({ where: eq(variants.id, proposed[0]!.id) }))!.status).toBe('active');
    const running = (await db.select().from(experiments)).find((e) => e.variantIds.includes(proposed[0]!.id))!;
    expect(running.decision).toBe('running');
    expect(running.startedAt).not.toBeNull();
    await expect(approveProposal(proposed[0]!.id, 'admin:test')).rejects.toThrow(VariantReviewError);
    if (proposed[1]) {
      await rejectProposal(proposed[1].id, 'admin:test', 'Betreff zu reißerisch');
      expect((await db.query.variants.findFirst({ where: eq(variants.id, proposed[1].id) }))!.status).toBe('retired');
      const rej = (await db.select().from(experiments)).find((e) => e.variantIds.includes(proposed[1]!.id))!;
      expect(rej).toMatchObject({ decision: 'rejected', notes: 'Betreff zu reißerisch' });
    }
  }, 60_000);

  it('Aufräumen: Variante mit P ≥ 95 % schlechter als die Kontrolle (genug Briefe) wird pausiert', async () => {
    const db = getDb();
    const { control, start } = await handwerkArms();
    for (let i = 0; i < 150; i++) await sent(control.id, { scan: i < 15 });
    for (let i = 0; i < 150; i++) await sent(start.id, { scan: i < 1 });
    const r = await runLearningAgent();
    expect(r.paused).toBe(1);
    expect((await db.query.variants.findFirst({ where: eq(variants.id, start.id) }))!.status).toBe('paused');
    const exp = (await db.select().from(experiments)).find((e) => e.variantIds.includes(start.id))!;
    expect(exp.decision).toBe('paused_worse');
    expect(r.markdown).toContain('„HANDWERK_B“ pausiert');
    // Kontrolle bleibt unangetastet
    expect(
      (await db.query.variants.findFirst({ where: and(eq(variants.id, control.id), isNull(variants.industry)) }))!.status,
    ).toBe('active');
  }, 60_000);
});
