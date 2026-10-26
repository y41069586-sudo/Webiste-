import { readFileSync } from 'node:fs';
import { takeScreenshots, compositeHtml } from '../packages/core/src/render/screenshots';
import { withPage, closeBrowser } from '../packages/core/src/render/browser';
const out = 'data/exports/premium-completion';
try {
  for (const id of ['handwerk-klar', 'handwerk-solid', 'handwerk-werkstatt']) {
    const html = readFileSync(`${out}/${id}.html`, 'utf8');
    const shots = await takeScreenshots(html, { hideDemoChrome: true });
    await withPage({ width: 1800, height: 1120 }, async (page) => {
      await page.setContent(
        compositeHtml(shots.desktop, shots.mobile, { businessName: 'Malerbetrieb Muster & Partner', printWidthMm: 118 }),
      );
      await page.locator('.laptop').screenshot({ path: `${out}/${id}-laptop.png` });
      await page.locator('.phone').screenshot({ path: `${out}/${id}-smartphone.png` });
    });
  }
} finally {
  await closeBrowser();
}
