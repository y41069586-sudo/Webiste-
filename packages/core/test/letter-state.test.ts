import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { DEFAULT_CONFIG, deepMerge } from '../src/config/settings';
import { getDb } from '../src/db/client';
import { auditLog, budgetLedger, demos, leads, letters } from '../src/db/schema';
import { composeLetter, letterTruthBlocklist } from '../src/letters/compose';
import { CORE_MESSAGE_PATTERN, coreSalesMessage, PREVIEW_LETTER_VERSION } from '../src/letters/personalization';
import { canTransitionLetter, LetterCheckUnavailableError, LETTER_TRANSITIONS, wasSubmitted } from '../src/letters/state';
import { checkLetterTruth, markedBody } from '../src/letters/truth-check';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import { restoreLetter } from '../src/services/letters';
import { changeLetterStatus } from '../src/services/letter-status';
import { handleScan } from '../src/services/tracking';
import { SendBlockedError, sendLetter, syncLetterStatuses } from '../src/services/sending';
import { setSiteProbeForTests } from '../src/services/site-health';
import { runTruthCheck } from '../src/services/truth-check';
import * as llm from '../src/services/llm';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { OPERATOR_TEST_CONFIG, resetDb } from './helpers';

async function seed(letterStatus = 'approved') {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Testbetrieb Status',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Kampstraße',
      houseNumber: '5',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      status: 'letter_approved' as never,
    })
    .returning();
  const [demo] = await db
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    })
    .returning();
  const key = `letters/${lead!.id}/x.pdf`;
  await getProviders().storage.put(key, Buffer.from('%PDF-1.7 test'));
  const [letter] = await db
    .insert(letters)
    .values({
      leadId: lead!.id,
      demoId: demo!.id,
      sequence: 1,
      pdfStorageKey: key,
      status: letterStatus as never,
      estimatedCostCents: 135,
      truthCheckJson: { passed: true },
    })
    .returning();
  return { lead: lead!, demo: demo!, letter: letter! };
}
const statusOf = async (id: string) => (await getDb().query.letters.findFirst({ where: eq(letters.id, id) }))!;

describe('Statusregeln der Briefe', () => {
  it('erlaubt nur definierte Übergänge; versendete Briefe gehen nie zurück', () => {
    expect(canTransitionLetter('generated', 'approved')).toBe(true);
    expect(canTransitionLetter('approved', 'queued')).toBe(true);
    expect(canTransitionLetter('queued', 'approved')).toBe(true); // unterbrochene Übergabe
    expect(canTransitionLetter('cancelled', 'generated')).toBe(true); // Wiederherstellung
    expect(canTransitionLetter('sent', 'generated')).toBe(false);
    expect(canTransitionLetter('sent', 'approved')).toBe(false);
    expect(canTransitionLetter('generated', 'sent')).toBe(false); // keine Freigabe übersprungen
    expect(LETTER_TRANSITIONS.delivered).toEqual([]);
  });
  it('erkennt jeden je übergebenen Brief (Schutz vor Doppelversand)', () => {
    expect(wasSubmitted({ providerLetterId: null, sentAt: null, status: 'cancelled' })).toBe(false);
    expect(wasSubmitted({ providerLetterId: '123', sentAt: null, status: 'cancelled' })).toBe(true);
    expect(wasSubmitted({ providerLetterId: null, sentAt: new Date(), status: 'failed' })).toBe(true);
    expect(wasSubmitted({ providerLetterId: null, sentAt: null, status: 'queued' })).toBe(true);
  });
});

