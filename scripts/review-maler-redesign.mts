/** Reproducible offline painter design review; fictional facts, no database/provider calls. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import QRCode from '../packages/core/node_modules/qrcode/lib/index.js';
import { renderSite, renderLetterHtml } from '../packages/templates/src/index';
import { demoInput } from '../packages/templates/test/fixtures';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { composeLetter } from '../packages/core/src/letters/compose';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { objectionNoticeText } from '../packages/core/src/letters/notices';
import { v4Offer } from '../packages/core/src/services/offers-v4';
import { formatEuroShort } from '../packages/core/src/util/time';
import { validateLetterDom, validateLetterPdf, htmlToPdf } from '../packages/core/src/render/pdf';
import { browserChecks, lighthouseCheck, validateHtml } from '../packages/core/src/render/qa';
import { takeScreenshots, renderComposite } from '../packages/core/src/render/screenshots';
import { closeBrowser } from '../packages/core/src/render/browser';
process.env.APP_URL = 'http://127.0.0.1:3214';
process.env.DEMO_DOMAIN = '127.0.0.1:3214';
process.env.TRACK_DOMAIN = '127.0.0.1:3214';
const out = process.env.REVIEW_OUT ?? 'data/exports/maler-design-review';
mkdirSync(out, { recursive: true });
const cfg = deepMerge(DEFAULT_CONFIG, {
  offers: { activeVersion: 'v4' },
  sender: {
    name: 'Erika Beispiel',
    company: 'SeitenWerk Testabsender',
    street: 'Beispielweg 1',
    postalCode: '12345',
    city: 'Beispielstadt',
    phone: '+493000000000',
    email: 'support@example.test',
    website: 'example.test',
    whatsappNumber: '493000000000',
    intro: 'Fiktive Absenderangaben. Lokaler Gestaltungstest, kein echtes Angebot.',
  },
});
const ids = ['handwerk-klar', 'handwerk-solid', 'handwerk-werkstatt'];
const rows = [];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium',
  headless: true,
});
try {
  for (const [index, id] of ids.entries()) {
    const input = demoInput(id, 'werkblau', 'handwerk');
    input.facts = {
      ...input.facts,
      name: 'Malerbetrieb Muster & Partner',
      city: 'Musterstadt',
      street: 'Musterweg',
      houseNumber: '1',
      postalCode: '12345',
      phone: '030 00000000',
      phoneHref: 'tel:+493000000000',
    };
    input.content = {
      hero_headline: 'Farbe für Wände. Charakter für Räume.',
      hero_subline:
        'Innenanstriche, Fassaden und Lackierarbeiten in Musterstadt. Beschreiben Sie uns, welche Fläche Sie verändern möchten.',
      services: [
        {
          title: 'Innenanstriche',
          text: 'Ein neuer Anstrich für Wohnräume, Büros und Treppenhäuser. Nennen Sie uns Räume, Fläche und Ihren Farbwunsch.',
          icon: 'roller',
        },
        {
          title: 'Fassadenanstriche',
          text: 'Die Außenfläche Ihres Hauses neu gestalten. Für eine Anfrage helfen Fotos und eine Beschreibung des Untergrunds.',
          icon: 'house',
        },
        {
          title: 'Lackierarbeiten',
          text: 'Türen, Rahmen und Holzbauteile neu beschichten. Schreiben Sie uns, welche Bauteile Sie überarbeiten lassen möchten.',
          icon: 'brush',
        },
      ],
      about:
        'Muster & Partner führt Innenanstriche, Fassadenanstriche und Lackierarbeiten in Musterstadt aus. Ob einzelne Türrahmen oder mehrere Räume: Beschreiben Sie uns, was Sie verändern möchten.\n\nFür eine konkrete Anfrage sind Fotos der Fläche, eine ungefähre Größe und Ihre Wünsche ein guter Anfang.',
      cta_text: 'Kontakt ansehen',
      seo_title: 'Malerbetrieb Muster & Partner · Fiktiver Entwurf',
      seo_description: 'Fiktive Malerbetrieb-Demo zur lokalen Gestaltungsabnahme.',
      faq: [
        {
          q: 'Was gehört in meine Anfrage?',
          a: 'Beschreiben Sie die Fläche, den Untergrund und Ihren Farbwunsch. Fotos helfen dabei, Ihr Vorhaben einzuordnen.',
        },
        {
          q: 'Ist mit einer Anfrage schon etwas bestellt?',
          a: 'Nein. Mit Ihrer Nachricht beschreiben Sie zunächst Ihr Vorhaben. Umfang, Termin und Preis werden vor einer Beauftragung vereinbart.',
        },
      ],
    };
    input.demo = { ...demoOptions('fictional-painter-review', cfg), expiresLabel: '26. November 2026' };
    const before = renderSite(input);
    input.designReview = true;
    const html = renderSite(input);
    writeFileSync(`${out}/${id}.html`, html);
    writeFileSync(`${out}/${id}-before.html`, before);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.route(/^https?:/, (r) => r.abort());
    for (const [label, markup] of [
      ['before', before],
      ['after', html],
    ]) {
      for (const width of label === 'before' ? [1440, 390] : [1440, 360, 390, 430]) {
        await page.setViewportSize({ width, height: width === 1440 ? 900 : width === 360 ? 800 : width === 390 ? 844 : 932 });
        await page.setContent(markup);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({ path: `${out}/${id}-${label}-${width}.png`, fullPage: true });
        if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))
          throw Error(`${id}/${width}: overflow`);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(html);
    await page.addStyleTag({
      content: '.sw-demo-context,.sw-demo-toolbar,#uebernehmen{display:none!important}body{padding-bottom:0!important}',
    });
    const header = await page.locator('.rw-header').boundingBox();
    const hero = await page.locator('[data-review-hero]').boundingBox();
    if (!hero || !header) throw Error('Hero missing');
    const clip = { x: 0, y: header.y, width: 1440, height: Math.ceil(hero.y + hero.height - header.y) };
    const heroShot = await page.screenshot({ type: 'jpeg', quality: 90, clip });
    writeFileSync(`${out}/${id}-hero.jpg`, heroShot);
    await page.addStyleTag({ content: 'html{filter:grayscale(1)}' });
    await page.screenshot({ path: `${out}/${id}-grayscale.png`, clip });
    await page.setContent(html);
    // Detail capture only: a tall element screenshot otherwise includes the sticky
    // toolbar across its middle. Full-page screenshots above retain the real UI.
    await page.addStyleTag({ content: '.sw-demo-toolbar{visibility:hidden!important}' });
    await page.locator('#uebernehmen').screenshot({ path: `${out}/${id}-offer.png` });
    const server = createServer((req, res) => {
      if (req.url === `/q/a`) {
        res.writeHead(302, { location: `/d/${id}` });
        res.end();
      } else if (req.url === `/d/${id}`) {
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(html);
      } else {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    const port = (server.address() as { port: number }).port;
    const url = `http://127.0.0.1:${port}/q/a`;
    const response = await fetch(url);
    if (!response.url.endsWith(`/d/${id}`) || !(await response.text()).includes('Malerbetrieb Muster'))
      throw Error(`QR target mismatch: ${response.status} ${response.url}`);
    const data = composeLetter({
      cfg,
      variant: v4LetterVariant('handwerk', 'A'),
      branchLabel: 'Malerbetrieb',
      recipient: {
        businessName: input.facts.name,
        street: input.facts.street,
        houseNumber: input.facts.houseNumber,
        postalCode: input.facts.postalCode,
        city: input.facts.city,
      },
      domain: null,
      rating: null,
      compositeDataUri: null,
      desktopScreenshotDataUri: 'data:image/jpeg;base64,' + heroShot.toString('base64'),
      qrDataUri: await QRCode.toDataURL(url, { width: 600, margin: 4 }),
      shortUrl: url.replace('http://', ''),
      dateLine: '26. Oktober 2026',
      privacyNotice:
        '**Fiktiver Testbrief – Datenschutzhinweis zur Druckprüfung:** Alle Absender- und Empfängerangaben sind erfunden. Es wurden keine echten Firmendaten für diesen Brief recherchiert. Bei echtem Versand müssen die tatsächlichen Verantwortlichen mit Name, Anschrift und Kontakt genannt werden. Erforderlich sind außerdem die zutreffende Datenherkunft, Zweck und Rechtsgrundlage der Verarbeitung, Empfänger wie Druck- und Hostingdienstleister, Löschfristen und Betroffenenrechte. Dazu gehören Auskunft, Berichtigung, Löschung, Einschränkung, Werbewiderspruch und Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Fehlende Freigaben blockieren den echten Versand. Die tatsächlichen Angaben und vollständigen Datenschutzhinweise müssen vor Freigabe geprüft werden. Diese PDF ist ausschließlich ein lokaler Gestaltungstest, keine versandfertige Werbung.',
      objectionNotice: objectionNoticeText('support@example.test'),
      priceLabel: formatEuroShort(v4Offer('basis').setupCents),
      expiresLabel: '26. November 2026',
    });
    data.subject = 'Ein Website-Entwurf für Muster & Partner';
    data.intro = [
      'für Malerbetrieb Muster & Partner habe ich einen Website-Entwurf vorbereitet. So könnten Interessierte Ihre Malerleistungen kennenlernen und eine Anfrage stellen. Sehen Sie ihn kostenlos an – ohne Anmeldung.',
    ];
    data.privacyNotice = 'Fiktiver Testbrief. Alle Angaben sind Testdaten. Kein Versand. Vor echtem Einsatz müssen Verantwortliche, Datenquelle, Rechtsgrundlage, Empfänger und Betroffenenrechte fachlich geprüft und vollständig angegeben werden.';
    data.reviewOffer = {
      setup: formatEuroShort(v4Offer('basis').setupCents),
      basis: formatEuroShort(v4Offer('basis').monthlyCents),
      care: formatEuroShort(v4Offer('care_plus').monthlyCents),
      conditions:
        'Basis oder Care+ wählen. Monatsgebühr erst ab bestätigtem Go-Live. Monatlich kündbar. Care+ enthält Basis bereits.',
      scope: `Fertigstellung, ${cfg.onboarding.includedChangeRounds} Änderungsrunden, Standard-Domain im vereinbarten Umfang, Hosting und SSL. Care+: bis zu ${v4Offer('care_plus').includedChangeMinutes} Minuten kleine Änderungen/Monat.`,
    };
    const deviceShots = await takeScreenshots(html, { hideDemoChrome: true });
    data.compositeDataUri = 'data:image/jpeg;base64,' + (await renderComposite(deviceShots.desktop, deviceShots.mobile, { businessName: input.facts.name, printWidthMm:165 })).toString('base64');
    const letter = renderLetterHtml(data);
    writeFileSync(`${out}/${id}-brief.html`, letter);
    const dom = await validateLetterDom(letter, 'left');
    if (dom.length) throw Error(JSON.stringify(dom));
    const pdf = await htmlToPdf(letter);
    const check = await validateLetterPdf(pdf, {
      recipientLines: data.recipientLines,
      position: 'left',
      expectedPages: 1,
      qrExpectedUrl: url,
    });
    if (check.issues.length) throw Error(JSON.stringify(check.issues));
    writeFileSync(`${out}/${id}-brief.pdf`, pdf);
    writeFileSync(`${out}/${id}-brief.html`, letter);
    await page.setViewportSize({ width: 794, height: 1123 });
    await page.setContent(letter);
    await page.emulateMedia({ media: 'print' });
    await page.screenshot({ path: `${out}/${id}-brief.png`, fullPage: true });
    await page.emulateMedia({ media: 'screen' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.setContent(html);
    if (await page.locator('#frage').isVisible()) throw new Error('Frageformular verdeckt erste Ansicht');
    await page.getByRole('link', { name: 'Kontakt ansehen', exact: true }).click();
    if (new URL(page.url()).hash !== '#kontakt') throw new Error('Kontakt-CTA falsch zugeordnet');
    await page.getByRole('link', { name: 'Website-Angebot ansehen', exact: true }).click();
    if (new URL(page.url()).hash !== '#uebernehmen') throw new Error('Angebots-CTA falsch zugeordnet');
    await page.getByRole('link', { name: 'Fragen', exact: true }).click();
    await page.locator('#f-msg').waitFor({ state: 'visible' });
    await page.screenshot({ path: `${out}/${id}-question-open.png` });
    const checks = [await validateHtml(html), ...(await browserChecks({ html }))];
    checks.push(
      ...(
        await browserChecks({
          html: html.replace('</head>', '<style>.rw-provider-question{display:block!important}</style></head>'),
        })
      ).map((c) => ({ ...c, name: 'question-open-' + c.name })),
    );
    if (checks.some((c) => !c.passed)) throw new Error(JSON.stringify(checks.filter((c) => !c.passed)));
    const beforePerformance = await lighthouseCheck(before, 0);
    const afterPerformance = await lighthouseCheck(html, 0);
    rows.push({
      id,
      concept: ['Premium Editorial', 'Modern Business', 'Bold Creative'][index],
      checks,
      beforePerformance,
      afterPerformance,
      qrRedirect: true,
      pdfQr: true,
      pages: check.pages,
      heroHeight: clip.height,
      visualApproved: false,
    });
    writeFileSync(`${out}/checks.json`, JSON.stringify(rows, null, 2));
    await new Promise<void>((r) => server.close(() => r()));
    await ctx.close();
    console.log(
      id,
      checks.filter((c) => !c.passed),
    );
  }
} finally {
  await browser.close();
  await closeBrowser();
}
