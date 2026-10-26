/** Local fictional design evidence. No database, provider, deploy or customer contact. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import QRCode from '../packages/core/node_modules/qrcode/lib/index.js';
import { renderSite, renderLetterHtml } from '../packages/templates/src';
import { demoInput } from '../packages/templates/test/fixtures';
import { takeScreenshots, renderComposite } from '../packages/core/src/render/screenshots';
import { closeBrowser } from '../packages/core/src/render/browser';
import { composeLetter } from '../packages/core/src/letters/compose';
import { personalizedLetterCopy } from '../packages/core/src/letters/personalization';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { libraryContent } from '../packages/core/src/demos/library';
import { htmlToPdf, validateLetterPdf, validateLetterDom } from '../packages/core/src/render/pdf';
import { v4Offer } from '../packages/core/src/services/offers-v4';
import { formatEuroShort } from '../packages/core/src/util/time';
const sharp = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url))('sharp');
const out = 'data/exports/premium-completion';
mkdirSync(out, { recursive: true });
const cfg = deepMerge(DEFAULT_CONFIG, {
  offers: { activeVersion: 'v4' },
  sender: {
    name: 'Erika Beispiel',
    company: 'SeitenWerk Testabsender',
    street: 'Beispielweg 1',
    postalCode: '12345',
    city: 'Beispielstadt',
    email: 'support@example.test',
    phone: '+493000000000',
    website: 'example.test',
    whatsappNumber: '493000000000',
    intro: 'Fiktiver Testabsender. Kein echtes Angebot.',
  },
});
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route(/^https?:/, (r) => r.abort());
const rows: {
  id: string;
  name: string;
  files: string[];
  template?: string;
  copy?: ReturnType<typeof personalizedLetterCopy>;
  sources?: string[];
  checks?: unknown[];
  pdfQr?: boolean;
  pages?: number;
}[] = [];
const ids = ['handwerk-klar', 'handwerk-solid', 'handwerk-werkstatt'];
try {
  for (const id of ids) {
    const html = readFileSync(`docs/design-review/evidence/${id}.html`, 'utf8');
    writeFileSync(`${out}/${id}.html`, html);
    await page.setContent(html);
    await page.addStyleTag({ content: '.sw-demo-toolbar{visibility:hidden!important}' });
    for (const [label, selector] of [
      ['leistungen', '#leistungen'],
      ['kontakt', '#betrieb'],
      ['angebot', '#uebernehmen'],
    ] as const)
      await page.locator(selector).screenshot({ path: `${out}/${id}-${label}.png` });
    const shots = await takeScreenshots(html, { hideDemoChrome: true });
    for (const variant of ['minimal', 'editorial', 'studio'] as const) {
      writeFileSync(
        `${out}/${id}-${variant}.jpg`,
        await renderComposite(shots.desktop, shots.mobile, {
          businessName: 'Malerbetrieb Muster & Partner',
          variant,
          printWidthMm: 165,
        }),
      );
    }
    rows.push({
      id,
      name: id,
      files: [
        `${id}-minimal.jpg`,
        `${id}-editorial.jpg`,
        `${id}-studio.jpg`,
        `${id}-leistungen.png`,
        `${id}-kontakt.png`,
        `${id}-angebot.png`,
      ],
    });
  }
  const profiles = [
    ['handwerk', 'maler', 'Malerbetrieb', 'handwerk-klar', 'Farbwerk Nord', 'Innenanstriche', 'Treppenhäuser'],
    ['handwerk', 'maler', 'Malerbetrieb', 'handwerk-solid', 'Fassade & Farbton', 'Fassadenanstriche', 'Holzfenster lackieren'],
    ['handwerk', 'maler', 'Malerbetrieb', 'handwerk-werkstatt', 'Raumfarbe Süd', 'Kalkfarben', 'Altbauräume'],
    ['beauty', 'friseur', 'Friseursalon', 'beauty-elegant', 'Salon Scherenschnitt', 'Haarschnitte', 'Termine per Nachricht'],
    ['beauty', 'friseur', 'Friseursalon', 'beauty-modern', 'Lockenstudio Nord', 'Lockenhaarschnitte', 'Beratung zur Haarpflege'],
    [
      'beauty',
      'kosmetikstudio',
      'Kosmetikstudio',
      'beauty-minimal',
      'Studio Hautzeit',
      'Gesichtsbehandlungen',
      'Terminanfragen per E-Mail',
    ],
    [
      'gastronomie',
      'restaurant',
      'Restaurant',
      'gastro-klassisch',
      'Tisch am Park',
      'Mittagskarte',
      'Öffnungszeiten Dienstag bis Sonntag',
    ],
    ['gastronomie', 'cafe', 'Café', 'gastro-modern', 'Kaffeefenster', 'Kaffee und Kuchen', 'Abholung im Laden'],
    ['gastronomie', 'restaurant', 'Restaurant', 'gastro-bistro', 'Kleine Tafel', 'Abendkarte', 'Reservierungsanfragen'],
    ['einzelhandel', 'blumenladen', 'Blumenladen', 'handel-lokal', 'Blütenraum', 'Schnittblumen', 'Abholung vor Ort'],
    ['einzelhandel', 'buchladen', 'Buchladen', 'handel-modern', 'Buchwinkel', 'Bücher bestellen', 'Abholung im Geschäft'],
    [
      'einzelhandel',
      'fahrradladen',
      'Fahrradladen',
      'handel-boutique',
      'Radladen West',
      'Fahrradzubehör',
      'Besuchsinformationen',
    ],
    ['kurse', 'tanzschule', 'Tanzschule', 'kurse-klar', 'Tanzraum', 'Paartanz', 'Probestundenanfragen'],
    ['kurse', 'yogastudio', 'Yogastudio', 'kurse-energie', 'Atemraum', 'Yoga für Einsteiger', 'Kursanfragen'],
    ['kurse', 'musikschule', 'Musikschule', 'kurse-studio', 'Klangatelier', 'Klavierunterricht', 'Anfragen zum Einzelunterricht'],
  ];
  // Select existing IDs by group where historical names differ; no new design transfer.
  const { TEMPLATES } = await import('../packages/templates/src');
  const texts: string[] = [];
  for (const [n, p] of profiles.entries()) {
    const [group, branch, label, wanted, name, service, detail] = p;
    const tpl = TEMPLATES.find((t) => t.id === wanted) ?? TEMPLATES.filter((t) => t.group === group)[n % 3]!;
    const id = `test-${String(n + 1).padStart(2, '0')}`;
    const input = demoInput(tpl.id, tpl.palettes[0]!, group as import('../packages/templates/src/types').BranchGroup);
    input.facts.name = name!;
    input.facts.city = `Testort ${n + 1}`;
    input.facts.branchLabel = label!;
    input.content = libraryContent(
      branch!,
      group as import('../packages/templates/src/types').BranchGroup,
      { name: name!, stadt: input.facts.city, branche: label! },
      n,
    );
    input.content.hero_headline = `${service} in ${input.facts.city}`;
    input.content.hero_subline = `${detail}. Fiktives Testprofil zur Gestaltungsprüfung.`;
    input.content.services = [
      { title: service!, text: `${service}: Angaben aus dem fiktiven Testprofil.`, icon: 'check' },
      {
        title: detail!,
        text: 'In diesem Testprofil ausdrücklich vorgegeben; kein recherchierter echter Betrieb.',
        icon: 'check',
      },
    ];
    input.content.about = `${name} in ${input.facts.city}: ${service}; ${detail}. Alle Angaben sind fiktive Testdaten.`;
    input.demo = { ...demoOptions(id, cfg), expiresLabel: '26. November 2026' };
    const html = renderSite(input).replace(
      'Unverbindlicher Website-Entwurf',
      'Fiktiver Testbetrieb · Unverbindlicher Website-Entwurf',
    );
    writeFileSync(`${out}/${id}.html`, html);
    const shots = await takeScreenshots(html, { hideDemoChrome: true });
    const composite = await renderComposite(shots.desktop, shots.mobile, {
      businessName: name!,
      printWidthMm: 165,
      variant: (['minimal', 'editorial', 'studio'] as const)[n % 3],
    });
    writeFileSync(`${out}/${id}-mockup.jpg`, composite);
    const copy = personalizedLetterCopy(
      {
        businessName: name!,
        city: input.facts.city,
        branchLabel: label!,
        details: [
          { text: service!, source: `fixture:${id}:services`, verified: true },
          { text: detail!, source: `fixture:${id}:detail`, verified: true },
        ],
      },
      n,
    );
    texts.push(copy.intro.join(' '));
    const url = `http://127.0.0.1:3214/q/${id}`;
    const data = composeLetter({
      cfg,
      variant: v4LetterVariant(
        group === 'kurse' ? 'kurse_training' : (group as import('../packages/core/src/types').Industry),
        'B',
      ),
      recipient: {
        businessName: name!,
        street: 'Testweg',
        houseNumber: String(n + 1),
        postalCode: '12345',
        city: input.facts.city,
      },
      branchLabel: label!,
      domain: null,
      rating: null,
      compositeDataUri: `data:image/jpeg;base64,${composite.toString('base64')}`,
      qrDataUri: await QRCode.toDataURL(url, { width: 600, margin: 4 }),
      shortUrl: url.replace('http://', ''),
      dateLine: '26. Oktober 2026',
      privacyNotice:
        'Fiktive Testdaten. Nur Gestaltungsprüfung; kein Versand. Datenquelle, Rechtsgrundlage, Verantwortliche und vollständige Datenschutzinformationen vor echtem Einsatz fachlich prüfen.',
      objectionNotice: 'Kein Interesse? Werbewiderspruch an support@example.test. Dies ist kein echter Werbebrief.',
      priceLabel: '597 €',
      expiresLabel: '26. November 2026',
    });
    data.subject = copy.subject;
    data.intro = copy.intro;
    data.reviewOffer = {
      setup: formatEuroShort(v4Offer('basis').setupCents),
      basis: formatEuroShort(v4Offer('basis').monthlyCents),
      care: formatEuroShort(v4Offer('care_plus').monthlyCents),
      scope: 'Standard-Domain im vereinbarten Umfang, Hosting und SSL. Eigene Inhalte werden vor Veröffentlichung abgestimmt.',
      conditions: 'Basis oder Care+ wählen. Care+ enthält Basis. Monatsgebühr ab bestätigtem Go-Live, monatlich kündbar.',
    };
    let letter = renderLetterHtml(data);
    // Full-width devices plus a separate QR/offer row: enough print area for the name.
    // Keep the proven one-page geometry; actual device composition remains 118 mm, clearly labelled.
    letter = letter.replace(
      '</style>',
      '.review-letter .hero-complete{max-height:67mm}.review-letter .intro{font-size:9.6pt}.review-prices{padding:2mm 0}.review-prices strong{font-size:10pt}</style>',
    );
    writeFileSync(`${out}/${id}-brief.html`, letter);
    const pdf = await htmlToPdf(letter);
    writeFileSync(`${out}/${id}-brief.pdf`, pdf);
    const dom = await validateLetterDom(letter, 'left');
    const check = await validateLetterPdf(pdf, {
      recipientLines: data.recipientLines,
      position: 'left',
      expectedPages: 1,
      qrExpectedUrl: url,
    });
    execFileSync('pdftoppm', ['-f', '1', '-singlefile', '-r', '150', '-png', `${out}/${id}-brief.pdf`, `${out}/${id}-druck`]);
    await sharp(`${out}/${id}-druck.png`).webp({ quality: 88 }).toFile(`${out}/${id}-druck.webp`);
    rows.push({
      id,
      name,
      template: tpl.id,
      copy,
      sources: copy.sources,
      checks: [...dom, ...check.issues],
      pdfQr: !check.issues.length,
      pages: check.pages,
      files: [`${id}-mockup.jpg`, `${id}-druck.webp`, `${id}-brief.pdf`, `${id}.html`],
    });
    console.log(id, JSON.stringify(check.issues));
  }
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\p{L}\s]/gu, '')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const similarities = [];
  for (let a = 0; a < texts.length; a++)
    for (let b = a + 1; b < texts.length; b++) {
      const x = words(texts[a]!),
        y = words(texts[b]!);
      similarities.push({ a: a + 1, b: b + 1, jaccard: [...x].filter((w) => y.has(w)).length / new Set([...x, ...y]).size });
    }
  writeFileSync(
    `${out}/checks.json`,
    JSON.stringify({ rows, similarities, visualApproved: false, publicQr: false, realCustomerValidation: false }, null, 2),
  );
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  writeFileSync(
    `${out}/index.html`,
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SeitenWerk – lokale Abnahmegalerie</title><style>body{font:16px/1.6 Arial;color:#17243b;margin:auto;max-width:1400px;padding:24px;background:#f4f6f9}h1{line-height:1.15}article{padding:24px;background:white;margin:24px 0;border-radius:16px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}img{width:100%;height:auto}a{color:#204bc2}.letters{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}</style><h1>SeitenWerk · Gestalterische Entscheidung</h1><p>Nur fiktive Testdaten. Nicht veröffentlicht. Keine echten Käufe oder Briefe. QR-Ziele nur lokal. Ansichten anklicken, um die Originalauflösung zu öffnen.</p>${rows.map((r) => `<article><h2>${esc(r.name)}</h2><div class="grid">${r.files.map((f: string) => `<div><a href="${f}">${/\.(jpg|webp|png)$/.test(f) ? `<img loading="lazy" src="${f}" alt="${esc(f)}">` : esc(f)}</a></div>`).join('')}</div>${r.copy ? `<p>${r.copy.intro.map(esc).join('</p><p>')}</p>` : ''}</article>`).join('')}</html>`,
  );
  console.log('Gallery complete', rows.length);
} finally {
  await browser.close();
  await closeBrowser();
}
