import { afterAll, beforeEach, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { leads, demos, letters, variants } from '../src/db/schema';
import type { SiteContent } from '@wbm/templates';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { getConfig, updateConfig, getSetting } from '../src/config/service';
import { assertLetterLeadEligible } from '../src/letters/eligibility';
import { leadResearchKey, type LeadResearch } from '../src/leads/acquisition';
import { saveLeadResearch } from '../src/services/lead-research';
import { buildDemo, demoOptions } from '../src/demos/build';
import { qaDemo } from '../src/render/demo-qa';
import { approveDemo, publishDemo } from '../src/services/demo-review';
import { generateLetter } from '../src/render/letter';
import { assertLetterBinding } from '../src/letters/binding';
import { getProviders } from '../src/providers';
import { optOutLead } from '../src/services/suppression';
import { closeBrowser } from '../src/render/browser';
import { stopBoss } from '../src/queue';
import { randomToken } from '../src/util/crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resetDb, resetVariants } from './helpers';

beforeEach(async () => {
  await resetDb();
  await resetVariants();
  await updateConfig({ offers: { activeVersion: 'v4' }, targeting: { branches: DEFAULT_CONFIG.targeting.branches } }, 'test');
  await getDb().update(variants).set({ active: false, status: 'paused' }).where(eq(variants.kind, 'letter'));
  await getDb().update(variants).set({ active: true, status: 'active' }).where(eq(variants.name, 'V4 handwerk A'));
});
afterAll(async () => {
  await closeBrowser();
  await stopBoss();
  await resetDb();
  await resetVariants();
});
async function subject(branch = 'fliesenleger') {
  const [lead] = await getDb()
    .insert(leads)
    .values({
      source: 'osm',
      sourceId: randomToken(10),
      businessName:
        branch === 'maler'
          ? 'Fiktiver Renovierungsmaler'
          : branch === 'reinigung'
            ? 'Fiktive Büroreinigung'
            : 'Fiktiver Fliesenbetrieb',
      branch,
      branchGroup: 'handwerk',
      industry: 'handwerk',
      city: 'Fiktivstadt',
      street: 'Testweg',
      houseNumber: '1',
      postalCode: '12345',
      country: 'DE',
      phone: '+493012345678',
      status: 'qualified',
      businessStatus: 'OPERATIONAL',
      trackToken: randomToken(24),
      segmentKey: `fiktivstadt:handwerk:${branch}`,
    })
    .returning();
  return lead!;
}
function evidence(branch = 'fliesenleger'): Omit<LeadResearch, 'version' | 'identityHash' | 'checkedAt'> {
  const at = new Date(Date.now() - 60000).toISOString();
  const signal = (kind: LeadResearch['signals'][number]['kind'], text: string) => ({
    kind,
    text,
    source: 'review:explicit-fictional-fixture',
    observedAt: at,
    verified: true as const,
  });
  return {
    lawfulUseConfirmed: true,
    website: {
      result: 'not_found',
      checkedAt: at,
      source: 'review:fictional-website-search',
      methods: ['name_city', 'phone', 'directory_links', 'profile_links'],
    },
    signals: [
      signal('operational', 'Aktiver Testbetrieb'),
      signal('address', 'Anschrift im Testprofil geprüft'),
      signal('independent', 'Unabhängiger Testbetrieb'),
      signal(branch === 'reinigung' ? 'business_clients' : 'private_clients', 'Bestätigte Kundengruppe'),
      signal('service', branch === 'maler' ? 'Renovierungsanstriche' : branch === 'reinigung' ? 'Büroreinigung' : 'Badsanierung'),
      signal('service_advertising', 'Aktuelle Werbung im fiktiven Testprofil'),
    ],
  };
}
it('blocks an otherwise qualified real-source lead without explicit research at render/approval/send gate', async () => {
  const lead = await subject();
  await expect(assertLetterLeadEligible(getDb(), lead, await getConfig())).rejects.toThrow(/Akquiseprüfung/);
  await expect(buildDemo(lead.id, { actor: 'test' })).rejects.toThrow(/Akquiseprüfung/);
});
it('saves source-bound evidence and withdraws qualification when intent is removed', async () => {
  const lead = await subject();
  const original = evidence();
  expect((await saveLeadResearch(lead.id, original, 'test')).state).toBe('ready');
  await expect(assertLetterLeadEligible(getDb(), lead, await getConfig())).resolves.toBeUndefined();
  const noIntent = { ...original, signals: original.signals.filter((s) => s.kind !== 'service_advertising') };
  expect((await saveLeadResearch(lead.id, noIntent, 'test')).state).toBe('review');
  expect((await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))?.status).toBe('discovered');
  await expect(assertLetterLeadEligible(getDb(), lead, await getConfig())).rejects.toThrow(/Akquiseprüfung/);
});
it('keeps research private and removes it on existing opt-out/anonymization path', async () => {
  const lead = await subject();
  await saveLeadResearch(lead.id, evidence(), 'test');
  expect(await getSetting(leadResearchKey(lead.id), null)).not.toBeNull();
  await optOutLead(getDb(), lead.id, 'test', 'Fiktiver Opt-out-Test');
  expect(await getSetting(leadResearchKey(lead.id), null)).toBeNull();
});
it('rejects future research, unsafe references, unverified facts and oversized service titles', async () => {
  const lead = await subject();
  const original = evidence();
  await expect(saveLeadResearch(lead.id, { ...original, lawfulUseConfirmed: false as true }, 'test')).rejects.toThrow();
  await expect(
    saveLeadResearch(
      lead.id,
      { ...original, website: { ...original.website, source: 'https://x.test/?api_key=secret' } },
      'test',
    ),
  ).rejects.toThrow();
  await expect(
    saveLeadResearch(lead.id, { ...original, website: { ...original.website, checkedAt: '2099-01-01T00:00:00Z' } }, 'test'),
  ).rejects.toThrow(/zukünftigen/);
  const long = structuredClone(original);
  long.signals.find((s) => s.kind === 'service')!.text =
    'Ein viel zu langer und nicht sinnvoll gekürzter Leistungstitel für die Ansicht';
  await expect(saveLeadResearch(lead.id, long, 'test')).rejects.toThrow(/40/);
});
it.each(['maler', 'reinigung', 'fliesenleger'])(
  'injects source-backed %s services into the actual demo and matched letter',
  async (branch) => {
    const lead = await subject(branch);
    await saveLeadResearch(lead.id, evidence(branch), 'test');
    const id = await buildDemo(lead.id, { actor: 'test' });
    const demo = (await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))!;
    const content = demo.contentJson as unknown as SiteContent & { _meta: { researchHash: string } };
    const title = branch === 'maler' ? 'Renovierungsanstriche' : branch === 'reinigung' ? 'Büroreinigung' : 'Badsanierung';
    expect(content.services.map((s: { title: string }) => s.title)).toEqual([title]);
    const html = (await getProviders().storage.get(demo.htmlStorageKey!))!.toString();
    expect(html).toContain(title);
    expect(content.services.some((s) => s.title === 'Notdienst')).toBe(false);
    expect(content._meta.researchHash).toBeTruthy();
    const qa = await qaDemo(id, 'test', { lighthouse: false });
    expect(
      qa.checks.filter((c) => !c.passed),
      JSON.stringify(qa.checks.filter((c) => !c.passed)),
    ).toEqual([]);
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
    const generated = await generateLetter(lead.id, 1, { actor: 'test' });
    expect(generated.status, JSON.stringify([generated.issues, generated.truthCheck?.violations])).toBe('generated');
    expect(generated.issues).toEqual([]);
    const letter = (await getDb().query.letters.findFirst({ where: eq(letters.id, generated.letterId) }))!;
    expect(letter.truthCheckJson?._copy).toMatchObject({
      profile: branch === 'maler' ? 'painter-renovation' : branch === 'reinigung' ? 'cleaning-commercial' : 'tiling-renovation',
    });
    if (process.env.ACQUISITION_PROOFS_DIR) {
      const dir = process.env.ACQUISITION_PROOFS_DIR;
      mkdirSync(dir, { recursive: true });
      writeFileSync(`${dir}/${branch}-demo.html`, html);
      writeFileSync(`${dir}/${branch}-brief.pdf`, (await getProviders().storage.get(letter.pdfStorageKey!))!);
      const checked = (await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))!;
      for (const [suffix, key] of [
        ['desktop', checked.screenshotDesktopKey],
        ['mobil', checked.screenshotMobileKey],
      ]) {
        if (key) writeFileSync(`${dir}/${branch}-${suffix}.jpg`, (await getProviders().storage.get(key))!);
      }
    }
    const cfg = await getConfig();
    const boundLead = (await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))!;
    await assertLetterBinding(getDb(), letter, boundLead, cfg);
    const changed = evidence(branch);
    changed.signals.find((s) => s.kind === 'service')!.text =
      branch === 'maler'
        ? 'Anstriche bei Renovierung'
        : branch === 'reinigung'
          ? 'Büro- und Fensterreinigung'
          : 'Fliesen bei Badsanierung';
    await saveLeadResearch(lead.id, changed, 'test');
    await expect(assertLetterBinding(getDb(), letter, boundLead, cfg)).rejects.toThrow(/geändert/);
    await expect(generateLetter(lead.id, 1, { actor: 'test', regenerate: true })).rejects.toThrow(/recherche seit/i);
  },
  120000,
);
it('a generic demo facts checkbox never verifies missing operational/website/acquisition evidence', async () => {
  const lead = await subject('maler');
  // Explicitly use offline mock fixtures to create a demo without alleging real research.
  await getDb().update(leads).set({ source: 'mock' }).where(eq(leads.id, lead.id));
  await getDb()
    .update(leads)
    .set({
      scoreReasons: [
        { criterion: 'suitability', points: 0, verified: false, detail: 'Fiktiver unbestätigter Review' },
        { criterion: 'website', points: 0, verified: false, detail: 'Nicht geprüft' },
        { criterion: 'operational', points: 0, verified: false, detail: 'Nicht geprüft' },
      ],
    })
    .where(eq(leads.id, lead.id));
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
    },
  });
  const current = (await getDb().query.leads.findFirst({ where: eq(leads.id, lead.id) }))!;
  expect(current.scoreReasons?.find((r) => r.criterion === 'website')?.verified).toBe(false);
  expect(current.scoreReasons?.find((r) => r.criterion === 'operational')?.verified).toBe(false);
}, 120000);
it('keeps the same full costs and written purchase path before ordering for each target industry', async () => {
  for (const branch of ['maler', 'reinigung', 'fliesenleger']) {
    const d = demoOptions('fiktiver-' + branch, await getConfig());
    expect(d.offers?.map((o) => o.price.replace(/\s/g, ' '))).toEqual(['597 €', '597 €']);
    const all = JSON.stringify(d.offers);
    expect(all).toContain('19');
    expect(all).toContain('99');
    expect(all).toContain('Go-Live');
    expect(all).not.toContain('49 €');
    expect(all).not.toContain('590 €');
  }
});
it('catches the same business by phone despite a different source and changed address notation', async () => {
  const lead = await subject();
  await saveLeadResearch(lead.id, evidence(), 'test');
  await getDb()
    .insert(leads)
    .values({
      ...lead,
      id: undefined,
      source: 'mock',
      sourceId: randomToken(12),
      street: 'Anderer Testweg',
      postalCode: '99999',
      phone: '030 12345678',
      trackToken: randomToken(24),
    });
  await expect(assertLetterLeadEligible(getDb(), lead, await getConfig())).rejects.toThrow(/Dublette|dublette/);
});
