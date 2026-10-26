import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { esc } from '../packages/templates/src/html';
import { TEMPLATES } from '../packages/templates/src';
const root = 'data/exports/vibe-upgrade';
const docs = 'docs/vibe-upgrade/evidence';
mkdirSync(docs, { recursive: true });
const style = `*{box-sizing:border-box}body{margin:0;background:#f4f3ef;color:#202824;font:16px/1.55 system-ui}main{max-width:1400px;margin:auto;padding:36px}h1{font-size:36px;line-height:1.15}h2{margin-top:40px}p{max-width:850px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.pair{display:grid;grid-template-columns:2fr 1fr;gap:12px}.card{background:white;padding:18px;border:1px solid #d4d9d5;border-radius:12px;overflow:hidden}img{width:100%;height:auto;display:block}a{color:#174c69}small{color:#59665e}.thumb{aspect-ratio:1.44;object-fit:cover;object-position:top}.mobile{aspect-ratio:.462;object-fit:cover;object-position:top}@media(max-width:850px){main{padding:20px}.grid{grid-template-columns:1fr}}`;
const groupNames = {
  handwerk: 'Handwerk',
  beauty: 'Beauty',
  gastronomie: 'Gastronomie',
  einzelhandel: 'Einzelhandel',
  kurse: 'Kurse & Training',
};
let html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SeitenWerk – Betriebscharakter</title><style>${style}</style><main><h1>Betriebscharakter statt Rotation.</h1><p>Lokale Prüfgalerie · fiktive Betriebe · DRY_RUN · keine Freigabe für Versand oder Veröffentlichung. Alle Bilder sind echte Browseraufnahmen. Klick auf das Bild öffnet die vollständige Ansicht. Die Demo-HTMLs sind offline lesbar; Kauf- und Kontaktrouten benötigen die lokale Test-App.</p><h2>Derselbe Betrieb, drei Gestaltungsrichtungen</h2><p>Gleiche Fakten und gleiche Fotobasis. Die Stilbeobachtungen sind fiktive Testvorgaben, keine tatsächlich untersuchten Geschäftsräume. Die reale Bildanalyse ist noch nicht am Anbieter abgenommen.</p><div class="grid">`;
for (const [id, title] of [
  ['warm', 'Warm & einladend'],
  ['refined', 'Ruhig & zurückhaltend'],
  ['urban', 'Urban & direkt'],
])
  html += `<article class="card"><h3>${title}</h3><a href="cafe-${id}.html">Demo öffnen</a><a href="cafe-${id}-1440.jpg"><img class="thumb" src="cafe-${id}-hero-1440.jpg" alt="Desktop: ${title}"></a><a href="cafe-${id}-390.jpg"><img class="mobile" src="cafe-${id}-hero-390.jpg" alt="Mobil: ${title}"></a></article>`;
html +=
  '</div><h2>Alle20 bestehenden Vorlagen</h2><p>Die Tabellen-/JSON-Ergebnisse prüfen Technik, nicht automatisch die gestalterische Freigabe. Jede reale Demo bleibt individuell zu prüfen. Fehlende Betriebsfotos werden nicht durch erfundene Projekte ersetzt.</p>';
for (const group of Object.keys(groupNames)) {
  html += `<h2>${groupNames[group]}</h2><div class="grid">`;
  for (const t of TEMPLATES.filter((t) => t.group === group)) {
    copyFileSync(`data/exports/task1-design/after/${t.id}-1440.jpg`, `${root}/${t.id}-before-1440.jpg`);
    html += `<article class="card"><h3>${esc(t.id)}</h3><p><a href="${t.id}.html">Demo</a> · <a href="${t.id}-before-1440.jpg">Vorher</a> · <a href="${t.id}-1440.jpg">Desktop komplett</a> · <a href="${t.id}-390.jpg">Mobil komplett</a></p><div class="pair"><a href="${t.id}-1440.jpg"><img class="thumb" src="${t.id}-hero-1440.jpg" alt="${esc(t.id)} Desktop"></a><a href="${t.id}-390.jpg"><img class="mobile" src="${t.id}-hero-390.jpg" alt="${esc(t.id)} Mobil"></a></div><small>Lange Namen: <a href="${t.id}-long-360.jpg">360px</a> · Ohne Foto: <a href="${t.id}-no-images-360.jpg">360px</a></small></article>`;
  }
  html += '</div>';
}
html += '</main></html>';
writeFileSync(`${root}/galerie.html`, html);
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  for (const group of Object.keys(groupNames)) {
    const ts = TEMPLATES.filter((t) => t.group === group);
    const cards = ts
      .map(
        (t) =>
          `<article class="card"><h3>${esc(t.id)}</h3><div class="pair"><img class="thumb" src="${t.id}-1440.jpg"><img class="mobile" src="${t.id}-hero-390.jpg"></div></article>`,
      )
      .join('');
    const p = `${root}/uebersicht-${group}.html`;
    writeFileSync(
      p,
      `<!doctype html><html lang="de"><meta charset="utf-8"><style>${style}.grid{grid-template-columns:repeat(2,1fr)}main{padding:24px}.card{padding:14px}.mobile{max-height:430px;object-fit:cover}.pair .thumb{aspect-ratio:auto;height:430px;object-fit:cover;object-position:top}.pair .mobile{height:430px;object-fit:cover;object-position:top}</style><main><h1>${groupNames[group]} · neue lokale Entwürfe</h1><p>Fiktive Testbetriebe · echte Desktop-/Mobil-Renderings · keine gestalterische Versandfreigabe</p><div class="grid">${cards}</div></main></html>`,
    );
    await page.setContent(
      readFileSync(p, 'utf8').replace(
        /src="([^"]+)"/g,
        (_, file) => `src="data:image/jpeg;base64,${readFileSync(`${root}/${file}`).toString('base64')}"`,
      ),
    );
    await page.screenshot({ path: `${docs}/${group}.jpg`, type: 'jpeg', quality: 87, fullPage: true });
  }
  await page.setContent(
    html.replace(
      /src="([^"]+)"/g,
      (_, file) => `src="data:image/jpeg;base64,${readFileSync(`${root}/${file}`).toString('base64')}"`,
    ),
  );
  await page.screenshot({ path: `${docs}/stilrichtungen.jpg`, type: 'jpeg', quality: 88 });
} finally {
  await browser.close();
}
