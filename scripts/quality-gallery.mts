/** Actual render evidence only. No invented device screens, vendor calls or published pages. */
import { mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { esc } from '../packages/templates/src/html';
const root = 'data/exports/quality-2026-10-27';
const docs = 'docs/quality-completion/evidence';
mkdirSync(docs, { recursive: true });
const data = (p: string) => `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`;
const style = `*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui;background:#eef2f6;color:#172e3d}main{max-width:1600px;margin:auto;padding:28px}h1{line-height:1.15}h2{font-size:20px}a{color:#164b7c}img{display:block;width:100%;height:auto}figure{margin:0;background:white;padding:16px;border:1px solid #d1dbe4;border-radius:10px}figcaption{font-weight:650;margin-bottom:12px}.grid{display:grid;gap:18px;grid-template-columns:repeat(3,minmax(0,1fr))}.pair{display:grid;gap:16px;grid-template-columns:repeat(2,minmax(0,1fr));margin-bottom:28px}.meta{font-size:14px;max-width:950px}@media(max-width:700px){.grid,.pair{grid-template-columns:1fr}}`;
const wrap = (title: string, body: string) =>
  `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title><style>${style}</style><main><h1>${esc(title)}</h1>${body}</main></html>`;
const demos = JSON.parse(readFileSync(`${root}/after/checks.json`, 'utf8'));
const letters = JSON.parse(readFileSync(`${root}/letters/checks.json`, 'utf8'));
let html = wrap(
  'SeitenWerk – überprüfbare Qualitätsverbesserungen',
  `<p>27.10.2026 · DRY_RUN=true · ausschließlich fiktive Testprofile. Tatsächliche Browseransichten und gerenderte A4-PDFs. Texte der Briefe: redaktionelle Offline-Fixtures, keine echte LLM-Abnahme. Kein Versand oder Produktionsdeploy.</p><h2>Zehn Primärbranchen-Demos</h2><div class="grid">${demos.map((r) => `<figure><figcaption>${esc(r.name)}</figcaption><p class="meta">${r.templateId}</p><a href="after/${r.id}.html"><img src="after/${r.id}-hero-1440.jpg" alt="Desktopdemo"></a><p><a href="after/${r.id}-1440.jpg">Desktop vollständig</a> · <a href="after/${r.id}-390.jpg">Mobil vollständig</a> · <a href="before/${r.id}-1440.jpg">Vorher</a></p></figure>`).join('')}</div><h2>24 vollständige Briefe und passende Demos</h2><p>QR/Kurzlinks wurden ausschließlich auf dem lokalen Testserver geprüft. Keine öffentlich nutzbaren Versandziele. Bildwelt: lizenzierte Gestaltungsmotive, keine Kundenprojekte.</p><div class="grid">${letters.map((r) => `<figure><figcaption>${esc(r.name)}</figcaption><a href="letters/${r.id}-letter.pdf"><img src="letters/${r.id}-print.jpg" alt="Gerenderter A4-Testbrief"></a><p><a href="letters/${r.id}-letter.pdf">PDF</a> · <a href="letters/${r.id}-print.png">300dpi</a> · <a href="letters/${r.id}-demo.html">Zugehörige Demo</a> · <a href="letters/${r.id}-text.json">Text/Fakten</a></p></figure>`).join('')}</div>`,
);
writeFileSync(`${root}/galerie.html`, html);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  for (const width of [1440, 390]) {
    const body = ['01', '04', '07']
      .map(
        (id) =>
          `<h2>${esc(demos.find((r) => r.id === id).name)} · ${width}px</h2><div class="pair">${['before', 'after'].map((phase) => `<figure><figcaption>${phase === 'before' ? 'Vorher' : 'Nachher'}</figcaption><img src="${data(`${root}/${phase}/${id}-hero-${width}.jpg`)}" alt="Reale Browseransicht"></figure>`).join('')}</div>`,
      )
      .join('');
    await page.setContent(wrap('Vorher / nachher – dieselben fiktiven Betriebe', body));
    await page.screenshot({ path: `${docs}/vergleich-${width}.jpg`, type: 'jpeg', quality: 88, fullPage: true });
  }
  const templates = JSON.parse(readFileSync(`${root}/templates-final/checks.json`, 'utf8'));
  for (let i = 0; i < templates.length; i += 5) {
    const body = `<div class="grid" style="grid-template-columns:repeat(5,1fr)">${templates
      .slice(i, i + 5)
      .map(
        (r) =>
          `<figure><figcaption>${esc(r.template)}</figcaption><img src="${data(`${root}/templates-final/${r.template}-hero-390.jpg`)}" alt="Echte Mobilansicht"></figure>`,
      )
      .join('')}</div>`;
    await page.setContent(wrap(`Mobile Vorlagenprüfung ${i + 1}–${i + 5}`, body));
    await page.screenshot({ path: `${docs}/vorlagen-${i + 1}.jpg`, type: 'jpeg', quality: 88, fullPage: true });
  }
  for (let i = 0; i < letters.length; i += 6) {
    const body = `<div class="grid">${letters
      .slice(i, i + 6)
      .map(
        (r) =>
          `<figure><figcaption>${esc(r.name)}</figcaption><img src="${data(`${root}/letters/${r.id}-print.jpg`)}" alt="Gerenderte PDF-Druckansicht"></figure>`,
      )
      .join('')}</div>`;
    await page.setContent(wrap(`Druckprüfung ${i + 1}–${Math.min(i + 6, letters.length)}`, body));
    await page.screenshot({ path: `${docs}/briefe-${i + 1}.jpg`, type: 'jpeg', quality: 88, fullPage: true });
  }
  for (const id of ['04', '09', '11', '21', '23']) {
    copyFileSync(`${root}/letters/${id}-letter.pdf`, `${docs}/${id}-brief.pdf`);
    copyFileSync(`${root}/letters/${id}-print.jpg`, `${docs}/${id}-brief.jpg`);
  }
  for (const id of ['01', '04', '07'])
    for (const width of [1440, 390]) copyFileSync(`${root}/after/${id}-hero-${width}.jpg`, `${docs}/${id}-demo-${width}.jpg`);
  html = wrap(
    'SeitenWerk – kompakte Abnahmegalerie',
    `<p>Alle Betriebe ausdrücklich fiktiv. Echte Renderergebnisse, redaktionelle Brief-Fixtures. Keine echte LLM-, Stripe-, Versand- oder Kundenabnahme.</p><h2>Demos vorher / nachher</h2><a href="vergleich-1440.jpg"><img src="vergleich-1440.jpg" alt="Drei Desktopvergleiche"></a><p><a href="vergleich-390.jpg">Smartphonevergleich</a></p><h2>Fünf vollständige Briefe</h2><div class="grid">${['04', '09', '11', '21', '23'].map((id) => `<figure><a href="${id}-brief.pdf"><img src="${id}-brief.jpg" alt="Testbrief"></a><p><a href="${id}-brief.pdf">PDF öffnen</a></p></figure>`).join('')}</div><p>Vollständige24-Paare-Galerie und ZIP im lokalen Export. Kein öffentlicher Hosting-Link; keine Veröffentlichung freigegeben.</p>`,
  );
  writeFileSync(`${docs}/galerie.html`, html);
} finally {
  await browser.close();
}
