import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { QA_TOOL_NAME } from '../src/demos/content';
import { buildDemo } from '../src/demos/build';
import { customers, demos, leads, letters, orders } from '../src/db/schema';
import { registerMockStructured, getProviders } from '../src/providers';
import { closeBrowser } from '../src/render/browser';
import { qaDemo } from '../src/render/demo-qa';
import { generateLetter, hasCoreMessage } from '../src/render/letter';
import { pdfTextItems } from '../src/render/pdf';
import { stopBoss } from '../src/queue';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { findLeads } from '../src/services/lead-finder';
import { approveLetterWithReason } from '../src/services/letters';
import { setSiteProbeForTests } from '../src/services/site-health';
import { applyLetterStatus, sendLetter } from '../src/services/sending';
import { simulateMockPayment, startCheckout } from '../src/services/orders';
import { handleScan } from '../src/services/tracking';
import { clearDomainCache } from '../src/services/domains';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import { variants } from '../src/db/schema';
import { OPERATOR_TEST_CONFIG, resetDb, resetVariants, studioQaFixture } from './helpers';

/**
 * Durchgehender Ablauf mit Mocks (kein bezahlter Aufruf): Lead → Recherche/Demo → QA → Freigabe → Brief mit Kernbotschaft
 * → Wahrheitscheck → PDF → Freigabe → Versand an den Mock-Briefdienst → QR-Scan → Checkout → Zahlung.
 */
