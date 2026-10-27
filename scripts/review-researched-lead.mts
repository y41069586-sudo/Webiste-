/** Private, offline review of one researched prospect. Never invokes DB, queue, send or payment services. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { renderSite, renderLetterHtml, industryDirection, type BusinessFacts, type SiteContent } from '../packages/templates/src';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { demoOptions } from '../packages/core/src/demos/build';
import { validateDemoContent, type ContentFacts } from '../packages/core/src/demos/content';
import {
  assessAcquisition,
  researchIdentity,
  type LeadResearch,
  type ResearchSubject,
} from '../packages/core/src/leads/acquisition';
import { composeLetter } from '../packages/core/src/letters/compose';
import { v4LetterVariant } from '../packages/core/src/letters/conversion-v4';
import { writePreviewInvitation, LETTER_WRITER_TOOL, type InvitationDraft } from '../packages/core/src/letters/writer';
import { privacyNoticeText, objectionNoticeText } from '../packages/core/src/letters/notices';
import { qrDataUri } from '../packages/core/src/render/letter';
import { takeScreenshots, renderComposite, imagesPainted } from '../packages/core/src/render/screenshots';
import { htmlToPdf, validateLetterDom, validateLetterPdf, pdfTextItems } from '../packages/core/src/render/pdf';
import { closeBrowser, withPage } from '../packages/core/src/render/browser';
import { sha256 } from '../packages/core/src/util/crypto';

for (const key of [
  'LLM_PROVIDER',
  'LEAD_SOURCE',
  'MAIL_PROVIDER',
  'PAYMENT_PROVIDER',
  'REGISTRAR_PROVIDER',
  'HOSTING_PROVIDER',
  'EMAIL_PROVIDER',
])
  if (process.env[key] !== 'mock') throw Error(`Offline review requires ${key}=mock`);
if (process.env.DRY_RUN !== 'true') throw Error('Offline review requires DRY_RUN=true');
const inputPath = resolve(process.argv[2] ?? '');
const out = resolve(process.argv[3] ?? '');
const privateRoot = `${resolve('data')}/`;
if (!inputPath.startsWith(privateRoot) || !out.startsWith(privateRoot))
  throw Error('Research and exports must stay in ignored data/.');
type Input = {
  subject: ResearchSubject;
  research: Omit<LeadResearch, 'identityHash'>;
  content: SiteContent;
  letter: InvitationDraft;
  manualCopyReviewed: boolean;
  sourceLabel: string;
  notes: string[];
};
const input = JSON.parse(readFileSync(inputPath, 'utf8')) as Input;
if (!input.manualCopyReviewed) throw Error('Editorial offline sample needs a separate manual fact/copy review.');
const research = { ...input.research, identityHash: researchIdentity(input.subject) };
const assessment = assessAcquisition(input.subject, research);
if (assessment.state !== 'ready') throw Error(`Candidate needs research: ${assessment.missing.join(' | ')}`);
mkdirSync(out, { recursive: true });
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
    phone: '',
    whatsappNumber: '',
    website: 'example.test',
  },
});
const services = research.signals.filter((s) => s.kind === 'service').map((s) => s.text);
const facts: BusinessFacts = {
  name: input.subject.businessName,
  branchLabel: 'Maler- und Renovierungsarbeiten',
  group: 'handwerk',
  industry: 'handwerk',
  city: input.subject.city,
  street: input.subject.street ?? '',
  houseNumber: input.subject.houseNumber ?? '',
  postalCode: input.subject.postalCode ?? '',
  phone: input.subject.phone,
  phoneHref: input.subject.phone ? `tel:${input.subject.phone}` : null,
  openingLines: [],
};
const contentFacts: ContentFacts = {
  name: facts.name,
  branchLabel: facts.branchLabel,
  branchKey: input.subject.branch,
  group: facts.group,
  city: facts.city,
  postalCode: facts.postalCode,
  street: facts.street,
  houseNumber: facts.houseNumber,
  phone: facts.phone ?? null,
  socialOnly: true,
  hasOpeningHours: false,
  verifiedServices: services,
};
const contentIssues = validateDemoContent(input.content, contentFacts);
if (contentIssues.length) throw Error(`Content failed: ${JSON.stringify(contentIssues)}`);
const port = 3232;
const origin = `http://127.0.0.1:${port}`;
const qrUrl = `${origin}/q/private-review`;
let html = renderSite({
  templateId: 'handwerk-klar',
  palette: 'anthrazit',
  mode: 'demo',
  facts,
  artDirection: industryDirection(facts.group, facts.branchLabel),
  content: input.content,
  demo: { ...demoOptions('private-review', cfg), expiresLabel: 'Interne Kontrollvorschau' },
});
// Test-only link localization. Real application routes and publication gates remain untouched.
html = html.replaceAll('http://localhost:3000', origin).replaceAll('http://127.0.0.1:3000', origin);
html = html.replace('<body ', '<body data-internal-review="true" ');
const server = createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/q/private-review' || req.url === '/preview') {
    res.writeHead(302, { Location: '/d/private-review' });
    res.end();
    return;
  }
  if (req.url === '/d/private-review') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(409, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Interne Gestaltungsprüfung. Bestellung, Kontaktübermittlung und Veröffentlichung sind gesperrt.');
});
await new Promise<void>((ok, fail) => {
  server.once('error', fail);
  server.listen(port, '127.0.0.1', ok);
});
try {
  writeFileSync(`${out}/demo.html`, html);
  const shots = await takeScreenshots(html, { hideDemoChrome: true });
  const devices = await renderComposite(shots.desktop, shots.mobile, { businessName: facts.name, printWidthMm: 114 });
  writeFileSync(`${out}/hero-desktop.jpg`, shots.desktop);
  writeFileSync(`${out}/hero-mobil.jpg`, shots.mobile);
  writeFileSync(`${out}/laptop-smartphone.jpg`, devices);
  const context = {
    businessName: facts.name,
    city: facts.city,
    branchLabel: facts.branchLabel,
    details: research.signals
      .filter((s) => s.kind === 'service')
      .slice(0, 3)
      .map((s) => ({ text: s.text, source: s.source, verified: true, checkedAt: s.observedAt })),
  };
  const invitation = await writePreviewInvitation(
    { context, sequence: 1, demoHtml: html },
    {
      mock: false,
      source: 'fixture',
      call: async <T,>(req: { toolName: string }) =>
        (req.toolName === LETTER_WRITER_TOOL ? input.letter : { passed: true, issues: [] }) as T,
    },
  );
  if (invitation.engine !== 'fixture') throw Error(`Editorial text failed: ${invitation.reviewReasons.join(' | ')}`);
  const data = composeLetter({
    cfg,
    variant: v4LetterVariant('handwerk', 'A'),
    recipient: {
      businessName: facts.name,
      city: facts.city,
      street: facts.street,
      houseNumber: facts.houseNumber,
      postalCode: facts.postalCode,
    },
    branchLabel: facts.branchLabel,
    personalization: context,
    invitationCopy: invitation,
    domain: null,
    rating: null,
    compositeDataUri: `data:image/jpeg;base64,${devices.toString('base64')}`,
    qrDataUri: await qrDataUri(qrUrl),
    shortUrl: `127.0.0.1:${port}/preview`,
    dateLine: 'Interne Druckprobe · 27. Oktober 2026',
    expiresLabel: 'Interne Kontrollvorschau',
    privacyNotice: privacyNoticeText(cfg, 'mock', 'example.test/datenschutz').replace('fiktiven Testdaten', input.sourceLabel),
    objectionNotice: objectionNoticeText(cfg.sender.email),
    priceLabel: '597 €',
  });
  // No invented period of public availability: this preview exists only during the local check.
  data.noAction = 'Ohne Bestellung keine Kosten. Interne Druckprobe – nicht veröffentlicht oder zum Versand freigegeben.';
  const letterHtml = renderLetterHtml(data).replace(
    'Websites für lokale Betriebe',
    'Interne Druckprobe · Testabsender · kein Versand',
  );
  writeFileSync(`${out}/brief.html`, letterHtml);
  const pdf = await htmlToPdf(letterHtml);
  writeFileSync(`${out}/brief.pdf`, pdf);
  const domIssues = await validateLetterDom(letterHtml, 'left');
  const pdfResult = await validateLetterPdf(pdf, {
    expectedPages: 1,
    recipientLines: data.recipientLines,
    position: 'left',
    qrExpectedUrl: qrUrl,
  });
  const pdfText = (await pdfTextItems(pdf)).items.map((i) => i.str).join(' ');
  execFileSync('pdftoppm', ['-singlefile', '-r', '300', '-png', `${out}/brief.pdf`, `${out}/druckansicht`], { stdio: 'pipe' });
  const screens = [];
  for (const width of [360, 390, 430, 1440]) {
    screens.push(
      await withPage(
        { width, height: width === 1440 ? 900 : 844, isMobile: width < 600, allowNetwork: true },
        async (page, ctx) => {
          await ctx.route('**/*', (route) =>
            new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
          );
          await page.goto(qrUrl);
          await imagesPainted(page);
          await page.screenshot({ path: `${out}/demo-${width}.jpg`, type: 'jpeg', quality: 86, fullPage: true });
          if (width === 390 || width === 1440) {
            await page.locator('h1').screenshot({ path: `${out}/headline-${width}.png` });
            await page.locator('#uebernehmen').screenshot({ path: `${out}/angebot-${width}.jpg` });
          }
          return {
            width,
            urlAssigned: page.url().endsWith('/d/private-review'),
            ...(await page.evaluate(() => ({
              overflow: document.documentElement.scrollWidth > innerWidth + 1,
              brokenImages: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).length,
              formsPointToLocalReview: [...document.forms].every((f) => new URL(f.action).origin === location.origin),
              singlePhotoFills: [...document.querySelectorAll('.sw-photo-composition')].every((container) => {
                const figures = container.querySelectorAll('figure');
                return (
                  figures.length !== 1 ||
                  figures[0]!.getBoundingClientRect().width >= container.getBoundingClientRect().width * 0.95
                );
              }),
            }))),
          };
        },
      ),
    );
  }
  const checks = {
    checkedAt: new Date().toISOString(),
    scope: 'Real public-source research; manually authored offline copy fixture; not a provider/LLM/send acceptance.',
    acquisition: assessment,
    websiteFinding: 'No own website found in documented searches, not proof of absolute absence.',
    copyEngine: invitation.engine,
    manualCopyReviewed: true,
    autoModelReview: false,
    demoContentIssues: contentIssues,
    letterIssues: [...domIssues, ...pdfResult.issues],
    pages: pdfResult.pages,
    qrDecodedFromPdf: !pdfResult.issues.some((i) => i.check.includes('qr')),
    noLetterPrices: !/597\s*€|19\s*€|99\s*€|Care\+/.test(pdfText),
    lawfulUseForMailApproved: false,
    approvedForSend: false,
    productionPublished: false,
    screens,
    demoHash: sha256(html),
    desktopHash: sha256(shots.desktop),
    mobileHash: sha256(shots.mobile),
    deviceHash: sha256(devices),
    pdfHash: sha256(pdf),
    notes: input.notes,
  };
  writeFileSync(`${out}/checks.json`, JSON.stringify(checks, null, 2));
  writeFileSync(
    `${out}/index.html`,
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width"><title>Private Gestaltungsprüfung</title><style>body{font:17px/1.6 system-ui;max-width:1200px;margin:40px auto;padding:20px;color:#17324c}img{max-width:100%;height:auto}article{margin:40px 0}nav{display:flex;gap:24px;flex-wrap:wrap}aside{padding:20px;background:#eef3f8}</style><h1>Lokaler Demo- und Brief-Probelauf</h1><aside>Echte öffentlich recherchierte Betriebsangaben. Redaktionelle Offline-Texte, keine echte KI-Anbieterabnahme. Testabsender, lokale QR-Ziele. Kein Versand, keine Veröffentlichung, keine Bestellungen.</aside><nav><a href="brief.pdf">Brief als PDF</a><a href="demo.html">Demo öffnen</a><a href="checks.json">Prüfergebnis</a></nav><article><h2>Laptop und Smartphone</h2><img src="laptop-smartphone.jpg"></article><article><h2>Tatsächlich gerenderte Druckprobe</h2><img src="druckansicht.png"></article><article><h2>Desktop</h2><img src="demo-1440.jpg"></article><article><h2>Smartphone · 390 px</h2><img style="max-width:390px" src="demo-390.jpg"></article></html>`,
  );
  if (
    checks.letterIssues.length ||
    checks.pages !== 1 ||
    screens.some((s) => s.overflow || s.brokenImages || !s.urlAssigned || !s.formsPointToLocalReview || !s.singlePhotoFills) ||
    !checks.noLetterPrices
  )
    throw Error('Review failed. Inspect private checks.json.');
  console.log('Private review completed: 4 widths, one A4 PDF, exact demo/device/QR binding. No provider calls.');
} finally {
  await closeBrowser();
  await new Promise<void>((ok) => server.close(() => ok()));
}
