import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import QRCode from '../packages/core/node_modules/qrcode/lib/index.js';
import jsQR from '../packages/templates/node_modules/jsqr/dist/jsQR.js';
import { renderSite, TEMPLATES, renderLetterHtml } from '../packages/templates/src/index';
import { demoInput } from '../packages/templates/test/fixtures';
import { libraryContent } from '../packages/core/src/demos/library';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { composeLetter } from '../packages/core/src/letters/compose';
import { privacyNoticeText, objectionNoticeText } from '../packages/core/src/letters/notices';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { validateLetterDom, validateLetterPdf } from '../packages/core/src/render/pdf';
import { closeBrowser } from '../packages/core/src/render/browser';
import { takeScreenshots, renderComposite } from '../packages/core/src/render/screenshots';
const out = process.env.AUDIT_PAIRS_OUTPUT ?? 'data/exports/final-audit';
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
  const specialtyLabels: Record<string, string> = {
    maler: 'Malerbetrieb',
    friseur: 'Friseursalon',
    gartenbau: 'Garten- und Landschaftsbau',
    reinigung: 'Reinigungsunternehmen',
    sanitaer: 'Sanitärbetrieb',
  };
  const templates =
    process.env.AUDIT_PRIMARY_SPECIALTIES === 'true'
      ? Object.keys(specialtyLabels).flatMap((branch) =>
          TEMPLATES.filter((t) =>
            (branch === 'friseur'
              ? ['beauty-elegant', 'beauty-soft', 'beauty-modern']
              : ['handwerk-klar', 'handwerk-solid', 'handwerk-werkstatt']
            ).includes(t.id),
          ).map((t) => ({ ...t, auditBranch: branch })),
        )
      : TEMPLATES.map((t) => ({ ...t, auditBranch: '' }));
  for (const t of templates.filter(
    (t) =>
      (!process.env.AUDIT_BRANCH || t.auditBranch === process.env.AUDIT_BRANCH) &&
      (!process.env.AUDIT_TEMPLATE_GROUP || t.group === process.env.AUDIT_TEMPLATE_GROUP),
  )) {
    const group = t.group;
    const input = demoInput(t.id, t.palettes[0]!, group);
    const branches = {
      handwerk: ['maler', 'Malerbetrieb'],
      beauty: ['kosmetikstudio', 'Kosmetikstudio'],
      gastronomie: ['restaurant', 'Restaurant'],
      einzelhandel: ['blumenladen', 'Blumenladen'],
      kurse: ['tanzschule', 'Tanzschule'],
    } as const;
    const [branch, label] = t.auditBranch ? [t.auditBranch, specialtyLabels[t.auditBranch]!] : branches[group];
    const artifact = t.id + (t.auditBranch ? '-' + t.auditBranch : '');
    input.facts.name = label + ' Muster & Partner';
    if (branch === 'gartenbau') input.palette = 'waldgruen';
    input.facts.branchLabel = label;
    input.facts.city = 'Musterstadt';
    input.content = libraryContent(branch, group, { name: input.facts.name, stadt: input.facts.city, branche: label }, 1);
    input.demo = { ...demoOptions('fictional-test-demo', cfg), expiresLabel: '25. November 2026' };
    const html = renderSite(input);
    writeFileSync(`${out}/demo-${artifact}.html`, html);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(html);
    await page.screenshot({ path: `${out}/demo-${artifact}-mobile.png`, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw Error('Mobile overflow ' + group);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.screenshot({ path: `${out}/demo-${artifact}-tablet.png`, fullPage: true });
    const shots = await takeScreenshots(html, { hideDemoChrome: true });
    writeFileSync(`${out}/demo-${artifact}-desktop.png`, shots.desktop);
    writeFileSync(`${out}/demo-${artifact}-clean-mobile.png`, shots.mobile);
    const composite = 'data:image/jpeg;base64,' + (await renderComposite(shots.desktop, shots.mobile)).toString('base64');
    const arms = (['A', 'B', 'C'] as const).filter(
      (arm) => !process.env.AUDIT_LETTER_ARMS || process.env.AUDIT_LETTER_ARMS.split(',').includes(arm),
    );
    for (const [index, arm] of arms.entries()) {
      const variant = v4LetterVariant(group === 'kurse' ? 'kurse_training' : group, arm);
      const url = 'https://example.test/t/fictional-' + branch;
      const qr = await QRCode.toDataURL(url, { margin: 4, width: 600, errorCorrectionLevel: 'M' });
      const data = composeLetter({
        cfg,
        branchLabel: input.facts.branchLabel,
        variant,
        recipient: {
          businessName: input.facts.name,
          street: input.facts.street,
          houseNumber: input.facts.houseNumber,
          postalCode: input.facts.postalCode,
          city: input.facts.city,
        },
        domain: null,
        rating: null,
        compositeDataUri: composite,
        desktopScreenshotDataUri: 'data:image/jpeg;base64,' + shots.desktop.toString('base64'),
        qrDataUri: qr,
        shortUrl: url.replace('https://', ''),
        dateLine: '25. Oktober 2026',
        privacyNotice: privacyNoticeText(cfg, 'osm', 'https://example.test/datenschutz'),
        objectionNotice: objectionNoticeText('support@example.test'),
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
      const pdfIssues = await validateLetterPdf(pdf, {
        qrExpectedUrl: url,
        recipientLines: data.recipientLines,
        position: data.addressPosition,
        expectedPages: 1,
      });
      if (pdfIssues.issues.length) throw new Error(`${artifact}/${arm}: ${JSON.stringify(pdfIssues.issues)}`);
      writeFileSync(`${out}/brief-${artifact}-${index + 1}.pdf`, pdf);
      await page.screenshot({ path: `${out}/brief-${artifact}-${index + 1}.png`, fullPage: true });
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
      results.push({ templateId: t.id, branch, group, variant: arm, qrSource: true, qrFinalPdf: true, pdfBytes: pdf.length });
      writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
      console.log(`${t.id}/${branch}/${arm}: PDF geometry and QR passed`);
    }
  }
  writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ pairs: results.length, network: false, sending: false }));
} finally {
  await browser.close();
  await closeBrowser();
}
