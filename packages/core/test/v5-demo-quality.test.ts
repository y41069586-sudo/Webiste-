import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { getConfig, updateConfig } from '../src/config/service';
import { getProviders } from '../src/providers';
import { buildDemo } from '../src/demos/build';
import { qaDemo } from '../src/render/demo-qa';
import { closeBrowser, withPage } from '../src/render/browser';
import { stopBoss } from '../src/queue';
import { randomToken } from '../src/util/crypto';
import { approveDemo } from '../src/services/demo-review';
import { resetDb } from './helpers';

const cases = [
  ['maler', 'handwerk', 'handwerk-solid', 'Malerei Fiktiv'],
  ['elektriker', 'handwerk', 'handwerk-klar', 'Fiktive Elektrotechnikgemeinschaft an der langen Stadtpromenade'],
  ['kosmetikstudio', 'beauty', 'beauty-elegant', 'Studio Fiktiv'],
  ['nagelstudio', 'beauty', 'beauty-modern', 'Fiktives Nagelatelier und Studio für Gestaltung'],
  ['restaurant', 'gastronomie', 'gastronomie-split', 'Fiktives Restaurant am Fluss'],
  ['cafe', 'gastronomie', 'gastronomie-foto', 'Fiktives Café mit besonders langem Namen'],
  ['blumenladen', 'einzelhandel', 'einzelhandel-magazin', 'Blumen Fiktiv'],
  ['modegeschaeft', 'einzelhandel', 'einzelhandel-foto', 'Fiktives Geschäft für Kleidung und Accessoires'],
  ['yogastudio', 'kurse', 'kurse-split', 'Yoga Fiktiv'],
  ['tanzschule', 'kurse', 'kurse-plakat', 'Fiktive Tanzschule an der langen Promenade'],
] as const;
const out = path.resolve('../../data/exports/v5-quality');
describe('V5: zehn fiktive Demos durch bestehenden Generator und echte Browser-QA', () => {
  beforeAll(async () => {
    await resetDb();
    await updateConfig({ offers: { activeVersion: 'v4' } }, 'test:quality');
    await mkdir(out, { recursive: true });
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await closeBrowser();
    await stopBoss();
  });
  it('erzeugt Desktop- und Mobilbilder, prüft QA und erhält die manuelle Freigabesperre', async () => {
    const results = [];
    for (const [index, [branch, group, templateId, name]] of cases.entries()) {
      const [lead] = await getDb()
        .insert(leads)
        .values({
          source: 'mock',
          sourceId: randomToken(16),
          businessName: name,
          branch,
          branchGroup: group,
          industry: group === 'kurse' ? 'kurse_training' : group,
          city: index % 2 ? 'Fiktivstadt an der langen Flusspromenade' : 'Musterstadt',
          street: 'Fiktiver Musterweg',
          houseNumber: '1',
          postalCode: '12345',
          status: 'qualified',
          segmentKey: `fictional:${group}:${branch}`,
          trackToken: randomToken(24),
          phone: index % 3 ? null : '+493000000000',
        })
        .returning();
      let spy;
      if (index === 0)
        spy = vi
          .spyOn(getProviders().llm, 'generateStructured')
          .mockResolvedValueOnce({
            data: {},
            usage: { model: 'mock:invalid', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          })
          .mockResolvedValueOnce({
            data: {},
            usage: { model: 'mock:invalid', inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          });
      const id = await buildDemo(lead!.id, { actor: 'test:quality', templateId });
      spy?.mockRestore();
      const qa = await qaDemo(id, 'test:quality', { lighthouse: false });
      const demo = (await getDb().query.demos.findFirst({ where: eq(demos.id, id) }))!;
      const html = (await getProviders().storage.get(demo.htmlStorageKey!))!.toString();
      const images: { device: string; overflow: boolean; broken: boolean }[] = [];
      for (const [device, width, height] of [
        ['desktop', 1440, 1000],
        ['mobile', 390, 844],
      ] as const) {
        await withPage({ width, height }, async (page) => {
          await page.setContent(html, { waitUntil: 'load' });
          await page.evaluate(() => document.fonts.ready);
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
          const broken = await page.evaluate(() => [...document.images].some((i) => !i.complete || i.naturalWidth === 0));
          await page.screenshot({ path: path.join(out, `${index + 1}-${templateId}-${device}.png`), fullPage: true });
          images.push({ device, overflow, broken });
        });
      }
      results.push({
        id,
        index,
        templateId,
        group,
        name,
        source: (demo.contentJson?._meta as { source?: string })?.source,
        technicalPassed: qa.passed,
        checks: qa.checks,
        images,
        manualApproved: false,
        sendReady: false,
      });
      await writeFile(path.join(out, 'matrix.json'), JSON.stringify(results, null, 2));
      expect(
        qa.checks.filter((c) => !c.passed),
        `${templateId} QA`,
      ).toEqual([]);
      expect(images.every((i) => !i.overflow && !i.broken)).toBe(true);
      await expect(approveDemo(id, 'test:unreviewed', { manual: true })).rejects.toThrow(/manuell/);
      if (index === 0) expect((demo.contentJson?._meta as { source?: string })?.source).toBe('fallback');
    }
    expect(results).toHaveLength(10);
    expect((await getConfig()).review.manualReviewFirstN).toBeGreaterThanOrEqual(30);
  }, 240_000);
});