describe('Versand: zurückstellen statt stornieren', () => {
  beforeEach(async () => {
    await resetDb();
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    setSiteProbeForTests(null);
    await updateConfig(
      { ...OPERATOR_TEST_CONFIG, switches: { dryRun: false, killSwitch: false }, budget: { weeklyBudgetCents: 1000 } },
      'test',
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    setSiteProbeForTests(null);
  });
  afterAll(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    await stopBoss();
  });

  it('ersetzte Demo: Brief wird zurückgestellt (failed mit Grund), nicht storniert', async () => {
    const { lead, letter } = await seed();
    await getDb()
      .insert(demos)
      .values({
        leadId: lead.id,
        slug: randomToken(24),
        templateId: 'handwerk-klar',
        palette: 'werkblau',
        status: 'published',
        publishedAt: new Date(Date.now() + 1000),
        expiresAt: addDays(new Date(), 30),
      });
    expect((await sendLetter(letter.id, 'test')).state).toBe('skipped');
    const after = await statusOf(letter.id);
    expect(after.status).toBe('failed');
    expect(after.statusReason).toMatch(/^Zurückgestellt: .*(ersetzt|Zuordnung|Demo)/);
    expect(after.providerLetterId).toBeNull();
    expect(await getDb().select().from(budgetLedger)).toHaveLength(0);
  });

  it('offene Demo-Prüfung: zurückgestellt mit klarer Handlungsanweisung', async () => {
    const { demo, letter } = await seed();
    await getDb()
      .update(demos)
      .set({ qaResultJson: { passed: false, checkedAt: new Date().toISOString(), checks: [{ name: 'test', passed: false }] } })
      .where(eq(demos.id, demo.id));
    await sendLetter(letter.id, 'test');
    const after = await statusOf(letter.id);
    expect(after.status).toBe('failed');
    expect(after.statusReason).toMatch(/Zurückgestellt/);
  });

  it('Werbewiderspruch bleibt endgültig storniert', async () => {
    const { lead, letter } = await seed();
    await getDb().update(leads).set({ status: 'suppressed' }).where(eq(leads.id, lead.id));
    await sendLetter(letter.id, 'test');
    expect((await statusOf(letter.id)).status).toBe('cancelled');
  });

  it('Website nicht erreichbar: Versand angehalten, Status bleibt freigegeben, keine Kosten', async () => {
    const { letter } = await seed();
    setSiteProbeForTests(async () => false);
    await expect(sendLetter(letter.id, 'test')).rejects.toBeInstanceOf(SendBlockedError);
    expect((await statusOf(letter.id)).status).toBe('approved');
    expect(await getDb().select().from(budgetLedger)).toHaveLength(0);
  });

  it('Fehler beim Briefdienst: zurück auf freigegeben, Wiederholung versendet genau einmal', async () => {
    const { letter } = await seed();
    const mail = getProviders().mail;
    const original = mail.send.bind(mail);
    let calls = 0;
    vi.spyOn(mail, 'send').mockImplementation(async (...args) => {
      calls++;
      if (calls === 1) throw new Error('503 Dienst nicht erreichbar');
      return original(...args);
    });
    await expect(sendLetter(letter.id, 'test')).rejects.toThrow(/503/);
    const afterFail = await statusOf(letter.id);
    expect(afterFail.status).toBe('approved');
    expect(afterFail.statusReason).toMatch(/wird wiederholt/);
    expect((await sendLetter(letter.id, 'test')).state).toBe('sent');
    expect(calls).toBe(2);
    // dritter Aufruf: bereits übermittelt, kein weiterer Auftrag
    expect((await sendLetter(letter.id, 'test')).state).toBe('skipped');
    expect(calls).toBe(2);
  });

  it('zwei gleichzeitige Versandläufe reichen denselben Brief nur einmal ein', async () => {
    const { letter } = await seed();
    const mail = getProviders().mail;
    const original = mail.send.bind(mail);
    let calls = 0;
    vi.spyOn(mail, 'send').mockImplementation(async (...args) => {
      calls++;
      await new Promise((r) => setTimeout(r, 150));
      return original(...args);
    });
    const results = await Promise.all([sendLetter(letter.id, 'a'), sendLetter(letter.id, 'b')]);
    expect(results.filter((r) => r.state === 'sent')).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it('unterbrochene Übergabe (Worker-Neustart) wird beim Abgleich wieder freigegeben', async () => {
    const { letter } = await seed();
    await getDb()
      .update(letters)
      .set({ status: 'queued', updatedAt: new Date(Date.now() - 20 * 60_000) })
      .where(eq(letters.id, letter.id));
    await syncLetterStatuses('test');
    const after = await statusOf(letter.id);
    expect(after.status).toBe('approved');
    expect(after.statusReason).toMatch(/unterbrochen/);
  });
});

describe('Wiederherstellung intern stornierter Briefe', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ ...OPERATOR_TEST_CONFIG }, 'test');
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('nie übergebener, noch passender Brief wartet wieder auf Freigabe; Verlauf steht im Protokoll', async () => {
    const { letter } = await seed('cancelled');
    await getDb().update(letters).set({ statusReason: 'Demo ersetzt, Qualitätsprüfung offen' }).where(eq(letters.id, letter.id));
    const res = await restoreLetter(letter.id, 'admin:test');
    expect(res.result).toBe('reinstated');
    const after = await statusOf(letter.id);
    expect(after.status).toBe('generated'); // wartet auf Freigabe, nichts wird verschickt
    expect(after.pdfStorageKey).toBe(letter.pdfStorageKey); // Daten bleiben erhalten
    const log = await getDb().select().from(auditLog).where(eq(auditLog.entityId, letter.id));
    expect(log.some((a) => a.action === 'restore')).toBe(true);
  });

  it('bereits an den Briefdienst übergebener Brief bleibt zurückgehalten (kein Doppelversand)', async () => {
    const { letter } = await seed('cancelled');
    await getDb().update(letters).set({ providerLetterId: 'EN-4711' }).where(eq(letters.id, letter.id));
    const res = await restoreLetter(letter.id, 'admin:test');
    expect(res.result).toBe('held');
    expect(res.reason).toMatch(/Briefdienst/);
    expect((await statusOf(letter.id)).status).toBe('cancelled');
  });

  it('Betrieb mit Werbewiderspruch wird nicht wiederhergestellt', async () => {
    const { lead, letter } = await seed('cancelled');
    await getDb().update(leads).set({ status: 'suppressed' }).where(eq(leads.id, lead.id));
    const res = await restoreLetter(letter.id, 'admin:test');
    expect(res.result).toBe('held');
    expect((await statusOf(letter.id)).status).toBe('cancelled');
  });
});

