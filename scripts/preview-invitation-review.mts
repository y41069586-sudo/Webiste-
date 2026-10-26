/** Fictional invitation proof; existing render/PDF/QR pipeline, all provider calls excluded. */
import { mkdirSync, readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import jsQR from '../packages/core/node_modules/jsqr/dist/jsQR.js';
import { renderSite, renderLetterHtml, TEMPLATES, industryDirection } from '../packages/templates/src';
import { libraryContent } from '../packages/core/src/demos/library';
import { demoOptions } from '../packages/core/src/demos/build';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { composeLetter, placeholderValues, letterTruthBlocklist, type ComposeInput } from '../packages/core/src/letters/compose';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { checkLetterTruth } from '../packages/core/src/letters/truth-check';
import { privacyNoticeText, objectionNoticeText } from '../packages/core/src/letters/notices';
import { takeScreenshots, renderComposite, imagesPainted } from '../packages/core/src/render/screenshots';
import { htmlToPdf, validateLetterDom, validateLetterPdf, pdfTextItems } from '../packages/core/src/render/pdf';
import { qrDataUri } from '../packages/core/src/render/letter';
import { closeBrowser } from '../packages/core/src/render/browser';
import { sha256 } from '../packages/core/src/util/crypto';
import { writePreviewInvitation, invitationDraftIssues, LETTER_WRITER_TOOL } from '../packages/core/src/letters/writer';
import { letterCopyFixture } from './letter-copy-fixtures.mts';
const sharp = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url))('sharp');
const out = 'data/exports/letter-preview-upgrade';
mkdirSync(out, { recursive: true });
mkdirSync(`${out}/vorher`, { recursive: true });
// Each row is expressly invented test data, not a discovered business or conducted research.
const cases = [
  [
    'Elektro Nordlicht',
    'elektriker',
    'Elektrobetrieb',
    'handwerk-solid',
    'Elektroinstallation',
    'Anfragen zu geplanten Umbauten',
  ],
  ['Lichtwerk am Markt', 'elektriker', 'Elektrobetrieb', 'handwerk-klar', 'Lichtplanung', 'Beleuchtung'],
  [
    'Elektrotechnik Fiktiv & Partner',
    'elektriker',
    'Elektrobetrieb',
    'handwerk-werkstatt',
    'Photovoltaik',
    'Planung von PV-Anlagen',
  ],
  ['Farbwerk Linde', 'maler', 'Malerbetrieb', 'handwerk-klar', 'Innenanstriche', 'Kalkfarben'],
  ['Malerei Fassade & Treppenhaus', 'maler', 'Malerbetrieb', 'handwerk-solid', 'Fassadenanstriche', 'Arbeiten in Treppenhäusern'],
  ['Malerei Raumidee', 'maler', 'Malerbetrieb', 'handwerk-werkstatt', 'Lackierarbeiten', 'Tapezierarbeiten'],
  ['Gartenwerk Grünraum', 'gartenbau', 'Garten- und Landschaftsbau', 'handwerk-plakat', 'Gartenpflege', 'Heckenschnitt'],
  [
    'Gartenatelier Freiraum',
    'gartenbau',
    'Garten- und Landschaftsbau',
    'handwerk-klar',
    'Gartenplanung',
    'Gestaltung von Außenflächen',
  ],
  ['Klarblick Gebäudereinigung', 'reinigung', 'Reinigungsunternehmen', 'handwerk-solid', 'Fensterreinigung', 'Büroreinigung'],
  [
    'Wasserwerk West – Sanitär und Badgestaltung',
    'sanitaer',
    'Sanitärbetrieb',
    'handwerk-werkstatt',
    'Badmodernisierung',
    'Sanitärarbeiten',
  ],
  ['Barber Kontur', 'barber', 'Barbershop', 'beauty-modern', 'Haarschnitte', 'Bartpflege'],
  ['Salon Schnittpunkt', 'friseur', 'Friseursalon', 'beauty-elegant', 'Haarschnitte', 'Farbbehandlungen'],
  ['Nagelatelier Feinschliff', 'nagelstudio', 'Nagelstudio', 'beauty-soft', 'Maniküre', 'Nagelgestaltung'],
  ['Studio Hautzeit', 'kosmetikstudio', 'Kosmetikstudio', 'beauty-elegant', 'Gesichtsbehandlungen', 'Kosmetikberatung'],
  ['Restaurant Abendtisch am Alten Markt', 'restaurant', 'Restaurant', 'gastronomie-foto', 'Abendkarte', 'Reservierungsanfragen'],
  ['Café Mohnblüte', 'cafe', 'Café', 'gastronomie-split', 'Kaffee und Kuchen', 'Abholung vor Ort'],
  ['Hafenküche Fiktiv', 'restaurant', 'Restaurant', 'gastronomie-magazin', 'Außer-Haus-Angebot', 'Abholung'],
  ['Buchwinkel', 'buchladen', 'Buchhandlung', 'einzelhandel-magazin', 'Buchbestellungen', 'Abholung im Laden'],
  [
    'Musikatelier Klangraum – Unterricht & Begleitung',
    'musikschule',
    'Musikschule',
    'kurse-plakat',
    'Klavierunterricht',
    'Einzelunterricht',
  ],
  ['Tanzatelier Schrittwerk', 'tanzschule', 'Tanzschule', 'kurse-magazin', 'Paartanz', 'Schnupperstunden'],
] as const;
for (const [index, [name, , branchLabel, , first, second]] of cases.entries()) {
  const facts = [first, second].map((text, i) => ({ id: `F${i + 1}`, text }));
  const draft = letterCopyFixture(index, name, facts);
  const issues = invitationDraftIssues(draft, { businessName: name, city: 'Fiktivstadt', branchLabel, details: [] }, facts);
  if (issues.length) throw Error(`Testtext ${index + 1}: ${issues.join(' | ')}`);
}
if (process.argv.includes('--check-copy-only')) {
  console.log('20 redaktionelle Offline-Testantworten haben die deterministischen Textregeln bestanden.');
  process.exit(0);
}
const cfg = deepMerge(DEFAULT_CONFIG, {
  offers: { activeVersion: 'v4' },
  switches: { dryRun: true },
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
const PORT = 3218;
const saved = new Map<string, string>();
const server = createServer((req, res) => {
  const p = (req.url ?? '').split('?')[0]!;
  const m = p.match(/^\/(?:q\/|s)(\d+)$/);
  if (m) {
    res.writeHead(302, { Location: `/d/${m[1]}` });
    res.end();
    return;
  }
  const id = p.match(/^\/d\/(\d+)$/)?.[1];
  if (id && saved.has(id)) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(saved.get(id));
    return;
  }
  res.writeHead(404);
  res.end('Local fictional proofs only');
});
await new Promise<void>((r) => server.listen(PORT, '127.0.0.1', r));
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const oldChecks =
  process.argv.includes('--reuse-demo') && existsSync(`${out}/checks.json`)
    ? JSON.parse(readFileSync(`${out}/checks.json`, 'utf8'))
    : [];
const only = process.argv.find((v) => v.startsWith('--only='))?.slice(7);
if (only && oldChecks.length !== cases.length) throw Error('Einzelreparatur benötigt den vollständigen vorherigen Prüflauf.');
const results = only ? oldChecks.filter((r: { id: string }) => r.id !== only) : [];
try {
  const page = await browser.newPage();
  await page.route(/^https?:\/(?!\/127\.0\.0\.1:3218)/, (r) => r.abort());
  for (const [index, [name, branch, label, template, first, second]] of cases.entries()) {
    const id = String(index + 1).padStart(2, '0');
    if (only && id !== only) continue;
    for (const suffix of ['letter.pdf', 'print.jpg', 'text.json'])
      if (existsSync(`${out}/${id}-${suffix}`) && !existsSync(`${out}/vorher/${id}-${suffix}`))
        copyFileSync(`${out}/${id}-${suffix}`, `${out}/vorher/${id}-${suffix}`);
    const t = TEMPLATES.find((t) => t.id === template)!;
    const city = 'Fiktivstadt';
    const content = libraryContent(branch, t.group, { name, stadt: city, branche: label }, index);
    content.services = [
      { title: first, text: 'Ausdrücklich vorgegebene Leistung dieses fiktiven Testbetriebs.', icon: 'chat' },
      { title: second, text: 'Ausdrücklich vorgegebene Angabe dieses fiktiven Testbetriebs.', icon: 'chat' },
    ];
    const facts = {
      name,
      branchLabel: label,
      group: t.group,
      street: 'Fiktiver Musterweg',
      houseNumber: String(index + 1),
      postalCode: '12345',
      city,
      phone: null,
      phoneHref: null,
      openingLines: [],
    };
    const html = renderSite({
      templateId: t.id,
      palette: t.palettes[0]!,
      mode: 'demo',
      facts,
      content,
      artDirection: industryDirection(t.group, branch),
      demo: { ...demoOptions(`proof-${id}`, cfg), expiresLabel: '26. November 2026' },
    });
    saved.set(id, html);
    writeFileSync(`${out}/${id}-demo.html`, html);
    const old = oldChecks.find((r: { id: string; demoHash: string }) => r.id === id && r.demoHash === sha256(Buffer.from(html)));
    const cached = old && ['desktop', 'phone', 'devices'].every((s) => existsSync(`${out}/${id}-${s}.jpg`));
    const shots = cached
      ? { desktop: readFileSync(`${out}/${id}-desktop.jpg`), mobile: readFileSync(`${out}/${id}-phone.jpg`) }
      : await takeScreenshots(html, { hideDemoChrome: true });
    const devices = cached
      ? readFileSync(`${out}/${id}-devices.jpg`)
      : await renderComposite(shots.desktop, shots.mobile, { businessName: name, printWidthMm: 114 });
    if (
      cached &&
      [sha256(shots.desktop), sha256(shots.mobile), sha256(devices)].some(
        (hash, i) => hash !== [old.desktopHash, old.mobileHash, old.deviceHash][i],
      )
    )
      throw Error('Cached screenshot mismatch');
    writeFileSync(`${out}/${id}-devices.jpg`, devices);
    writeFileSync(`${out}/${id}-desktop.jpg`, shots.desktop);
    writeFileSync(`${out}/${id}-phone.jpg`, shots.mobile);
    const input: ComposeInput = {
      cfg,
      variant: v4LetterVariant(t.group === 'kurse' ? 'kurse_training' : t.group, index % 2 ? 'B' : 'A'),
      recipient: { businessName: name, street: facts.street, houseNumber: facts.houseNumber, postalCode: facts.postalCode, city },
      branchLabel: label,
      personalization: {
        businessName: name,
        city,
        branchLabel: label,
        details: [first, second].map((text) => ({
          text,
          verified: true,
          source: `fixture:${id}:explicitly-fictional-facts`,
          checkedAt: new Date().toISOString(),
        })),
      },
      domain: null,
      rating: null,
      compositeDataUri: `data:image/jpeg;base64,${devices.toString('base64')}`,
      qrDataUri: await qrDataUri(`http://127.0.0.1:${PORT}/q/${id}`),
      shortUrl: `127.0.0.1:${PORT}/s${id}`,
      dateLine: 'Testort, 26. Oktober 2026',
      expiresLabel: '26. November 2026',
      privacyNotice: privacyNoticeText(cfg, 'mock', 'example.test/datenschutz'),
      objectionNotice: objectionNoticeText('support@example.test'),
      priceLabel: '597 €',
    };
    input.invitationCopy = await writePreviewInvitation(
      {
        context: input.personalization!,
        sequence: 1,
        demoHtml: html,
        variant: index % 2 ? 'B' : 'A',
      },
      {
        mock: false,
        source: 'fixture',
        call: async <T,>(req: { toolName: string; prompt: string }) => {
          if (req.toolName === LETTER_WRITER_TOOL) {
            const packet = JSON.parse(req.prompt);
            return letterCopyFixture(index, name, packet.facts) as T;
          }
          // Expected review response is mocked. Human text/render review is recorded separately.
          return { passed: true, issues: [] } as T;
        },
      },
    );
    if (input.invitationCopy.engine !== 'fixture')
      throw Error(`Testtext ${id} nicht bestanden: ${input.invitationCopy.reviewReasons.join(' | ')}`);
    const data = composeLetter(input);
    const letterHtml = renderLetterHtml(data).replace(
      'Websites für lokale Betriebe',
      'Fiktiver Testbetrieb · Muster, nicht zum Versand',
    );
    writeFileSync(`${out}/${id}-letter.html`, letterHtml);
    writeFileSync(
      `${out}/${id}-text.json`,
      JSON.stringify(
        {
          subject: data.subject,
          greeting: data.greeting,
          intro: data.intro,
          offer: data.offer,
          noAction: data.noAction,
          copyEvidence: data.copyEvidence,
        },
        null,
        2,
      ),
    );
    const pdf = await htmlToPdf(letterHtml);
    writeFileSync(`${out}/${id}-letter.pdf`, pdf);
    const dom = await validateLetterDom(letterHtml, 'left');
    const print = await validateLetterPdf(pdf, {
      expectedPages: 1,
      recipientLines: data.recipientLines,
      position: 'left',
      qrExpectedUrl: `http://127.0.0.1:${PORT}/q/${id}`,
    });
    const truth = checkLetterTruth({
      letter: data,
      placeholderValues: placeholderValues(input),
      claimSpans: [],
      claims: [],
      allowedClaimIds: [],
      industry: null,
      sourcesLabel: 'example.test/quellen',
      extraBlocklist: letterTruthBlocklist(cfg),
    });
    execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-r', '300', '-png', `${out}/${id}-letter.pdf`, `${out}/${id}-print`], {
      stdio: 'pipe',
    });
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.emulateMedia({ media: 'print' });
    await page.setContent(letterHtml);
    await page.evaluate(() => document.fonts.ready);
    const b = await page.locator('img.qr').first().boundingBox();
    const meta = await sharp(`${out}/${id}-print.png`).metadata();
    const scale = meta.width / ((210 * 96) / 25.4);
    const raster = await sharp(`${out}/${id}-print.png`)
      .extract({
        left: Math.floor(b!.x * scale) - 3,
        top: Math.floor(b!.y * scale) - 3,
        width: Math.ceil(b!.width * scale) + 6,
        height: Math.ceil(b!.height * scale) + 6,
      })
      .greyscale()
      .toColourspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const rgba = new Uint8ClampedArray(raster.info.width * raster.info.height * 4);
    for (let i = 0; i < raster.info.width * raster.info.height; i++) {
      const at = i * raster.info.channels;
      rgba[i * 4] = raster.data[at];
      rgba[i * 4 + 1] = raster.data[at + (raster.info.channels >= 3 ? 1 : 0)];
      rgba[i * 4 + 2] = raster.data[at + (raster.info.channels >= 3 ? 2 : 0)];
      rgba[i * 4 + 3] = 255;
    }
    const scan = jsQR(rgba, raster.info.width, raster.info.height)?.data;
    await sharp(`${out}/${id}-print.png`).resize({ width: 1100 }).jpeg({ quality: 88 }).toFile(`${out}/${id}-print.jpg`);
    const text = (await pdfTextItems(pdf)).items.map((i) => i.str).join(' ');
    const targets = [];
    for (const url of [`http://127.0.0.1:${PORT}/q/${id}`, `http://127.0.0.1:${PORT}/s${id}`]) {
      const r = await fetch(url);
      targets.push(r.ok && r.url.endsWith(`/d/${id}`) && (await r.text()).includes(name.replace(/&/g, '&amp;')));
    }
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://127.0.0.1:${PORT}/q/${id}`);
    await imagesPainted(page);
    await page.screenshot({ path: `${out}/${id}-mobile.jpg`, type: 'jpeg', quality: 85, fullPage: true });
    const result = {
      id,
      name,
      branch: label,
      template,
      profile: data.copyEvidence?.profile,
      usedFacts: data.copyEvidence?.usedFacts,
      textSource: data.copyEvidence?.engine,
      issues: [...dom, ...print.issues],
      pages: print.pages,
      qrRaster: scan === `http://127.0.0.1:${PORT}/q/${id}`,
      targets: targets.every(Boolean),
      noPrices: !/(?:597|590|49|19|99)\s*€|Care\+|Monatsabrechnung/.test(text),
      privacy: text.includes('Art. 14 DSGVO') && text.includes('Art. 21 DSGVO'),
      date: text.includes('26. Oktober 2026'),
      truth: truth.passed,
      truthViolations: truth.violations,
      mobileOverflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
      demoHash: sha256(Buffer.from(html)),
      desktopHash: sha256(shots.desktop),
      mobileHash: sha256(shots.mobile),
      deviceHash: sha256(devices),
      pdfHash: sha256(pdf),
      visualApproved: false,
    };
    results.push(result);
    writeFileSync(
      `${out}/checks.json`,
      JSON.stringify(
        results.sort((a, b) => a.id.localeCompare(b.id)),
        null,
        2,
      ),
    );
    console.log(
      id,
      name,
      'issues',
      result.issues.length,
      'truth',
      result.truth,
      'QR',
      result.qrRaster,
      'noPrices',
      result.noPrices,
    );
  }
} finally {
  await browser.close();
  await closeBrowser();
  await new Promise<void>((r) => server.close(() => r()));
}
