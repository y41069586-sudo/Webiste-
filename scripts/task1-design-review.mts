/** Task 1 only: existing generators/templates, fictional facts, no provider/DB calls. */
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { TEMPLATES, renderSite } from '../packages/templates/src';
import { demoInput } from '../packages/templates/test/fixtures';
import { libraryContent } from '../packages/core/src/demos/library';
import { demoOptions } from '../packages/core/src/demos/build';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { browserChecks, validateHtml, lighthouseCheck } from '../packages/core/src/render/qa';
import { imagesPainted } from '../packages/core/src/render/screenshots';
import { closeBrowser } from '../packages/core/src/render/browser';
process.env.APP_URL = 'http://127.0.0.1:3214';
process.env.DEMO_DOMAIN = '127.0.0.1:3214';
process.env.TRACK_DOMAIN = '127.0.0.1:3214';
const phase = process.argv.includes('--before') ? 'before' : 'after';
const root = 'data/exports/task1-design';
const out = `${root}/${phase}`;
mkdirSync(out, { recursive: true });
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
    intro: 'Fiktiver Testabsender. Kein echtes Angebot.',
  },
});
const profiles = [
  ['elektriker', 'Elektrobetrieb', 'Elektro Nordlicht', 'Lübeck'],
  ['maler', 'Malerbetrieb', 'Farbwerk Linde', 'Bamberg'],
  ['sanitaer', 'Sanitärbetrieb', 'Wasserwerk West', 'Bonn'],
  ['kosmetikstudio', 'Kosmetikstudio', 'Studio Hautzeit', 'Fulda'],
  ['nagelstudio', 'Nagelstudio', 'Nagelatelier Feinschliff', 'Celle'],
  ['barber', 'Barbershop', 'Barber Kontur', 'Essen'],
  ['restaurant', 'Restaurant', 'Restaurant Abendtisch', 'Regensburg'],
  ['cafe', 'Café', 'Café Mohnblüte', 'Tübingen'],
  ['bistro', 'Bistro', 'Bistro Marktseite', 'Mainz'],
  ['blumenladen', 'Blumenladen', 'Blütenraum', 'Erfurt'],
  ['boutique', 'Modegeschäft', 'Kontur & Stoff', 'Würzburg'],
  ['buchladen', 'Buchhandlung', 'Buchwinkel', 'Göttingen'],
  ['yogastudio', 'Yogastudio', 'Studio Atemraum', 'Kassel'],
  ['fitnessstudio', 'Trainingsstudio', 'Trainingsraum West', 'Aachen'],
  ['tanzschule', 'Tanzschule', 'Tanzatelier Schrittwerk', 'Ulm'],
  ['gartenbau', 'Garten- und Landschaftsbau', 'Gartenwerk Grünraum', 'Potsdam'],
  ['friseur', 'Friseursalon', 'Salon Schnittpunkt', 'Dresden'],
  ['restaurant', 'Restaurant', 'Kleine Tafel', 'Koblenz'],
  ['buchladen', 'Buchhandlung', 'Seitenraum', 'Jena'],
  ['musikschule', 'Musikschule', 'Musikatelier Klangraum', 'Passau'],
] as const;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const results = [];
try {
  for (const [i, t] of TEMPLATES.entries()) {
    const [branch, label, name, city] = profiles[i]!;
    const input = structuredClone(demoInput(t.id, t.palettes[0]!, t.group));
    input.facts = {
      ...input.facts,
      name,
      branchLabel: label,
      city,
      street: 'Testweg',
      houseNumber: String(i + 1),
      postalCode: '12345',
      phone: '030 00000000',
      phoneHref: 'tel:+493000000000',
    };
    input.content = libraryContent(branch, t.group, { name, stadt: city, branche: label }, i);
    input.demo = { ...demoOptions(`task1-test-${i}`, cfg), expiresLabel: '26. November 2026' };
    const html = renderSite(input).replace(
      'Unverbindlicher Website-Entwurf',
      'Fiktiver Testbetrieb · Unverbindlicher Website-Entwurf',
    );
    writeFileSync(`${out}/${t.id}.html`, html);
    writeFileSync(`${out}/${t.id}-input.json`, JSON.stringify(input, null, 2));
    const ctx = await browser.newContext();
    await ctx.route(/^https?:/, (r) => r.abort());
    const page = await ctx.newPage();
    const geometry = [];
    for (const width of phase === 'before' ? [1440, 390] : [1440, 360, 390, 430]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.setContent(html);
      await imagesPainted(page);
      await page.evaluate(() => document.fonts.ready);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        broken: [...document.images].filter((i) => !i.complete || !i.naturalWidth).length,
      }));
      await page.screenshot({ path: `${out}/${t.id}-${width}.jpg`, type: 'jpeg', quality: 88, fullPage: true });
      geometry.push({ width, ...layout });
    }
    let checks: Awaited<ReturnType<typeof browserChecks>> = [];
    if (phase === 'after') {
      checks = [await validateHtml(html), ...(await browserChecks({ html, expectedFacts: { name, city } }))];
      const stress = structuredClone(input);
      stress.facts.name = 'Fiktiver Fachbetrieb für Beratung, Gestaltung und ausführliche Unternehmensbezeichnungen';
      stress.content.hero_headline = 'Ausführliche Informationen zu Ihrem Betrieb und den angebotenen Leistungen vor Ort';
      const stressHtml = renderSite(stress);
      await page.setViewportSize({ width: 360, height: 844 });
      await page.setContent(stressHtml);
      await imagesPainted(page);
      geometry.push({
        width: 360,
        stress: true,
        overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        broken: 0,
      });
      await page.screenshot({ path: `${out}/${t.id}-long-360.jpg`, type: 'jpeg', quality: 82, fullPage: true });
    }
    if (phase === 'after') {
      const stress = structuredClone(input);
      stress.facts.name = 'Fiktiver Fachbetrieb für Beratung, Gestaltung und ausführliche Unternehmensbezeichnungen';
      stress.content.hero_headline = 'Ausführliche Informationen zu Ihrem Betrieb und den angebotenen Leistungen vor Ort';
      checks.push(...(await browserChecks({ html: renderSite(stress) })).map((c) => ({ ...c, name: 'long-' + c.name })));
      const previousImageDir = process.env.TEMPLATES_IMAGES_DIR;
      process.env.TEMPLATES_IMAGES_DIR = `${root}/empty-images`;
      mkdirSync(process.env.TEMPLATES_IMAGES_DIR, { recursive: true });
      let emptyHtml: string;
      try {
        emptyHtml = renderSite(input);
      } finally {
        if (previousImageDir === undefined) delete process.env.TEMPLATES_IMAGES_DIR;
        else process.env.TEMPLATES_IMAGES_DIR = previousImageDir;
      }
      writeFileSync(`${out}/${t.id}-no-images.html`, emptyHtml);
      checks.push(...(await browserChecks({ html: emptyHtml })).map((c) => ({ ...c, name: 'no-images-' + c.name })));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.setContent(emptyHtml);
      await imagesPainted(page);
      await page.screenshot({ path: `${out}/${t.id}-no-images-390.jpg`, type: 'jpeg', quality: 85, fullPage: true });
    }
    results.push({ template: t.id, name, branch, label, city, geometry, checks, visualApproved: false });
    writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
    await ctx.close();
    console.log(
      phase,
      t.id,
      checks.filter((c) => !c.passed).map((c) => c.name),
    );
  }
  // Representative mobile lab checks, not field data or a promised conversion lift.
  if (phase === 'after') {
    const perf = [];
    for (const id of ['handwerk-klar', 'beauty-elegant', 'gastronomie-foto', 'einzelhandel-magazin', 'kurse-split']) {
      perf.push({
        id,
        before: await lighthouseCheck(readFileSync(`${root}/before/${id}.html`, 'utf8'), 0),
        after: await lighthouseCheck(readFileSync(`${out}/${id}.html`, 'utf8'), 0),
      });
      writeFileSync(`${out}/performance.json`, JSON.stringify(perf, null, 2));
    }
  }
} finally {
  await browser.close();
  await closeBrowser();
}
