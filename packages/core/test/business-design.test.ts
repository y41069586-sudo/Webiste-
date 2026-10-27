import { readFileSync } from 'node:fs';
import { eq, inArray } from 'drizzle-orm';
import { beforeEach, afterAll, expect, it, vi } from 'vitest';
import { getDb } from '../src/db/client';
import { leads, settings, demos } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { saveBusinessDesignEvidence, resolveBusinessDesign, businessDesignEvidence, hintKey } from '../src/demos/business-design';
import { setSetting, getSetting } from '../src/config/service';
import { optOutLead, anonymizeLead } from '../src/services/suppression';
import { closeBrowser } from '../src/render/browser';
import { randomToken } from '../src/util/crypto';
import { resetDb } from './helpers';
import { buildDemo } from '../src/demos/build';
import { stopBoss } from '../src/queue';
beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb();
});
afterAll(async () => {
  await closeBrowser();
  await stopBoss();
});
async function lead() {
  const [l] = await getDb()
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Fiktives Café am Markt',
      branch: 'cafe',
      branchGroup: 'gastronomie',
      city: 'Testort',
      segmentKey: 'test:cafe',
      trackToken: randomToken(24),
      status: 'qualified',
    })
    .returning();
  return l!;
}
function evidence(notes = 'warme Hölzer und gemütliche Materialien', displayPermission = false) {
  return {
    sourceRef: 'https://source.example.test/reference',
    sourceKind: 'owner_provided' as const,
    notes,
    analysisPermission: true,
    displayPermission,
    files: [] as { data: Buffer; alt: string }[],
  };
}
it('keeps absence of evidence an explicit proposal, not a researched business character', async () => {
  const l = await lead();
  const p = await resolveBusinessDesign(l);
  expect(p.direction.source).toBe('industry_proposal');
  expect(p.photos).toEqual([]);
  expect(p.requiresReview).toBe(true);
});
it('uses fresh source colour hints without claiming photographic analysis', async () => {
  const l = await lead();
  await setSetting(
    hintKey(l.id),
    { primaryColor: '#123456', sourceRef: 'https://openstreetmap.org/node/123', checkedAt: new Date().toISOString() },
    'test',
  );
  expect((await resolveBusinessDesign(l)).direction).toMatchObject({ source: 'source_hint', primaryColor: '#123456' });
  await setSetting(hintKey(l.id), { primaryColor: '#123456', checkedAt: '2020-01-01' }, 'test');
  expect((await resolveBusinessDesign(l)).direction.source).toBe('industry_proposal');
});
it('coalesces parallel analyses and caches responses without charging fictitious calls', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  const spy = vi.spyOn(getProviders().llm, 'generateStructured');
  const [a, b] = await Promise.all([resolveBusinessDesign(l), resolveBusinessDesign(l)]);
  expect(a).toEqual(b);
  expect(a.direction).toMatchObject({ source: 'business_evidence', character: 'warm' });
  await resolveBusinessDesign(l);
  expect(spy).toHaveBeenCalledTimes(1);
  await saveBusinessDesignEvidence(l.id, evidence('dunkel und urban'), 'test');
  expect((await resolveBusinessDesign(l)).direction.character).toBe('urban');
  expect(spy).toHaveBeenCalledTimes(2);
});
it('never fetches source URLs and requires permission, valid files and source references without secrets', async () => {
  const l = await lead();
  await expect(saveBusinessDesignEvidence(l.id, { ...evidence(), analysisPermission: false }, 'test')).rejects.toThrow(
    /Berechtigung/,
  );
  await expect(
    saveBusinessDesignEvidence(l.id, { ...evidence(), sourceRef: 'https://user:secret@example.test' }, 'test'),
  ).rejects.toThrow();
  await expect(
    saveBusinessDesignEvidence(l.id, { ...evidence(), files: [{ data: Buffer.from('<html>'), alt: 'not a photo' }] }, 'test'),
  ).rejects.toThrow();
  expect(await businessDesignEvidence(l.id)).toBeNull();
});
it('sends actual re-encoded image bytes to the mocked provider while keeping display rights separate', async () => {
  const l = await lead();
  const data = readFileSync('../templates/assets/images/beauty/barber-werkzeug.jpg');
  await saveBusinessDesignEvidence(l.id, { ...evidence(), files: [{ data, alt: 'Fiktive Testreferenz' }] }, 'test');
  const spy = vi.spyOn(getProviders().llm, 'generateStructured');
  const a = await resolveBusinessDesign(l);
  expect(spy.mock.calls[0]![0].images?.[0]?.mediaType).toBe('image/jpeg');
  expect(spy.mock.calls[0]![0].images?.[0]?.data.length).toBeGreaterThan(1000);
  expect(a.photos).toEqual([]);
  await saveBusinessDesignEvidence(l.id, { ...evidence('warm', true), files: [{ data, alt: 'Fiktive Testreferenz' }] }, 'test');
  expect((await resolveBusinessDesign(l)).photos[0]).toMatchObject({ rightsConfirmed: true, origin: 'business' });
});
it('does not trust a malformed or low-confidence model response', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  const spy = vi.spyOn(getProviders().llm, 'generateStructured').mockResolvedValueOnce({
    data: { character: 'bad' },
    usage: { model: 'mock', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  await expect(resolveBusinessDesign(l)).rejects.toThrow();
  spy.mockRestore();
  expect((await resolveBusinessDesign(l)).direction.source).toBe('business_evidence');
});
it.each([
  { sufficient: false, confidence: 'high', colors: 'Fiktiv dunkle Gestaltung', atmosphere: 'Fiktiv ruhiger Raum' },
  { sufficient: true, confidence: 'high', colors: 'Nur eine bestätigte Farbe', atmosphere: null },
  { sufficient: true, confidence: 'low', colors: 'Unsicherer Farbeindruck', atmosphere: 'Unsicherer Raumeindruck' },
])('does not invent a complete business vibe from an insufficient or uncertain finding: %j', async (finding) => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  const spy = vi.spyOn(getProviders().llm, 'generateStructured').mockResolvedValueOnce({
    data: {
      character: 'urban',
      typography: 'grotesk',
      composition: 'poster',
      primaryColor: '#ff00ff',
      imageMood: 'dark',
      confidence: finding.confidence,
      evidenceSufficient: finding.sufficient,
      observations: { colors: finding.colors, typography: null, atmosphere: finding.atmosphere, composition: null },
      reasons: ['Ausdrücklich fiktiver Prüfbefund'],
    },
    usage: { model: 'mock', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  const result = await resolveBusinessDesign(l);
  expect(result.direction.source).toBe('industry_proposal');
  expect(result.direction.primaryColor).toBeUndefined();
  expect(result.requiresReview).toBe(true);
  await resolveBusinessDesign(l);
  expect(spy).toHaveBeenCalledTimes(1);
});
it('keeps unobserved brand colours and typography unknown even when other style dimensions are supported', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  vi.spyOn(getProviders().llm, 'generateStructured').mockResolvedValueOnce({
    data: {
      character: 'urban',
      typography: 'grotesk',
      composition: 'poster',
      primaryColor: '#ff00ff',
      imageMood: 'dark',
      confidence: 'high',
      evidenceSufficient: true,
      observations: {
        colors: null,
        typography: null,
        atmosphere: 'Fiktiv dunkler Raumeindruck',
        composition: 'Fiktive markante Bildaufteilung',
      },
      reasons: ['Ausdrücklich fiktiver Prüfbefund'],
    },
    usage: { model: 'mock', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
  });
  const result = await resolveBusinessDesign(l);
  expect(result.direction.source).toBe('business_evidence');
  expect(result.direction.primaryColor).toBeUndefined();
  expect(result.direction.typography).toBe('editorial');
  expect(result.direction.composition).toBe('poster');
  const cache = await getSetting<{ observations: { colors: unknown; typography: unknown } } | null>(
    `lead-design-result:${l.id}`,
    null,
  );
  expect(cache?.observations.colors).toBeNull();
  expect(cache?.observations.typography).toBeNull();
});
it('opt-out removes design sources/cache and prevents a delayed model response from restoring them', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  const provider = getProviders().llm;
  const original = provider.generateStructured.bind(provider);
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((r) => (started = r));
  const gate = new Promise<void>((r) => (release = r));
  vi.spyOn(provider, 'generateStructured').mockImplementation(async (req) => {
    const result = await original(req);
    started();
    await gate;
    return result;
  });
  const task = resolveBusinessDesign(l);
  const rejected = expect(task).rejects.toThrow(/gesperrt/);
  await ready;
  await optOutLead(getDb(), l.id, 'test', 'test opt-out');
  release();
  await rejected;
  const rows = await getDb()
    .select()
    .from(settings)
    .where(inArray(settings.key, [`lead-design-evidence:${l.id}`, `lead-design-result:${l.id}`]));
  expect(rows).toEqual([]);
  expect((await getDb().query.leads.findFirst({ where: eq(leads.id, l.id) }))?.status).toBe('suppressed');
});
it('rejects references crossing lead boundaries and expired non-owner evidence', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  const saved = await getSetting<Record<string, unknown>>(`lead-design-evidence:${l.id}`, {});
  await setSetting(
    `lead-design-evidence:${l.id}`,
    { ...saved, images: [{ key: 'lead-design/another-lead/photo.jpg', alt: 'bad' }] },
    'test',
  );
  expect(await businessDesignEvidence(l.id)).toBeNull();
  await setSetting(
    `lead-design-evidence:${l.id}`,
    { ...saved, sourceKind: 'licensed_reference', checkedAt: '2020-01-01T00:00:00.000Z' },
    'test',
  );
  expect(await businessDesignEvidence(l.id)).toBeNull();
});

it('also removes design references on retention anonymization', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence(), 'test');
  await resolveBusinessDesign(l);
  await anonymizeLead(getDb(), l.id);
  expect(await businessDesignEvidence(l.id)).toBeNull();
  expect(await getSetting(`lead-design-result:${l.id}`, null)).toBeNull();
});