describe('Ablauf von Lead bis Zahlung (Mocks)', () => {
  let leadId = '';
  let demoId = '';
  let letterId = '';
  beforeAll(async () => {
    registerMockStructured(QA_TOOL_NAME, () => studioQaFixture());
    await resetDb();
    await resetVariants();
    clearDomainCache();
    setSiteProbeForTests(async () => true);
    // Demo und Brief entstehen im Testmodus wie in task2-letter; erst der Versand läuft mit DRY_RUN=false
    await updateConfig({ offers: { activeVersion: 'v4' }, switches: { dryRun: true } }, 'test');
    await findLeads({ actor: 'test', cities: ['Dortmund'] });
    const lead = (
      await getDb()
        .select()
        .from(leads)
        .where(and(eq(leads.status, 'qualified'), eq(leads.branch, 'maler')))
        .limit(1)
    )[0]!;
    leadId = lead.id;
    // Wie im Betrieb: nur die aktive V4-Vorlage für Handwerk ist wählbar
    await getDb().update(variants).set({ active: false, status: 'paused' }).where(eq(variants.kind, 'letter'));
    const row = await getDb().query.variants.findFirst({ where: eq(variants.name, 'V4 handwerk A') });
    await getDb()
      .update(variants)
      .set({ active: true, status: 'active', content: v4LetterVariant('handwerk', 'A') as unknown as Record<string, unknown> })
      .where(eq(variants.id, row!.id));
    demoId = await buildDemo(leadId, { actor: 'test' });
    await qaDemo(demoId, 'test', { lighthouse: false });
    await approveDemo(demoId, 'test', {
      manual: true,
      review: {
        facts: true,
        desktop: true,
        mobile: true,
        images: true,
        text: true,
        qualityScores: { design: 90, industry: 90, personalization: 90, images: 90, mobile: 90 },
        letterFacts: [{ text: 'Innenanstriche', source: 'fixture:reviewed-service', verified: true }],
      },
    });
    await publishDemo(demoId, 'test');
  }, 180_000);
  afterAll(async () => {
    setSiteProbeForTests(null);
    delete process.env.DRY_RUN;
    resetEnvCache();
    await closeBrowser();
    await stopBoss();
    await resetDb();
    await resetVariants();
  });

  it('Brief: Vorlage 3, Kernbotschaft im PDF-Text, Wahrheitscheck bestanden', async () => {
    // Absender und Angebot stehen fest, bevor der Brief entsteht (eine spätere Änderung entwertet die Zuordnung zu Recht)
    await updateConfig({ ...OPERATOR_TEST_CONFIG }, 'test');
    const res = await generateLetter(leadId, 1, { actor: 'test' });
    expect(res.issues).toEqual([]);
    expect(res.status).toBe('generated');
    expect(res.truthCheck?.passed).toBe(true);
    letterId = res.letterId;
    const letter = (await getDb().query.letters.findFirst({ where: eq(letters.id, letterId) }))!;
    const pdf = (await getProviders().storage.get(letter.pdfStorageKey!))!;
    const text = (await pdfTextItems(pdf)).items
      .map((i) => i.str)
      .join(' ')
      .replace(/\s+/g, ' ');
    expect(text).toMatch(/keine passende Website finden/);
    expect(text).toMatch(/Dadurch können wertvolle .* verloren gehen/);
    expect(text).toMatch(/Eine neue Website-Idee für /);
    expect(hasCoreMessage({ intro: [text] })).toBe(true);
  }, 120_000);

  it('Freigabe und Versand: genau ein Auftrag, Idempotenz bei Wiederholung', async () => {
    const scores = { personalization: 90, industry: 90, text: 90, visual: 90, screenshot: 90 };
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    await updateConfig({ switches: { dryRun: false, killSwitch: false }, budget: { weeklyBudgetCents: 1000 } }, 'test');
    const approval = await approveLetterWithReason(letterId, 'admin:test', scores);
    expect(approval.reason ?? '').toBe('');
    expect(approval.ok).toBe(true);
    const first = await sendLetter(letterId, 'test');
    expect(first.state).toBe('sent');
    const second = await sendLetter(letterId, 'test');
    expect(second.state).toBe('skipped');
    const row = (await getDb().query.letters.findFirst({ where: eq(letters.id, letterId) }))!;
    expect(row.providerLetterId).toBeTruthy();
    // Als „verschickt“ gilt der Brief erst, wenn der Briefdienst es bestätigt (hier: übergeben, Bestätigung offen)
    expect(row.status).toBe('queued');
    expect(row.sentAt).toBeNull();
    expect(await applyLetterStatus(getDb(), row.providerLetterId!, 'sent', new Date(), 'test')).toBe(true);
    const confirmed = (await getDb().query.letters.findFirst({ where: eq(letters.id, letterId) }))!;
    expect(confirmed.status).toBe('sent');
    expect(confirmed.sentAt).not.toBeNull();
  });

  it('QR-Scan führt zur veröffentlichten Demo; Checkout und Zahlung gehen durch', async () => {
    const lead = (await getDb().query.leads.findFirst({ where: eq(leads.id, leadId) }))!;
    const demo = (await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) }))!;
    const scan = await handleScan(lead.trackToken, { ua: 'test', ipHash: 'e2e-hash', isBot: false });
    expect('redirect' in scan && scan.redirect).toContain(`/d/${demo.slug}`);
    const start = await startCheckout(
      demo.slug,
      {
        company: lead.businessName,
        contactName: 'Erika Beispiel',
        email: 'erika@example.org',
        phone: '0231 123456',
        street: `${lead.street} ${lead.houseNumber}`,
        postalCode: lead.postalCode!,
        city: lead.city,
        domain: 'e2e-beispielbetrieb.de',
        plan: 'basis',
        subscription: true,
        b2b: true,
        terms: true,
      },
      { ua: 'desktop', ipHash: 'e2e-hash', isBot: false },
    );
    if (!start.ok) throw new Error(`Checkout: ${start.error} ${JSON.stringify(start.fieldErrors)}`);
    const order = (await getDb().query.orders.findFirst({ where: eq(orders.id, start.orderId) }))!;
    await simulateMockPayment(order.stripeSessionId!, 'paid');
    const paid = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(paid.status).toBe('paid');
    expect(paid.invoiceNumber).toMatch(/^RE-\d{4}-\d{4}$/);
    expect(await getDb().query.customers.findFirst({ where: eq(customers.orderId, order.id) })).toBeTruthy();
  });
});
