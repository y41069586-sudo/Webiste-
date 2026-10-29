import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '../src/config/service';
import { resetEnvCache } from '../src/config/env';
import { getDb } from '../src/db/client';
import { demos, leads, letters } from '../src/db/schema';
import { assertLetterLeadEligible } from '../src/letters/eligibility';
import { assertLetterBinding, letterDemoBinding } from '../src/letters/binding';
import { getProviders } from '../src/providers';
import { sha256 } from '../src/util/crypto';
import { addSuppression } from '../src/services/suppression';
import { resetDb } from './helpers';

describe('Eigener Probedruck vor der Empfängerfreigabe', () => {
  beforeEach(resetDb);
  afterEach(() => {
    vi.unstubAllEnvs();
    resetEnvCache();
  });

  async function seedLead() {
    const [lead] = await getDb()
      .insert(leads)
      .values({
        source: 'mock',
        sourceId: 'self-test-fixture',
        businessName: 'Fiktiver Malerbetrieb',
        branch: 'maler',
        branchGroup: 'handwerk',
        city: 'Teststadt',
        street: 'Testweg',
        houseNumber: '1',
        postalCode: '12345',
        country: 'DE',
        segmentKey: 'self-test',
        trackToken: 'self-test-track-token',
        status: 'qualified',
      })
      .returning();
    return lead!;
  }

  it('Live erlaubt nur den eigenen markierten Probedruck; Quelle und Sperrliste bleiben geschützt', async () => {
    const lead = await seedLead();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('SESSION_SECRET', 'self-test-session-only-not-a-real-production-secret');
    vi.stubEnv('DRY_RUN', 'false');
    resetEnvCache();
    const cfg = await getConfig({ fresh: true });
    cfg.switches.dryRun = false;
    await expect(assertLetterLeadEligible(getDb(), lead, cfg, { testLetter: true })).resolves.toBeUndefined();
    await expect(assertLetterLeadEligible(getDb(), lead, cfg)).rejects.toThrow(/Fiktive Testdaten/);
    await addSuppression(getDb(), { ...lead, name: lead.businessName }, 'test:opt_out');
    await expect(assertLetterLeadEligible(getDb(), lead, cfg, { testLetter: true })).rejects.toThrow(/Sperrliste/);
  });

  it('geänderte Testanschrift sperrt die alte PDF, ohne gewöhnliche Empfängerbindungen zu verändern', async () => {
    const lead = await seedLead();
    const cfg = await getConfig({ fresh: true });
    const storage = getProviders().storage;
    const assets = {
      htmlStorageKey: 'self/site.html',
      screenshotDesktopKey: 'self/desktop.png',
      screenshotMobileKey: 'self/mobile.png',
      compositeKey: 'self/composite.png',
    };
    for (const path of Object.values(assets)) await storage.put(path, Buffer.from(path));
    const [demo] = await getDb()
      .insert(demos)
      .values({
        ...assets,
        leadId: lead.id,
        slug: 'self-test-binding',
        templateId: 'handwerk-solid',
        palette: 'werkblau',
        status: 'published',
        publishedAt: new Date(),
        qaResultJson: { passed: true, checks: [], checkedAt: new Date().toISOString() },
      })
      .returning();
    const recorded = await letterDemoBinding(lead, demo!, cfg, true);
    const regular = await letterDemoBinding(lead, demo!, cfg);
    const pdf = Buffer.from('%PDF-self-test-fixture');
    await storage.put('self/letter.pdf', pdf);
    const [letter] = await getDb()
      .insert(letters)
      .values({
        leadId: lead.id,
        demoId: demo!.id,
        sequence: 0,
        isTest: true,
        pdfStorageKey: 'self/letter.pdf',
        truthCheckJson: { passed: true, _binding: { ...recorded, pdfHash: sha256(pdf) } },
      })
      .returning();
    await expect(assertLetterBinding(getDb(), letter!, lead, cfg)).resolves.toBeUndefined();
    await expect(assertLetterBinding(getDb(), { ...letter!, isTest: false }, lead, cfg)).rejects.toThrow(/Testbrief/);
    const changed = {
      ...cfg,
      letter: { ...cfg.letter, testRecipient: { ...cfg.letter.testRecipient, street: 'Neuer Testweg' } },
    };
    await expect(assertLetterBinding(getDb(), letter!, lead, changed)).rejects.toThrow(/geändert/);
    expect(await letterDemoBinding(lead, demo!, changed)).toEqual(regular);
  });
});
