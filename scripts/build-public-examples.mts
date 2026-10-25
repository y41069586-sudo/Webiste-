import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { renderSite, TEMPLATES } from '../packages/templates/src/index';
import { libraryContent } from '../packages/core/src/demos/library';

const require = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url));
const sharp = require('sharp');
const fixtures = [
  { id: 'handwerk', name: 'Malerei Muster', branch: 'maler', label: 'Malerbetrieb', template: 'handwerk-klar' },
  { id: 'beauty', name: 'Kosmetik Muster', branch: 'kosmetikstudio', label: 'Kosmetikstudio', template: 'beauty-elegant' },
  { id: 'gastronomie', name: 'Trattoria Muster', branch: 'restaurant', label: 'Restaurant', template: 'gastronomie-split' },
  { id: 'einzelhandel', name: 'Blumen Muster', branch: 'blumenladen', label: 'Blumenladen', template: 'einzelhandel-magazin' },
  { id: 'kurse', name: 'Tanzschule Muster', branch: 'tanzschule', label: 'Tanzschule', template: 'kurse-split' },
] as const;
const out = 'apps/web/public/beispiele';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/*', (r) => r.abort());
  for (const [seed, f] of fixtures.entries()) {
    const t = TEMPLATES.find((t) => t.id === f.template);
    if (!t) throw Error(`Vorlage fehlt: ${f.template}`);
    const content = libraryContent(f.branch, f.id, { name: f.name, stadt: 'Musterstadt', branche: f.label }, seed);
    let html = renderSite({
      templateId: t.id,
      palette: t.palettes[0]!,
      mode: 'screenshot',
      content,
      facts: {
        name: f.name,
        group: f.id,
        branchLabel: f.label,
        street: 'Fiktive Beispielanschrift',
        houseNumber: '',
        postalCode: '',
        city: 'Musterstadt',
        phone: null,
        phoneHref: null,
        openingLines: [],
      },
    });
    html = html.replace(
      /(<body[^>]*>)/,
      '$1<aside id="musterhinweis" style="background:#fff;color:#0f172a;border-bottom:1px solid #dce2ed;padding:14px 20px;font:14px/1.5 sans-serif"><strong>Fiktive Musterwebsite von SeitenWerk.</strong> Kein echter Betrieb. Beispiele, Fotos und Angebote dienen nur der Gestaltung. <a href="/beispiele" style="color:#1f4fd8;text-decoration:underline">Zurück zu SeitenWerk</a></aside>',
    );
    html = html.replace(/href="https:\/\/www.openstreetmap.org[^"]*"/g, 'href="#musterhinweis"');
    html = html.replace(/[\t ]+$/gm, '');
    await writeFile(`${out}/${f.id}.html`, html);
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode())]));
    const image = await page.screenshot({ type: 'png' });
    await sharp(image).resize(960, 600).webp({ quality: 85 }).toFile(`${out}/${f.id}-karte.webp`);
  }
  console.log('Fünf statische, als fiktiv gekennzeichnete Muster und echte Vorschaubilder lokal erstellt. Kein Deployment.');
} finally {
  await browser.close();
}
