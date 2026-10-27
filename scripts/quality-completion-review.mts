/** Reproducible fictional primary-sector proofs. No database, model or vendor calls. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { TEMPLATES, renderSite, industryDirection } from '../packages/templates/src';
import { libraryContent } from '../packages/core/src/demos/library';
import { verifiedServiceFallback } from '../packages/core/src/demos/content';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { imagesPainted } from '../packages/core/src/render/screenshots';
import { browserChecks } from '../packages/core/src/render/qa';
import { closeBrowser } from '../packages/core/src/render/browser';
const phase = process.argv.includes('--before') ? 'before' : 'after';
const out = `data/exports/quality-2026-10-27/${phase}`;
mkdirSync(out, { recursive: true });
const cfg = deepMerge(DEFAULT_CONFIG, {
  offers: { activeVersion: 'v4' },
  sender: {
    name: 'Erika Beispiel',
    company: 'SeitenWerk Testabsender',
    street: 'Testweg 1',
    postalCode: '12345',
    city: 'Fiktivstadt',
    email: 'support@example.test',
    phone: '+493000000000',
    website: 'example.test',
  },
});
const cases = [
  ['Farbwerk Linde', 'maler', 'Malerbetrieb', 'handwerk-klar', ['Innenanstriche', 'Tapezierarbeiten']],
  ['Malerei Raum & Kontur', 'maler', 'Malerbetrieb', 'handwerk-solid', ['Fassadenanstriche', 'Lackierarbeiten']],
  [
    'Malerei für Renovierung und Wandgestaltung an der Alten Mühle',
    'maler',
    'Malerbetrieb',
    'handwerk-werkstatt',
    ['Innenanstriche', 'Renovierungsarbeiten'],
  ],
  ['Objektpflege Klarraum', 'reinigung', 'Gebäudereinigung', 'handwerk-solid', ['Büroreinigung', 'Treppenhausreinigung']],
  ['Fensterklar West', 'reinigung', 'Gebäudereinigung', 'handwerk-klar', ['Fensterreinigung', 'Glasreinigung']],
  [
    'Reinigungsdienst für kleine Gewerbeobjekte & Büros',
    'reinigung',
    'Gebäudereinigung',
    'handwerk-werkstatt',
    ['Büroreinigung', 'Unterhaltsreinigung'],
  ],
  ['Fliesenatelier Fuge', 'fliesenleger', 'Fliesenleger', 'handwerk-klar', ['Fliesenverlegung', 'Badsanierung']],
  ['Fliesenwerk Stein & Maß', 'fliesenleger', 'Fliesenleger', 'handwerk-solid', ['Bodenfliesen', 'Wandfliesen']],
  [
    'Fliesen und Renovierung an der Alten Werkstatt',
    'fliesenleger',
    'Fliesenleger',
    'handwerk-werkstatt',
    ['Fliesenverlegung', 'Fugensanierung'],
  ],
  ['Farbpunkt', 'maler', 'Malerbetrieb', 'handwerk-plakat', ['Innenanstriche']],
] as const;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
try {
  for (const [i, [name, key, label, templateId, services]] of cases.entries()) {
    const id = String(i + 1).padStart(2, '0');
    const template = TEMPLATES.find((t) => t.id === templateId)!;
    const stored = `${out}/${id}-input.json`;
    const input =
      phase === 'after'
        ? JSON.parse(readFileSync(stored.replace('/after/', '/before/'), 'utf8'))
        : {
            templateId,
            palette: template.palettes[0],
            mode: 'demo',
            artDirection: industryDirection('handwerk', key),
            facts: {
              name,
              branchLabel: label,
              group: 'handwerk',
              city: 'Fiktivstadt',
              street: 'Fiktiver Testweg',
              houseNumber: String(i + 1),
              postalCode: '12345',
              phone: null,
              openingLines: [],
              verifiedServices: [...services],
            },
            content: libraryContent(key, 'handwerk', { name, stadt: 'Fiktivstadt', branche: label }, i),
            demo: { ...demoOptions(`quality-${id}`, cfg), expiresLabel: '26. November 2026' },
          };
    input.content = verifiedServiceFallback(input.content, {
      name,
      branchLabel: label,
      branchKey: key,
      group: 'handwerk',
      city: 'Fiktivstadt',
      postalCode: '12345',
      street: 'Fiktiver Testweg',
      houseNumber: String(i + 1),
      phone: null,
      hasOpeningHours: false,
      socialOnly: false,
      verifiedServices: [...services],
    });
    const html = renderSite(input);
    writeFileSync(stored, JSON.stringify(input, null, 2));
    writeFileSync(`${out}/${id}.html`, html);
    const page = await browser.newPage();
    await page.route(/^https?:/, (r) => r.abort());
    const geometry = [];
    for (const width of [1440, 360, 390, 430]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.setContent(html);
      await imagesPainted(page);
      await page.evaluate(() => document.fonts.ready);
      geometry.push(
        await page.evaluate(() => ({
          width: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          brokenImages: [...document.images].filter((i) => !i.naturalWidth).length,
          images: document.images.length,
        })),
      );
      await page.screenshot({ path: `${out}/${id}-${width}.jpg`, fullPage: true, type: 'jpeg', quality: 83 });
      if (width === 1440 || width === 390)
        await page.screenshot({ path: `${out}/${id}-hero-${width}.jpg`, type: 'jpeg', quality: 88 });
    }
    const checks = phase === 'after' ? await browserChecks({ html, expectedFacts: { name, city: 'Fiktivstadt' } }) : [];
    await page.close();
    results.push({ id, name, templateId, key, services, geometry, checks, visualApproved: false });
    writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
    console.log(
      phase,
      id,
      templateId,
      geometry.some((g) => g.overflow || g.brokenImages),
      checks.filter((c) => !c.passed).map((c) => c.name),
    );
  }
} finally {
  await browser.close();
  await closeBrowser();
}
