import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { leads, demos, letters, variants, suppressionList, budgetLedger } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { resetDb, resetVariants } from './helpers';
import { findLeads } from '../src/services/lead-finder';
import { buildDemo } from '../src/demos/build';
import { qaDemo } from '../src/render/demo-qa';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { generateLetter } from '../src/render/letter';
import { approveLetter } from '../src/services/letters';
import { sendLetter } from '../src/services/sending';
import { addSuppression } from '../src/services/suppression';
import { updateConfig } from '../src/config/service';
import { v4LetterVariant } from '../src/letters/conversion-v4';
import { personalizedLetterCopy, PREVIEW_LETTER_VERSION } from '../src/letters/personalization';
import { closeBrowser } from '../src/render/browser';
import { stopBoss } from '../src/queue';
import { assertLetterBinding } from '../src/letters/binding';
import { sha256 } from '../src/util/crypto';
const scores = { personalization: 90, industry: 90, text: 90, visual: 90, screenshot: 90 };
it('only uses reviewed short facts with source references and rejects hidden claims', () => {
  const context = {
    businessName: 'Fiktiver Maler',
    city: 'Testort',
    branchLabel: 'Malerbetrieb',
    details: [
      { text: 'Kalkfarben', verified: true, source: 'fixture:review' },
      { text: 'Garantiert mehr Umsatz', verified: false, source: 'guess' },
    ],
  };
  expect(personalizedLetterCopy(context).intro.join(' ')).toContain('Kalkfarben');
  expect(personalizedLetterCopy(context).intro.join(' ')).not.toContain('Umsatz');
  expect(() =>
    personalizedLetterCopy({
      ...context,
      details: [{ text: 'garantiert mehr Umsatz', verified: true, source: 'fixture:review' }],
    }),
  ).toThrow(/prüfen/);
});
describe('V4 actual generation, reviewed facts and immutable print assignment', () => {
  let lead: typeof leads.$inferSelect, demo: typeof demos.$inferSelect, letter: typeof letters.$inferSelect;
  let variantId: string;
  beforeAll(async () => {
    await resetDb();
    await resetVariants();
    await updateConfig({ offers: { activeVersion: 'v4' }, switches: { dryRun: true } }, 'test');
    await findLeads({ actor: 'test' });
    lead = (
      await getDb()
        .select()
        .from(leads)
        .where(and(eq(leads.status, 'qualified'), eq(leads.branch, 'maler')))
        .limit(1)
    )[0]!;
    expect(lead).toBeTruthy();
    await getDb().update(variants).set({ active: false, status: 'paused' }).where(eq(variants.kind, 'letter'));
    const row = await getDb().query.variants.findFirst({ where: eq(variants.name, 'V4 handwerk A') });
    variantId = row!.id;
    await getDb()
      .update(variants)
      .set({ active: true, status: 'active', content: v4LetterVariant('handwerk', 'A') as unknown as Record<string, unknown> })
      .where(eq(variants.id, variantId));
    const id = await buildDemo(lead.id, { actor: 'test' });
    await qaDemo(id, 'test', { lighthouse: false });
    await approveDemo(id, 'test', {
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
    await publishDemo(id, 'test');
    const result = await generateLetter(lead.id, 1, { actor: 'test' });
    expect(result.issues).toEqual([]);
    expect(result.status).toBe('generated');
    lead = (await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))!;
    demo = (await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))!;
    letter = (await getDb().query.letters.findFirst({ where: eq(letters.id, result.letterId) }))!;
  }, 120000);
  afterAll(async () => {
    await closeBrowser();
    await stopBoss();
    // This suite pauses campaign arms. Do not leak that state into the legacy-letter regressions.
    await resetDb();
    await resetVariants();
  });
  it('records exact PDF, current HTML, desktop, mobile and composite hashes without manufacturing visual approval', async () => {
    const b = letter.truthCheckJson?._binding as Record<string, string>;
    expect(b.demoId).toBe(demo.id);
    expect(demo.expiresAt!.getTime()).toBeGreaterThanOrEqual(letter.statedExpiresAt!.getTime());
    expect(b.pdfHash).toBe(sha256((await getProviders().storage.get(letter.pdfStorageKey!))!));
    expect(b.htmlHash).toBe(demo.qaResultJson?.renderedAssets?.htmlHash);
    expect((letter.truthCheckJson?._quality as { passed: boolean }).passed).toBe(false);
    expect(letter.truthCheckJson?._personalization).toEqual([
      { text: 'Innenanstriche', source: 'fixture:reviewed-service', verified: true },
    ]);
    const { pdfTextItems } = await import('../src/render/pdf');
    const text = (await pdfTextItems((await getProviders().storage.get(letter.pdfStorageKey!))!)).items
      .map((i) => i.str)
      .join(' ');
    expect(text).toContain('Innenanstriche');
    expect(text).not.toMatch(/\b(?:597|19|99)\s*€/);
    expect(text).toContain('Vertragsbedingungen');
    expect(letter.truthCheckJson?._copy).toMatchObject({
      version: PREVIEW_LETTER_VERSION,
      level: 'verified',
      engine: 'fallback',
    });
    expect(text).not.toContain('49 €');
    expect(text).not.toContain('Steuerstatus ungeklärt');
  });
  it('invalidates an existing PDF when reviewed personalization facts change', async () => {
    const original = demo.qaResultJson!;
    await getDb()
      .update(demos)
      .set({
        qaResultJson: {
          ...original,
          review: {
            ...original.review!,
            letterFacts: [{ text: 'Fassadenanstriche', source: 'fixture:new-reviewed-source', verified: true }],
          },
        },
      })
      .where(eq(demos.id, demo.id));
    await expect(
      assertLetterBinding(getDb(), letter, lead, await (await import('../src/config/service')).getConfig({ fresh: true })),
    ).rejects.toThrow(/geändert/);
    await getDb().update(demos).set({ qaResultJson: original }).where(eq(demos.id, demo.id));
  });
  it('checks suppression hashes again before regeneration and approval even when status was not changed', async () => {
    await addSuppression(getDb(), { name: lead.businessName, ...lead }, 'fixture:test');
    expect(await approveLetter(letter.id, 'test', scores)).toBe(false);
    await expect(generateLetter(lead.id, 1, { actor: 'test', regenerate: true })).rejects.toThrow(/Sperrliste/);
    expect(await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) })).toBeTruthy();
    await getDb().delete(suppressionList);
  });
  it('blocks cross-source duplicates and an unapproved primary source', async () => {
    const { id: ignored, ...copy } = lead;
    void ignored;
    const [dupe] = await getDb()
      .insert(leads)
      .values({ ...copy, sourceId: 'fixture:dupe', shortCode: null, trackToken: 'fixture-duplicate-token' })
      .returning();
    expect(await approveLetter(letter.id, 'test', scores)).toBe(false);
    await expect(generateLetter(lead.id, 1, { actor: 'test', regenerate: true })).rejects.toThrow(/dublette/i);
    await getDb().delete(leads).where(eq(leads.id, dupe!.id));
    await getDb().update(leads).set({ source: 'google_places' }).where(eq(leads.id, lead.id));
    expect(await approveLetter(letter.id, 'test', scores)).toBe(false);
    await getDb().update(leads).set({ source: 'mock' }).where(eq(leads.id, lead.id));
  });
  it('preserves previous PDF and row if regeneration fails its truth check', async () => {
    const bytes = await getProviders().storage.get(letter.pdfStorageKey!);
    await getDb()
      .update(variants)
      .set({
        content: { ...v4LetterVariant('handwerk', 'A'), hook: 'Garantiert mehr Umsatz.' } as unknown as Record<string, unknown>,
      })
      .where(eq(variants.id, variantId));
    await expect(generateLetter(lead.id, 1, { actor: 'test', regenerate: true })).rejects.toThrow(/bisheriger Brief/);
    expect((await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))?.pdfStorageKey).toBe(
      letter.pdfStorageKey,
    );
    expect(await getProviders().storage.get(letter.pdfStorageKey!)).toEqual(bytes);
    await getDb()
      .update(variants)
      .set({ content: v4LetterVariant('handwerk', 'A') as unknown as Record<string, unknown> })
      .where(eq(variants.id, variantId));
  }, 60000);
  it('blocks changed HTML, recipient, PDF and image; sending remains cost-free', async () => {
    const storage = getProviders().storage,
      html = (await storage.get(demo.htmlStorageKey!))!,
      pdf = (await storage.get(letter.pdfStorageKey!))!,
      composite = (await storage.get(demo.compositeKey!))!;
    await storage.put(demo.htmlStorageKey!, Buffer.concat([html, Buffer.from('changed')]));
    expect(await approveLetter(letter.id, 'test', scores)).toBe(false);
    await storage.put(demo.htmlStorageKey!, html);
    await getDb().update(leads).set({ houseNumber: '999' }).where(eq(leads.id, lead.id));
    expect(await approveLetter(letter.id, 'test', scores)).toBe(false);
    await expect(generateLetter(lead.id, 1, { actor: 'test', regenerate: true })).rejects.toThrow(/Betriebsdaten/);
    await getDb().update(leads).set({ houseNumber: lead.houseNumber }).where(eq(leads.id, lead.id));
    await storage.put(letter.pdfStorageKey!, Buffer.from('changed'));
    expect(await approveLetter(letter.id, 'test', scores)).toBe(false);
    await storage.put(letter.pdfStorageKey!, pdf);
    expect(await approveLetter(letter.id, 'test', scores)).toBe(true);
    await storage.put(demo.compositeKey!, Buffer.from('changed'));
    expect((await sendLetter(letter.id, 'test')).state).toBe('skipped');
    expect(await getDb().select().from(budgetLedger).where(eq(budgetLedger.category, 'letter'))).toHaveLength(0);
    await storage.put(demo.compositeKey!, composite);
  });
  it('does not manufacture an earlier sent letter or an improvement for a third letter', async () => {
    await expect(generateLetter(lead.id, 3, { actor: 'test' })).rejects.toThrow(/tatsächlich versendeten/);
  });
  it('allows a third letter only after a simulated earlier send and a genuinely different reviewed demo', async () => {
    // Fictional local state only: no provider.send call and no production event.
    await getDb().update(letters).set({ status: 'sent', sentAt: new Date() }).where(eq(letters.id, letter.id));
    await expect(generateLetter(lead.id, 3, { actor: 'test' })).rejects.toThrow(/tatsächlich neue/);
    const id = await buildDemo(lead.id, {
      actor: 'test',
      regenerate: true,
      reviewNote: 'Fiktiver Test: andere Layoutvorlage einzeln prüfen',
    });
    await qaDemo(id, 'test', { lighthouse: false });
    await approveDemo(id, 'test', {
      manual: true,
      review: {
        facts: true,
        desktop: true,
        mobile: true,
        images: true,
        text: true,
        qualityScores: { design: 90, industry: 90, personalization: 90, images: 90, mobile: 90 },
      },
    });
    await publishDemo(id, 'test');
    const followup = await getDb().query.variants.findFirst({ where: eq(variants.name, 'V4 F2 – Geprüfter neuer Entwurf') });
    await getDb().update(variants).set({ active: true, status: 'active' }).where(eq(variants.id, followup!.id));
    const result = await generateLetter(lead.id, 3, { actor: 'test' });
    expect(result.status).toBe('generated');
    expect(result.issues).toEqual([]);
    const generated = await getDb().query.letters.findFirst({ where: eq(letters.id, result.letterId) });
    expect(generated?.demoId).toBe(id);
    expect(id).not.toBe(demo.id);
    expect((generated?.truthCheckJson?._binding as { htmlHash: string }).htmlHash).not.toBe(
      (letter.truthCheckJson?._binding as { htmlHash: string }).htmlHash,
    );
  }, 120000);
});
