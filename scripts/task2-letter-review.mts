/** Isolated fictional print evidence; no database, providers, sending jobs or deployment. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import jsQR from '../packages/core/node_modules/jsqr/dist/jsQR.js';
import { renderSite, renderLetterHtml, TEMPLATES } from '../packages/templates/src';
import { takeScreenshots, renderComposite } from '../packages/core/src/render/screenshots';
import { closeBrowser } from '../packages/core/src/render/browser';
import { htmlToPdf, validateLetterDom, validateLetterPdf, pdfTextItems } from '../packages/core/src/render/pdf';
import { qrDataUri } from '../packages/core/src/render/letter';
import { composeLetter, placeholderValues, letterTruthBlocklist } from '../packages/core/src/letters/compose';
import { checkLetterTruth } from '../packages/core/src/letters/truth-check';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { privacyNoticeText, objectionNoticeText } from '../packages/core/src/letters/notices';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { sha256 } from '../packages/core/src/util/crypto';
const sharp = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url))('sharp');
process.env.DRY_RUN = 'true';
const phase = process.argv.includes('--before') ? 'before' : process.argv.includes('--research') ? 'research' : 'after';
const root = 'data/exports/task2-letters',
  out = `${root}/${phase}`,
  fixtureDir = `${root}/fixtures`;
mkdirSync(out, { recursive: true });
mkdirSync(fixtureDir, { recursive: true });
const cfg = deepMerge(DEFAULT_CONFIG, {
  offers: { activeVersion: 'v4' },
  sender: {
    name: 'Erika Beispiel',
    company: 'SeitenWerk Testabsender',
    street: 'Beispielweg 1',
    postalCode: '12345',
    city: 'Testort',
    email: 'support@example.test',
    phone: '+493000000000',
    website: 'example.test',
  },
});
const details = [
  ['Elektroinstallation', 'Anfragen zu geplanten Umbauten'],
  ['Innenanstriche', 'Arbeiten in Treppenhäusern'],
  ['Badmodernisierung', 'Anfragen zur Sanitärausstattung'],
  ['Gesichtsbehandlungen', 'Termine nach Vereinbarung'],
  ['Maniküre', 'Terminanfragen per Nachricht'],
  ['Haarschnitte und Bartpflege', 'Termine nach Vereinbarung'],
  ['Abendkarte', 'Reservierungsanfragen'],
  ['Kaffee und Kuchen', 'Abholung vor Ort'],
  ['Mittagsangebot', 'Besuch vor Ort'],
  ['Schnittblumen', 'Abholung im Geschäft'],
  ['Damenmode', 'Beratung im Laden'],
  ['Buchbestellungen', 'Abholung im Laden'],
  ['Yoga für Einsteiger', 'Kursanfragen per Nachricht'],
  ['Kleingruppentraining', 'Anfragen zu Trainingsangeboten'],
  ['Paartanz', 'Anfragen zu Schnupperstunden'],
  ['Gartenpflege', 'Anfragen zu Grundstücken'],
  ['Haarschnitte', 'Terminanfragen'],
  ['Kleine Abendkarte', 'Reservierungsanfragen'],
  ['Bücher und Schreibwaren', 'Bestellanfragen'],
  ['Klavierunterricht', 'Anfragen zum Einzelunterricht'],
];
const longNames: Record<number, string> = {
  2: 'Wasserwerk West – Sanitär und Badgestaltung',
  6: 'Restaurant Abendtisch am Alten Markt',
  15: 'Gartenwerk Grünraum & Landschaftsgestaltung',
  19: 'Musikatelier Klangraum – Unterricht & Begleitung',
};
const rows: Record<string, unknown>[] = [];
const server = createServer((req, res) => {
  const path = req.url?.split('?')[0] ?? '';
  const match = path.match(/^\/(?:q\/test-token-|s)(\d+)$/);
  if (match) {
    res.writeHead(302, { Location: `/d/${match[1]}` });
    res.end();
    return;
  }
  const id = path.match(/^\/d\/(\d+)$/)?.[1];
  if (id && existsSync(`${fixtureDir}/${id}.html`)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(readFileSync(`${fixtureDir}/${id}.html`));
    return;
  }
  res.writeHead(404);
  res.end('Nur lokale fiktive Testziele');
});
await new Promise<void>((resolve) => server.listen(3216, '127.0.0.1', resolve));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route(/^https?:\/(?!\/127\.0\.0\.1:3216)/, (route) => route.abort());
  const page = await ctx.newPage();
  for (const [n, t] of (phase === 'research' ? TEMPLATES.slice(0, 2) : TEMPLATES).entries()) {
    const id = String(n + 1).padStart(2, '0'),
      file = `${fixtureDir}/${id}`;
    if (phase === 'before' && !process.argv.includes('--recheck')) {
      const input = JSON.parse(readFileSync(`data/exports/task1-design/after/${t.id}-input.json`, 'utf8'));
      if (longNames[n]) input.facts.name = longNames[n];
      // Explicitly fictional, reviewed facts supplied by this fixture; not internet research.
      input.content.services = details[n]!.map((text) => ({
        title: text,
        description: 'Fiktive bestätigte Angabe für diesen Testbetrieb.',
      }));
      input.demo.expiresLabel = '26. November 2026';
      const html = renderSite(input);
      writeFileSync(file + '.html', html);
      writeFileSync(file + '.json', JSON.stringify(input, null, 2));
      const shots = await takeScreenshots(html, { hideDemoChrome: true });
      writeFileSync(file + '-desktop.jpg', shots.desktop);
      writeFileSync(file + '-mobile.jpg', shots.mobile);
      writeFileSync(
        file + '-devices.jpg',
        await renderComposite(shots.desktop, shots.mobile, { businessName: input.facts.name, printWidthMm: 114 }),
      );
    }
    const input = JSON.parse(readFileSync(file + '.json', 'utf8')),
      f = input.facts;
    const sequence = 1,
      arm = n % 2 === 0 ? 'A' : 'B';
    const industry = t.group === 'kurse' ? 'kurse_training' : t.group;
    const composeInput = {
      cfg,
      variant: v4LetterVariant(industry, arm, sequence),
      recipient: { businessName: f.name, street: f.street, houseNumber: f.houseNumber, postalCode: f.postalCode, city: f.city },
      branchLabel: f.branchLabel,
      domain: null,
      rating: null,
      personalization: {
        businessName: f.name,
        city: f.city,
        branchLabel: f.branchLabel,
        details: details[n]!.map((text) => ({ text, source: `fixture:${id}:reviewed`, verified: true })),
      },
      compositeDataUri: 'data:image/jpeg;base64,' + readFileSync(file + '-devices.jpg').toString('base64'),
      desktopScreenshotDataUri: 'data:image/jpeg;base64,' + readFileSync(file + '-desktop.jpg').toString('base64'),
      qrDataUri: await qrDataUri(`http://127.0.0.1:3216/q/test-token-${id}`),
      shortUrl: `127.0.0.1:3216/s${id}`,
      expiresLabel: '26. November 2026',
      dateLine: 'Testort, 26. Oktober 2026',
      privacyNotice: privacyNoticeText(cfg, 'mock', 'example.test/datenschutz'),
      objectionNotice: objectionNoticeText('support@example.test'),
      priceLabel: '597 €',
    };
    if (phase === 'research') {
      const context =
        composeInput.personalization as import('../packages/core/src/letters/personalization').VerifiedLetterContext;
      context.details.unshift(
        n === 0
          ? {
              kind: 'website_search',
              text: 'not_found',
              verified: true,
              source: `fixture:${id}:fictional-public-search`,
              checkedAt: new Date().toISOString(),
              checks: ['name_city_search', 'directory_links', 'social_links'],
            }
          : {
              kind: 'public_observation',
              text: 'Ihr öffentlicher Eintrag nennt Innenanstriche und Arbeiten in Treppenhäusern',
              source: `fixture:${id}:fictional-public-listing`,
              verified: true,
              checkedAt: new Date().toISOString(),
            },
      );
    }
    const recheck = phase === 'before' && process.argv.includes('--recheck');
    const data = {
      ...composeLetter(composeInput),
      ...(recheck ? JSON.parse(readFileSync(`${out}/${id}-text.json`, 'utf8')) : {}),
    };
    const html = recheck ? readFileSync(`${out}/${id}.html`, 'utf8') : renderLetterHtml(data);
    const pdf = recheck ? readFileSync(`${out}/${id}.pdf`) : await htmlToPdf(html);
    writeFileSync(`${out}/${id}.pdf`, pdf);
    writeFileSync(`${out}/${id}.html`, html);
    writeFileSync(
      `${out}/${id}-text.json`,
      JSON.stringify({ subject: data.subject, intro: data.intro, offer: data.offer, noAction: data.noAction }, null, 2),
    );
    const dom = await validateLetterDom(html, 'left');
    const printed = await validateLetterPdf(pdf, {
      qrExpectedUrl: `http://127.0.0.1:3216/q/test-token-${id}`,
      recipientLines: data.recipientLines,
      position: 'left',
      expectedPages: 1,
    });
    const text = (await pdfTextItems(pdf)).items.map((i) => i.str).join(' ');
    const truth = checkLetterTruth({
      letter: data,
      placeholderValues: placeholderValues(composeInput),
      claims: [],
      claimSpans: [],
      allowedClaimIds: [],
      industry: null,
      sourcesLabel: 'example.test/quellen',
      extraBlocklist: letterTruthBlocklist(cfg),
    });
    execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-scale-to', '1800', '-png', `${out}/${id}.pdf`, `${out}/${id}-print`], {
      stdio: 'pipe',
    });
    await sharp(`${out}/${id}-print.png`).webp({ quality: 92 }).toFile(`${out}/${id}-print.webp`);
    // Scan a grayscale raster of the printed A4, not only the source PNG embedded in the PDF.
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(html);
    await page.evaluate(() => document.fonts.ready);
    const qrBox = await page.locator('section.page').first().locator('img.qr').first().boundingBox();
    const printMeta = await sharp(`${out}/${id}-print.png`).metadata();
    const scale = printMeta.width! / ((210 * 96) / 25.4);
    const crop = {
      left: Math.max(0, Math.floor(qrBox!.x * scale) - 4),
      top: Math.max(0, Math.floor(qrBox!.y * scale) - 4),
      width: Math.ceil(qrBox!.width * scale) + 8,
      height: Math.ceil(qrBox!.height * scale) + 8,
    };
    const raster = await sharp(`${out}/${id}-print.png`)
      .extract(crop)
      .greyscale()
      .toColourspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = new Uint8ClampedArray(raster.info.width * raster.info.height * 4);
    for (let pixel = 0; pixel < raster.info.width * raster.info.height; pixel++) {
      const c = raster.info.channels,
        at = pixel * c,
        to = pixel * 4;
      rgba[to] = raster.data[at]!;
      rgba[to + 1] = raster.data[at + (c >= 3 ? 1 : 0)]!;
      rgba[to + 2] = raster.data[at + (c >= 3 ? 2 : 0)]!;
      rgba[to + 3] = 255;
    }
    const scanned = jsQR(rgba, raster.info.width, raster.info.height)?.data;
    const targets = [];
    for (const url of [`http://127.0.0.1:3216/q/test-token-${id}`, `http://127.0.0.1:3216/s${id}`]) {
      const res = await fetch(url);
      const body = await res.text();
      targets.push(res.ok && res.url.endsWith(`/d/${id}`) && body.includes(f.name.replace(/&/g, '&amp;')));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ media: 'screen' });
    await page.goto(`http://127.0.0.1:3216/q/test-token-${id}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${out}/${id}-mobile.jpg`, type: 'jpeg', quality: 85, fullPage: true });
    const mobile = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    rows.push({
      id,
      template: t.id,
      business: f.name,
      branch: f.branchLabel,
      sequence,
      arm,
      details: details[n],
      issues: [...dom, ...printed.issues],
      pages: printed.pages,
      truth: truth.passed,
      truthViolations: truth.violations,
      qrRaster: scanned === `http://127.0.0.1:3216/q/test-token-${id}`,
      targets: targets.every(Boolean),
      mobile,
      price: text.includes('597 €') && /19\s*€/.test(text) && /99\s*€/.test(text),
      date: text.includes('26. Oktober 2026'),
      privacy: text.includes('Art. 14 DSGVO') && text.includes('Art. 21 DSGVO'),
      demoHash: sha256(readFileSync(file + '.html')),
      desktopHash: sha256(readFileSync(file + '-desktop.jpg')),
      mobileHash: sha256(readFileSync(file + '-mobile.jpg')),
      pdfHash: sha256(pdf),
      visualApproved: false,
    });
    writeFileSync(`${out}/checks.json`, JSON.stringify(rows, null, 2));
    console.log(
      phase,
      id,
      t.id,
      'issues',
      dom.length + printed.issues.length,
      'truth',
      truth.passed,
      'raster',
      scanned === `http://127.0.0.1:3216/q/test-token-${id}`,
    );
  }
  await ctx.close();
} finally {
  await browser.close();
  await closeBrowser();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
