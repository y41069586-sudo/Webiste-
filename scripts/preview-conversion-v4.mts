import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import QRCode from '../packages/core/node_modules/qrcode/lib/index.js';
import jsQR from '../packages/templates/node_modules/jsqr/dist/jsQR.js';
import { renderSite, TEMPLATES, renderLetterHtml } from '../packages/templates/src/index';
import { demoInput } from '../packages/templates/test/fixtures';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { composeLetter } from '../packages/core/src/letters/compose';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { validateLetterDom } from '../packages/core/src/render/pdf';
import { closeBrowser } from '../packages/core/src/render/browser';
import { takeScreenshots, renderComposite } from '../packages/core/src/render/screenshots';
const out = 'data/exports/conversion-v4';
mkdirSync(out, { recursive: true });
const cfg = deepMerge(DEFAULT_CONFIG, {
  sender: {
    name: 'Erika Beispiel',
    company: 'SeitenWerk Test',
    street: 'Beispielweg 1',
    postalCode: '12345',
    city: 'Beispielstadt',
    email: 'support@example.test',
    phone: '+493000000000',
    website: 'example.test',
    whatsappNumber: '493000000000',
    intro: 'Fiktiver Absender für lokale Tests. Keine echte Sendung.',
  },
});
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.route('**/*', (route) => route.abort());
const results = [];
try {
  for (const group of ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse'] as const) {
    const t = TEMPLATES.find((t) => t.group === group)!;
    const input = demoInput(t.id, t.palettes[0]!, group);
    input.facts.name = 'Beispielbetrieb ' + group;
    input.demo = { ...demoOptions('fictional-test-demo', cfg), expiresLabel: '25. November 2026' };
    const html = renderSite(input);
    writeFileSync(`${out}/demo-${group}.html`, html);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(html);
    await page.screenshot({ path: `${out}/demo-${group}-mobile.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw Error('Mobile overflow ' + group);
    const shots = await takeScreenshots(renderSite({ ...input, mode: 'screenshot', demo: undefined }));
    const composite = 'data:image/jpeg;base64,' + (await renderComposite(shots.desktop, shots.mobile)).toString('base64');
    for (const [index, arm] of (['A', 'B', 'C'] as const).entries()) {
      const variant = v4LetterVariant(group === 'kurse' ? 'kurse_training' : group, arm);
      const url = 'https://example.test/t/fictional-' + group;
      const qr = await QRCode.toDataURL(url, { margin: 4, width: 600, errorCorrectionLevel: 'M' });
      const data = composeLetter({
        cfg,
        variant,
        recipient: {
          businessName: 'Beispielbetrieb ' + group,
          street: 'Musterweg',
          houseNumber: '2',
          postalCode: '12345',
          city: 'Beispielstadt',
        },
        domain: null,
        rating: null,
        compositeDataUri: composite,
        qrDataUri: qr,
        shortUrl: url.replace('https://', ''),
        dateLine: '25. Oktober 2026',
        privacyNotice: 'Fiktive Testdaten. Datenquelle und Art.-14-Hinweis vor echtem Versand prüfen.',
        objectionNotice: 'Werbewiderspruch nach Art. 21 DSGVO jederzeit an support@example.test.',
        priceLabel: '597 €',
        expiresLabel: '25. November 2026',
        addressPosition: 'left',
      });
      const letter = renderLetterHtml(data);
      const issues = await validateLetterDom(letter, 'left');
      if (issues.length) throw new Error(`${group}/${arm}: ${JSON.stringify(issues)}`);
      await page.setViewportSize({ width: 794, height: 1123 });
      await page.setContent(letter);
      await page.evaluate(() => document.fonts.ready);
      const pdf = await page.pdf({ format: 'A4', printBackground: true });
      writeFileSync(`${out}/brief-${group}-${index + 1}.pdf`, pdf);
      const pixels = await page.evaluate(async (uri) => {
        const image = new Image();
        image.src = uri;
        await image.decode();
        const c = document.createElement('canvas');
        c.width = image.width;
        c.height = image.height;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(image, 0, 0);
        return { data: Array.from(ctx.getImageData(0, 0, c.width, c.height).data), width: c.width, height: c.height };
      }, qr);
      if (jsQR(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height)?.data !== url) throw Error('QR decode failed');
      results.push({ group, variant: index + 1, qr: true, pdfBytes: pdf.length });
    }
  }
  writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
  writeFileSync(
    `${out}/startcharge-40-fictional.json`,
    JSON.stringify(
      Array.from({ length: 40 }, (_, i) => ({
        id: `fictional-${i + 1}`,
        businessName: `Fiktiver Testbetrieb ${i + 1}`,
        industry: ['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse_training'][i % 5],
        variant: i % 4 < 2 ? 'A' : i % 4 === 2 ? 'B' : 'C',
        send: false,
        requiresManualReview: true,
      })),
      null,
      2,
    ),
  );
  console.log('5 mobile demos, 15 PDF letters, 15 QR decodes, fictional 40-letter review batch created. No network or sending.');
} finally {
  await browser.close();
  await closeBrowser();
}