it('passes the evidence-derived style into the real existing demo generator and immutable HTML metadata', async () => {
  const l = await lead();
  await saveBusinessDesignEvidence(l.id, evidence('dunkel und urban'), 'test');
  const id = await buildDemo(l.id, { actor: 'test:vibe' });
  const demo = (await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))!;
  expect((demo.contentJson?._meta as { artDirection: { character: string } }).artDirection.character).toBe('urban');
  const html = (await getProviders().storage.get(demo.htmlStorageKey!))!.toString();
  expect(html).toContain('data-character="urban"');
  expect(html).toContain(l.businessName);
  expect(html).not.toContain('KI-generiertes Beispielbild');
  expect(demo.approvedAt).toBeNull();
});

it('cannot recreate demo content after opt-out while the content model is still running', async () => {
  const l = await lead();
  const provider = getProviders().llm;
  const original = provider.generateStructured.bind(provider);
  let release!: () => void;
  let started!: () => void;
  const ready = new Promise<void>((r) => (started = r));
  const gate = new Promise<void>((r) => (release = r));
  vi.spyOn(provider, 'generateStructured').mockImplementation(async (req) => {
    const result = await original(req);
    started();
    await gate;
    return result;
  });
  const task = buildDemo(l.id, { actor: 'test:race' });
  const rejection = expect(task).rejects.toThrow(/gesperrt/);
  await ready;
  await optOutLead(getDb(), l.id, 'test', 'opt-out during content generation');
  release();
  await rejection;
  expect(await getDb().select().from(demos).where(eq(demos.leadId, l.id))).toEqual([]);
});
