/** Preserve pre-task3 renderings; fictional stored task2 demos, no database/network/providers. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { imagesPainted } from '../packages/core/src/render/screenshots';
const out = 'data/exports/task3-checkout/before';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const rows = [];
try {
  const page = await browser.newPage();
  await page.route(/^https?:/, (r) => r.abort());
  for (const id of ['01', '02', '04', '06', '07', '08', '10', '12', '13', '15']) {
    const html = readFileSync(`data/exports/task2-letters/fixtures/${id}.html`, 'utf8');
    writeFileSync(`${out}/${id}.html`, html);
    for (const width of [320, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.setContent(html);
      await imagesPainted(page);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${out}/${id}-${width}.jpg`, type: 'jpeg', quality: 85, fullPage: true });
      if (width === 390)
        await page.locator('#uebernehmen').screenshot({ path: `${out}/${id}-angebot.jpg`, type: 'jpeg', quality: 90 });
    }
    rows.push({ id, source: `task2-letters/fixtures/${id}.html`, fictional: true });
    writeFileSync(out + '/manifest.json', JSON.stringify(rows, null, 2));
  }
} finally {
  await browser.close();
}
console.log('Preserved', rows.length, 'fictional pre-task3 demos at four widths.');