describe('Statuszentrale, unklare Übergabe und QR-Zuordnung', () => {
  beforeEach(async () => {
    await resetDb();
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    await updateConfig(
      { ...OPERATOR_TEST_CONFIG, switches: { dryRun: false, killSwitch: false }, budget: { weeklyBudgetCents: 1000 } },
      'test',
    );
  });
  afterAll(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    await stopBoss();
  });

  it('changeLetterStatus lehnt unzulässige Wechsel ab und schreibt nur aus dem erwarteten Ausgangsstatus', async () => {
    const { letter } = await seed('approved');
    await expect(changeLetterStatus(getDb(), letter.id, ['sent' as never], 'generated')).rejects.toThrow(/Unzulässiger/);
    expect(await changeLetterStatus(getDb(), letter.id, ['generated'], 'approved')).toBe(false); // falscher Ausgang
    expect(await changeLetterStatus(getDb(), letter.id, ['approved'], 'queued', {}, { requireNoProviderId: true })).toBe(true);
    expect((await statusOf(letter.id)).status).toBe('queued');
  });

  it('Brief mit begonnener, aber unbestätigter Übergabe wird nicht neu erzeugt, sondern zur Prüfung zurückgehalten', async () => {
    const { letter } = await seed('cancelled');
    // Wahrheitscheck nicht bestanden → Wiederherstellung würde neu erzeugen (neue Brief-ID), das ist hier gesperrt
    await getDb()
      .update(letters)
      .set({ truthCheckJson: { passed: false } })
      .where(eq(letters.id, letter.id));
    await getDb()
      .insert(auditLog)
      .values({ entity: 'letter', entityId: letter.id, action: 'handover_started', actor: 'test', contextJson: {} });
    // Binding unvollständig → würde neu erzeugt werden, ist aber wegen der begonnenen Übergabe gesperrt
    const res = await restoreLetter(letter.id, 'admin:test');
    expect(res.result).toBe('held');
    expect(res.reason).toMatch(/easyNova-Portal/);
    expect((await statusOf(letter.id)).status).toBe('cancelled');
  });

  it('der QR-Code eines versandten Briefs führt zur Demo, die im Brief gebunden ist', async () => {
    const { lead, demo, letter } = await seed('approved');
    const sent = await sendLetter(letter.id, 'test');
    expect(sent.state).toBe('sent');
    const scan = await handleScan(lead.trackToken, { ua: 'test', ipHash: 'test-hash', isBot: true, audience: 'test' });
    expect('redirect' in scan && scan.redirect).toContain(`/d/${demo.slug}`);
  });
});

