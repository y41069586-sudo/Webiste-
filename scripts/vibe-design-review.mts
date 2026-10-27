/** Local visual verification; no DB or external provider calls. Fictional source inputs only. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { libraryContent } from '../packages/core/src/demos/library';
import { TEMPLATES, renderSite, industryDirection } from '../packages/templates/src';
import { imagesPainted } from '../packages/core/src/render/screenshots';
import { browserChecks, lighthouseCheck } from '../packages/core/src/render/qa';
import { closeBrowser } from '../packages/core/src/render/browser';
const out = process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'data/exports/vibe-upgrade';
mkdirSync(out, { recursive: true });
const quick = process.argv.includes('--quick');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const results = process.argv.includes('--resume') ? JSON.parse(readFileSync(`${out}/checks.json`, 'utf8')) : [];
try {
  for (const t of TEMPLATES.filter(
    (t) => !quick || ['handwerk-klar', 'beauty-modern', 'gastronomie-foto', 'einzelhandel-magazin', 'kurse-split'].includes(t.id),
  )) {
    if (results.some((row: { template: string }) => row.template === t.id)) continue;
    const input = JSON.parse(readFileSync(`data/exports/task1-design/after/${t.id}-input.json`, 'utf8'));
    const baseline = JSON.parse(readFileSync('data/exports/task1-design/after/checks.json', 'utf8')).find(
      (row: { template: string }) => row.template === t.id,
    );
    input.content = libraryContent(
      baseline.branch,
      t.group,
      { name: input.facts.name, stadt: input.facts.city, branche: input.facts.branchLabel },
      TEMPLATES.indexOf(t),
    );
    const direction = industryDirection(t.group, input.facts.branchLabel);
    input.artDirection = direction;
    const html = renderSite(input);
    writeFileSync(`${out}/${t.id}.html`, html);
    const context = await browser.newContext();
    await context.route(/^https?:/, (r) => r.abort());
    const page = await context.newPage();
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
          broken: [...document.images].filter((i) => !i.naturalWidth).length,
          h1Font: getComputedStyle(document.querySelector('h1')!).fontFamily,
          remoteImages: [...document.images].filter((i) => /^https?:/.test(i.src)).length,
        })),
      );
      await page.screenshot({ path: `${out}/${t.id}-${width}.jpg`, type: 'jpeg', quality: 85, fullPage: true });
      if (width === 1440 || width === 390)
        await page.screenshot({ path: `${out}/${t.id}-hero-${width}.jpg`, type: 'jpeg', quality: 90 });
    }
    const checks = quick ? [] : await browserChecks({ html, expectedFacts: { name: input.facts.name, city: input.facts.city } });
    if (!quick)
      for (const state of ['long', 'no-images']) {
        const stress = structuredClone(input);
        if (state === 'long') {
          stress.facts.name = 'Fiktiver Fachbetrieb für Beratung, Gestaltung und ausführliche Unternehmensbezeichnungen';
          stress.content.hero_headline = stress.facts.name;
        }
        const previous = process.env.TEMPLATES_IMAGES_DIR;
        if (state === 'no-images') {
          process.env.TEMPLATES_IMAGES_DIR = `${out}/empty-images`;
          mkdirSync(process.env.TEMPLATES_IMAGES_DIR, { recursive: true });
        }
        let stressHtml: string;
        try {
          stressHtml = renderSite(stress);
        } finally {
          if (previous === undefined) delete process.env.TEMPLATES_IMAGES_DIR;
          else process.env.TEMPLATES_IMAGES_DIR = previous;
        }
        await page.setViewportSize({ width: 360, height: 844 });
        await page.setContent(stressHtml);
        await imagesPainted(page);
        await page.evaluate(() => document.fonts.ready);
        geometry.push(
          await page.evaluate(() => ({
            width: innerWidth,
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            broken: [...document.images].filter((i) => !i.naturalWidth).length,
            h1Font: getComputedStyle(document.querySelector('h1')!).fontFamily,
            remoteImages: [...document.images].filter((i) => /^https?:/.test(i.src)).length,
          })),
        );
        await page.screenshot({ path: `${out}/${t.id}-${state}-360.jpg`, type: 'jpeg', quality: 82, fullPage: true });
        checks.push(...(await browserChecks({ html: stressHtml })).map((c) => ({ ...c, name: `${state}-${c.name}` })));
      }
    results.push({ template: t.id, name: input.facts.name, direction, geometry, checks, visualApproved: false });
    writeFileSync(`${out}/${quick ? 'quick' : 'checks'}.json`, JSON.stringify(results, null, 2));
    await context.close();
    console.log(
      t.id,
      geometry.some((x) => x.overflow || x.broken),
      checks.filter((c) => !c.passed).map((c) => c.name),
    );
  }
  // Same fictional cafe, same copy/photo: only evidence-based art direction changes.
  const original = JSON.parse(readFileSync('data/exports/task1-design/after/gastronomie-foto-input.json', 'utf8'));
  original.facts.name = 'Café Fiktiv – Atelier am Markt';
  original.facts.branchLabel = 'Café';
  original.content = libraryContent(
    'cafe',
    'gastronomie',
    { name: original.facts.name, stadt: original.facts.city, branche: 'Café' },
    0,
  );
  original.content.hero_headline = original.facts.name;
  for (const character of process.argv.includes('--templates-only') ? [] : (['warm', 'refined', 'urban'] as const)) {
    const input = {
      ...original,
      artDirection: {
        version: 1,
        character,
        typography: character === 'urban' ? 'grotesk' : 'editorial',
        composition: character === 'urban' ? 'poster' : 'editorial',
        source: 'business_evidence',
        imageMood: character === 'warm' ? 'warm' : 'neutral',
      },
    };
    const html = renderSite(input);
    writeFileSync(`${out}/cafe-${character}.html`, html);
    const page = await browser.newPage();
    await page.route(/^https?:/, (r) => r.abort());
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await page.setContent(html);
      await imagesPainted(page);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${out}/cafe-${character}-${width}.jpg`, type: 'jpeg', quality: 88, fullPage: true });
      await page.screenshot({ path: `${out}/cafe-${character}-hero-${width}.jpg`, type: 'jpeg', quality: 90 });
    }
    await page.close();
  }
  if (process.argv.includes('--performance')) {
    const perf = [];
    for (const id of ['handwerk-klar', 'beauty-modern', 'gastronomie-foto']) {
      perf.push({
        id,
        before: await lighthouseCheck(readFileSync(`data/exports/task1-design/after/${id}.html`, 'utf8'), 0),
        after: await lighthouseCheck(readFileSync(`${out}/${id}.html`, 'utf8'), 0),
      });
      writeFileSync(`${out}/performance.json`, JSON.stringify(perf, null, 2));
      console.log('performance', id);
    }
  }
} finally {
  await browser.close();
  await closeBrowser();
}
