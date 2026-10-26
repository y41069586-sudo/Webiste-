/** Existing templates only: no redesign transfer, data access or external requests. */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { TEMPLATES, renderSite } from '../packages/templates/src';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { libraryContent } from '../packages/core/src/demos/library';
import { demoInput } from '../packages/templates/test/fixtures';
process.env.APP_URL = 'http://127.0.0.1:3214';
process.env.DEMO_DOMAIN = '127.0.0.1:3214';
process.env.TRACK_DOMAIN = '127.0.0.1:3214';
const cfg = deepMerge(DEFAULT_CONFIG, {
  offers: { activeVersion: 'v4' },
  sender: {
    name: 'Erika Beispiel',
    company: 'SeitenWerk Testabsender',
    street: 'Testweg 1',
    postalCode: '12345',
    city: 'Testort',
    email: 'support@example.test',
    phone: '+493000000000',
    website: 'example.test',
    intro: 'Fiktive Testdaten. Kein echtes Angebot.',
  },
});
const out = 'data/exports/premium-completion/template-matrix-final';
mkdirSync(out, { recursive: true });
let browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
let page = await browser.newPage();
await page.route(/^https?:/, (r) => r.abort());
const matrix = [];
try {
  for (const t of TEMPLATES) {
    const row = { template: t.id, states: [] as object[] };
    try {
      for (const state of ['normal', 'long', 'no-images']) {
        const input = structuredClone(demoInput(t.id, t.palettes[0]!, t.group));
        const branches = {
          handwerk: 'maler',
          beauty: 'kosmetikstudio',
          gastronomie: 'restaurant',
          einzelhandel: 'blumenladen',
          kurse: 'tanzschule',
        };
        input.facts.name = 'Fiktiver Testbetrieb';
        input.facts.city = 'Testort';
        input.facts.branchLabel = branches[t.group];
        input.content = libraryContent(
          branches[t.group],
          t.group,
          { name: input.facts.name, stadt: input.facts.city, branche: input.facts.branchLabel },
          0,
        );
        input.demo = { ...demoOptions('fictional-template-matrix', cfg), expiresLabel: '26. November 2026' };
        if (state === 'long') {
          input.facts.name = 'Fiktiver Testbetrieb für Gestaltung und außergewöhnlich lange Unternehmensbezeichnungen';
          input.content.hero_headline = 'Persönliche Informationen und ausführliche Leistungen für Ihren Betrieb vor Ort';
          input.content.services = [...input.content.services, ...input.content.services];
        }
        let html = renderSite(input);
        if (state === 'no-images')
          html = html.replace(/<figure\b[\s\S]*?<\/figure>/g, '<p>Bildmaterial wird vor Veröffentlichung abgestimmt.</p>');
        writeFileSync(`${out}/${t.id}-${state}.html`, html);
        for (const width of [1440, 360, 390, 430]) {
          await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
          await page.setContent(html);
          await page.evaluate(() => document.fonts.ready);
          const issues = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            brokenImages: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
          }));
          if (!existsSync(`${out}/${t.id}-${state}-${width}.jpg`)) {
            try {
              await page.screenshot({ path: `${out}/${t.id}-${state}-${width}.jpg`, type: 'jpeg', quality: 75, fullPage: true });
            } catch {
              Object.assign(issues, { fullScreenshotFailed: true });
            }
          }
          row.states.push({ state, width, ...issues });
        }
      }
    } catch (error) {
      row.states.push({ error: String(error) });
    }
    await browser.close().catch(() => undefined);
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
    page = await browser.newPage();
    await page.route(/^https?:/, (r) => r.abort());
    matrix.push(row);
    writeFileSync(`${out}/checks.json`, JSON.stringify({ matrix, visualApproved: false }, null, 2));
    console.log(t.id);
  }
  writeFileSync(
    `${out}/checks.json`,
    JSON.stringify(
      { matrix, visualApproved: false, scope: 'Geometry and actual renders; manual visual approval remains separate.' },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
