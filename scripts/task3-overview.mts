/** Contact sheets of actual rendered evidence; no app or provider calls. */
import { mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
const root = 'data/exports/task3-checkout';
const { results } = JSON.parse(readFileSync(`${root}/after/journeys.json`, 'utf8'));
if (results.length !== 10) throw Error('Ten completed cases required');
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
  for (const [label, suffix, height] of [
    ['mobile', 'demo-390', 700],
    ['angebote', 'angebot-390', 1550],
  ] as const) {
    const html = `<!DOCTYPE html><meta charset="utf-8"><style>body{font:15px system-ui;background:#eef2f7;margin:20px;color:#14243c}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}figure{margin:0;background:white;padding:10px;border-radius:8px}img{width:100%;height:${height}px;object-fit:${label === 'mobile' ? 'cover' : 'contain'};object-position:top}</style><h1>SeitenWerk Aufgabe3 · ${label} · fiktive Mock-Testfälle</h1><p>Tatsächliche Screenshots. Keine echten Bestellungen oder gestalterische Betreiberfreigabe.</p><div class="grid">${results.map((r) => `<figure><p>${r.id} · ${r.branch} · ${r.plan}</p><img src="after/${r.id}-${suffix}.jpg" alt="Fiktiver Testfall ${r.id}"></figure>`).join('')}</div>`;
    const file = `${root}/uebersicht-${label}.html`;
    writeFileSync(file, html);
    await page.setContent(
      html.replace(
        /src="(after\/[^"]+)"/g,
        (_match, image) => `src="data:image/jpeg;base64,${readFileSync(path.join(root, image)).toString('base64')}"`,
      ),
    );
    await page.evaluate(() => document.fonts.ready);
    if (await page.locator('img').evaluateAll((images) => images.some((i) => !(i as HTMLImageElement).naturalWidth)))
      throw Error('Missing evidence image');
    await page.screenshot({ path: `${root}/uebersicht-${label}.jpg`, fullPage: true, type: 'jpeg', quality: 90 });
    mkdirSync('docs/task3-checkout/evidence', { recursive: true });
    cpSync(`${root}/uebersicht-${label}.jpg`, `docs/task3-checkout/evidence/uebersicht-${label}.jpg`);
  }
} finally {
  await browser.close();
}