describe('Wahrheitscheck: Risikoformulierung, konkrete Behauptung, technischer Ausfall', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, { offers: { activeVersion: 'v4' } });
  const base = (intro: string[]) => ({
    letter: {
      subject: 'Eine neue Website-Idee',
      greeting: 'Guten Tag,',
      intro,
      offer: '',
      noAction: '',
      qrCaption: '',
      closing: '',
    },
    claimSpans: [],
    claims: [],
    allowedClaimIds: [],
    industry: null,
    placeholderValues: [],
    sourcesLabel: 'seitenwerk.world/quellen',
    extraBlocklist: letterTruthBlocklist(cfg),
  });
  afterEach(() => vi.restoreAllMocks());

  it('Kernbotschaft (mögliches Risiko) besteht Sperrliste und Prüfung in jeder Branche', async () => {
    for (const branch of ['Malerbetrieb', 'Dachdecker', 'Elektrobetrieb', 'Restaurant', 'Friseursalon', 'Blumengeschäft']) {
      const core = coreSalesMessage(branch, 'Dortmund');
      expect(core).toMatch(CORE_MESSAGE_PATTERN);
      expect(core).not.toMatch(/\d/);
      const input = { ...base([core]), fixedTexts: [core] };
      expect(checkLetterTruth(input).violations).toEqual([]);
      expect(markedBody(input)).toContain('[[VORLAGE]]');
      expect((await runTruthCheck(input, { checkSourcesPage: false })).passed).toBe(true);
    }
  });

  it('allgemeine Aussage „keine passende Website“ ist erlaubt, Behauptung über den Betrieb bleibt gesperrt', () => {
    expect(checkLetterTruth(base(['Findet jemand keine passende Website, fragt er womöglich woanders an.'])).violations).toEqual(
      [],
    );
    for (const bad of [
      'Sie haben keine Website.',
      'Ihr Betrieb hat bisher keine eigene Website.',
      'Ihre fehlende Website kostet Sie Aufträge.',
    ])
      expect(checkLetterTruth(base([bad])).violations.some((v) => v.rule === 'blocklist')).toBe(true);
  });

  it('konkrete unbelegte Behauptung mit Zahl wird blockiert', () => {
    const r = checkLetterTruth(base(['Sie verlieren monatlich 25 Kunden.']));
    expect(r.passed).toBe(false);
    expect(r.violations.some((v) => v.rule === 'number' && v.match === '25')).toBe(true);
  });

  it('technischer KI-Ausfall ist kein inhaltlicher Befund: Fehler zum Wiederholen statt „nicht bestanden“', async () => {
    const spy = vi.spyOn(llm, 'llmStructured').mockRejectedValue(new Error('529 overloaded'));
    await expect(
      runTruthCheck(base(['Guter neutraler Text ohne Versprechen.']), { checkSourcesPage: false }),
    ).rejects.toBeInstanceOf(LetterCheckUnavailableError);
    expect(spy).toHaveBeenCalledTimes(2); // begrenzte Wiederholung, keine Endlosschleife
  });

  it('ungültige KI-Antwort wird einmal wiederholt und dann akzeptiert', async () => {
    const spy = vi
      .spyOn(llm, 'llmStructured')
      .mockResolvedValueOnce({ kaputt: true } as never)
      .mockResolvedValueOnce({ unbacked_effect_claim: false, statements: [] } as never);
    const r = await runTruthCheck(base(['Guter neutraler Text.']), { checkSourcesPage: false });
    expect(r.passed).toBe(true);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

describe('Standard-Briefvorlage 3', () => {
  const cfg = deepMerge(DEFAULT_CONFIG, { offers: { activeVersion: 'v4' } });
  const variant = {
    subject: 'Ihre Website-Vorschau',
    greeting: 'Guten Tag,',
    hook: 'für Ihren Betrieb habe ich diese unverbindliche Website-Vorschau vorbereitet.',
    intro: [],
    qrCaption: 'Vorschau ansehen',
    offerWithDomain: '',
    offerWithoutDomain: '',
    noAction: '',
    closing: 'Freundliche Grüße',
  };
  it('jeder Erstbrief trägt die Kernbotschaft als ersten Absatz, Betreff mit Firmenname, Version im Nachweis', () => {
    for (const [branchLabel, name] of [
      ['Dachdecker', 'Dachdeckerei Muster'],
      ['Elektrobetrieb', 'Elektro Beispiel'],
      ['Fliesenleger', 'Fliesen Test'],
      ['Sanitärbetrieb', 'Sanitär Probe'],
      ['Malerbetrieb', 'Maler Demo'],
      ['Garten- und Landschaftsbau', 'Gärten Beispiel'],
    ] as const) {
      const letter = composeLetter({
        cfg,
        variant: variant as never,
        recipient: { businessName: name, street: 'Weg', houseNumber: '1', postalCode: '44137', city: 'Dortmund' },
        branchLabel,
        domain: null,
        rating: null,
        compositeDataUri: null,
        qrDataUri: 'data:image/png;base64,',
        shortUrl: 'example.test/x',
        dateLine: '10. November 2026',
        privacyNotice: 'P',
        objectionNotice: 'O',
        priceLabel: '597 €',
        expiresLabel: '10. Dezember 2026',
      });
      expect(letter.subject).toBe(`Eine neue Website-Idee für ${name}`);
      expect(letter.intro[0]).toMatch(/^Wenn potenzielle (Kunden|Gäste) in Dortmund online nach /);
      expect(letter.intro.join(' ')).toMatch(CORE_MESSAGE_PATTERN);
      expect(letter.intro[1]).toMatch(/^Genau deshalb habe ich für Ihren Betrieb eine unverbindliche Website-Vorschau gebaut/);
      expect(letter.intro.at(-1)).toMatch(/QR-Code mit der Handykamera scannen/);
      expect(letter.copyEvidence?.version).toBe(PREVIEW_LETTER_VERSION);
      expect(PREVIEW_LETTER_VERSION).toBe('seitenwerk-standard-3');
    }
  });
});
