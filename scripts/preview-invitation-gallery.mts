import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { esc } from '../packages/templates/src/html';
const out = 'data/exports/letter-preview-upgrade';
const docs = 'docs/letter-preview-upgrade/evidence';
mkdirSync(docs, { recursive: true });
const rows = JSON.parse(readFileSync(`${out}/checks.json`, 'utf8'));
const style = `*{box-sizing:border-box}body{margin:0;background:#f1f4f8;color:#1c2a3c;font:16px/1.55 system-ui}main{max-width:1500px;margin:auto;padding:30px}h1{line-height:1.1}p{max-width:950px}a{color:#174e86}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px}.card{background:white;border:1px solid #ccd5e1;padding:18px;border-radius:12px}img{width:100%;height:auto;display:block}.meta{font-size:14px;color:#43546c}h2{font-size:18px}.comparison{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}.comparison figure{margin:0;background:white;padding:10px}.comparison figcaption{font-size:14px;margin-bottom:8px}@media(max-width:850px){.grid{grid-template-columns:1fr}.comparison{grid-template-columns:1fr}}`;
let html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SeitenWerk – persönliche Einladungsbriefe</title><style>${style}</style><main><h1>Ihr Betrieb. Ihre Website-Idee.</h1><p>20 ausdrücklich fiktive Testbetriebe · keine echten Recherchen oder Sendungen · DRY_RUN=true. Die Beispieltexte sind redaktionell vorgegebene Offline-Modellantworten (Fixtures), keine echten KI-Ausgaben. Die automatische Schreib-/Prüfstrecke ist mit diesen Antworten getestet; die Textqualität des echten Anbieters bleibt separat abzunehmen.</p><p>Preise und Tarife stehen vor einer Bestellung in der Demo. Die Briefe laden zur kostenlosen, unverbindlichen Vorschau ein. QR-Ziele wurden auf einem lokalen Testserver geprüft und sind keine öffentlich erreichbaren Versandziele.</p><p>Jede Druckansicht stammt aus dem fertigen A4-PDF. Große Gerätebilder zeigen die echte dazugehörige Desktop-/Smartphone-Demo. Kein Bild wurde für einen anderen Empfänger eingesetzt.</p><p><a href="pruefbericht.md">Prüfbericht</a> · <a href="similarity.json">Textvergleich</a></p><div class="grid">`;
for (const r of rows) {
  const text = JSON.parse(readFileSync(`${out}/${r.id}-text.json`, 'utf8'));
  html += `<article class="card"><h2>${esc(r.name)}</h2><p class="meta">${esc(r.branch)} · ${esc(r.profile)}</p><p><a href="${r.id}-letter.pdf">PDF öffnen</a> · <a href="${r.id}-print.png">Druckansicht300dpi</a> · <a href="${r.id}-demo.html">Demo</a></p><a href="${r.id}-letter.pdf"><img src="${r.id}-print.jpg" alt="Vollständiger Testbrief für ${esc(r.name)}"></a><details><summary>Brieftext und verwendete Testfakten</summary><h3>${esc(text.subject)}</h3>${text.intro.map((t: string) => `<p>${esc(t.replaceAll('**', ''))}</p>`).join('')}<p>${esc(text.offer)}</p><p class="meta">Fiktive geprüfte Angaben: ${r.usedFacts.map((f: { text: string }) => esc(f.text)).join('; ')}.</p></details></article>`;
}
html += '</div></main></html>';
writeFileSync(`${out}/galerie.html`, html);
// Compare only the personal part. Identical statutory disclosures/scan instructions are intentionally not randomized.
const texts = rows.map((r) => {
  const t = JSON.parse(readFileSync(`${out}/${r.id}-text.json`, 'utf8'));
  let personal = [t.subject, ...t.intro.slice(0, -1)].join(' ').toLocaleLowerCase('de');
  for (const phrase of [r.name, ...r.usedFacts.map((f: { text: string }) => f.text), 'Fiktivstadt'])
    personal = personal.replaceAll(phrase.toLocaleLowerCase('de'), ' ');
  const words = personal
    .replace(/[^\p{L}]+/gu, ' ')
    .trim()
    .split(/\s+/);
  return { id: r.id, profile: r.profile, grams: new Set(words.slice(0, -2).map((_, i) => words.slice(i, i + 3).join(' '))) };
});
const similarities = [];
for (let i = 0; i < texts.length; i++)
  for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i]!,
      b = texts[j]!;
    const overlap = [...a.grams].filter((g) => b.grams.has(g)).length;
    similarities.push({
      a: a.id,
      b: b.id,
      jaccard: overlap / new Set([...a.grams, ...b.grams]).size,
      sameProfile: a.profile === b.profile,
    });
  }
writeFileSync(
  `${out}/similarity.json`,
  JSON.stringify(
    {
      scope:
        'Personal subject/opening/benefit paragraphs; names, exact facts and city removed; legal boilerplate/scan instructions excluded. Offline editorial fixtures, not actual model output. A lexical diagnostic, not evidence of human authorship or sales uplift.',
      profiles: new Set(rows.map((r) => r.profile)).size,
      comparisons: similarities.length,
      identicalAfterFactRemoval: similarities.filter((r) => r.jaccard === 1).length,
      maxSimilarity: Math.max(...similarities.map((r) => r.jaccard)),
      pairs: similarities,
    },
    null,
    2,
  ),
);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage({ viewport: { width: 2000, height: 950 } });
  const selected = ['01', '04', '11', '15', '19'];
  const sheet = `<!doctype html><html lang="de"><meta charset="utf-8"><style>${style}main{max-width:none}.comparison{grid-template-columns:repeat(5,1fr)}</style><main><h1>Fünf persönliche Einladungsbriefe · fiktive Testbetriebe</h1><p>Echte A4-Druckansichten · preislose Vorschau · Laptop/Smartphone und 41mm-QR · keine Versandfreigabe</p><div class="comparison">${selected
    .map((id) => {
      const r = rows.find((r) => r.id === id);
      return `<figure><figcaption>${esc(r.name)}</figcaption><img src="data:image/jpeg;base64,${readFileSync(`${out}/${id}-print.jpg`).toString('base64')}" alt="Testbrief"></figure>`;
    })
    .join('')}</div></main></html>`;
  await page.setContent(sheet);
  await page.screenshot({ path: `${docs}/fuenf-briefe.jpg`, type: 'jpeg', quality: 91, fullPage: true });
  for (const id of [...selected, '03', '12']) {
    writeFileSync(`${docs}/${id}-brief.jpg`, readFileSync(`${out}/${id}-print.jpg`));
    writeFileSync(`${docs}/${id}-brief.pdf`, readFileSync(`${out}/${id}-letter.pdf`));
  }
  const before = readFileSync('docs/task2-letters/evidence/copy-01-print.webp').toString('base64');
  await page.setContent(
    `<!doctype html><html lang="de"><meta charset="utf-8"><style>${style}.comparison{grid-template-columns:1fr 1fr}main{max-width:1500px}</style><main><h1>Vorher / nachher · derselbe fiktive Elektrobetrieb</h1><p>Links: bisheriger Task2-Brief mit Preisabsatz. Rechts: persönliche Vorschau-Einladung mit neuem Testtext. Beides echte PDF-Druckansichten; kein Nachweis einer besseren Scanquote.</p><div class="comparison"><figure><figcaption>Bisher</figcaption><img src="data:image/webp;base64,${before}" alt="Bisheriger Testbrief"></figure><figure><figcaption>Neue Einladung</figcaption><img src="data:image/jpeg;base64,${readFileSync(`${out}/01-print.jpg`).toString('base64')}" alt="Neuer Testbrief"></figure></div></main></html>`,
  );
  await page.screenshot({ path: `${docs}/vorher-nachher.jpg`, type: 'jpeg', quality: 90, fullPage: true });
  for (let first = 1; first <= 20; first += 5) {
    const ids = Array.from({ length: 5 }, (_, i) => String(first + i).padStart(2, '0'));
    await page.setContent(
      `<!doctype html><html><style>${style}.comparison{grid-template-columns:repeat(5,1fr)}main{max-width:none}</style><main><h1>Druckprüfung ${first}–${first + 4} · fiktive Offline-Testbriefe</h1><div class="comparison">${ids.map((id) => `<figure><figcaption>${esc(rows.find((r) => r.id === id).name)}</figcaption><img src="data:image/jpeg;base64,${readFileSync(`${out}/${id}-print.jpg`).toString('base64')}" alt="A4-Druckansicht"></figure>`).join('')}</div></main></html>`,
    );
    await page.screenshot({ path: `${docs}/druckgruppe-${first}.jpg`, type: 'jpeg', quality: 90, fullPage: true });
  }
} finally {
  await browser.close();
}
console.log('Galerie20Paare; fünf vollständige Druckansichten nebeneinander.');
