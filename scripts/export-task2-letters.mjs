/** Package actual local PDFs/screenshots; no AI mock screens, hosting or network. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const sharp = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url))('sharp');
const root = 'data/exports/task2-letters';
const refined = process.argv.includes('--refined');
const currentPhase = refined ? 'refined' : 'after';
const baselinePhase = refined ? 'after' : 'before';
const out = root + (refined ? '/galerie-refined' : '/galerie');
const rows = JSON.parse(await fs.readFile(`${root}/${currentPhase}/checks.json`, 'utf8'));
if (
  rows.length !== 20 ||
  rows.some((r) => r.issues.length || !r.truth || !r.qrRaster || !r.targets || !r.mobile || !r.price || !r.date || !r.privacy)
)
  throw new Error('20 vollständig bestandene Prüfpaare fehlen; Export gesperrt.');
await fs.mkdir(out, { recursive: true });
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
for (const row of rows) {
  const id = row.id;
  for (const phase of ['before', 'after']) {
    const source = phase === 'after' ? currentPhase : baselinePhase;
    await fs.copyFile(`${root}/${source}/${id}.pdf`, `${out}/${id}-${phase}.pdf`);
    await fs.copyFile(`${root}/${source}/${id}-print.webp`, `${out}/${id}-${phase}-print.webp`);
    await fs.copyFile(`${root}/${source}/${id}-text.json`, `${out}/${id}-${phase}-text.json`);
  }
  for (const label of ['desktop', 'mobile', 'devices'])
    await fs.copyFile(`${root}/fixtures/${id}-${label}.jpg`, `${out}/${id}-${label}.jpg`);
  await fs.copyFile(`${root}/fixtures/${id}.html`, `${out}/${id}-demo.html`);
  await sharp(`${root}/${currentPhase}/${id}-mobile.jpg`).webp({ quality: 88 }).toFile(`${out}/${id}-mobile-full.webp`);
}
for (const phase of ['before', 'after']) {
  const layers = [];
  for (const [i, r] of rows.entries())
    layers.push({
      input: await sharp(`${out}/${r.id}-${phase}-print.webp`)
        .resize(380, 537, { fit: 'contain', background: '#fff' })
        .toBuffer(),
      left: (i % 4) * 380,
      top: Math.floor(i / 4) * 537,
    });
  await sharp({ create: { width: 1520, height: 2685, channels: 3, background: '#e9edf2' } })
    .composite(layers)
    .webp({ quality: 90 })
    .toFile(`${out}/${phase}-alle20.webp`);
}
const five = [rows[1], rows[5], rows[6], rows[11], rows[12]];
await sharp({ create: { width: 2500, height: 707, channels: 3, background: '#fff' } })
  .composite(
    await Promise.all(
      five.map(async (r, i) => ({
        input: await sharp(`${out}/${r.id}-after-print.webp`).resize(500, 707).toBuffer(),
        left: i * 500,
        top: 0,
      })),
    ),
  )
  .webp({ quality: 92 })
  .toFile(`${out}/fuenf-branchen.webp`);
await fs.copyFile(`${root}/${currentPhase}/checks.json`, out + '/checks.json');
await fs.copyFile(`${root}/${baselinePhase}/checks.json`, out + '/before-checks.json');
const matrix = rows
  .map(
    (r) =>
      `<tr><td>${esc(r.id)} · ${esc(r.business)}<br>${esc(r.template)}</td><td>${esc(r.details.join(' · '))}</td><td>1 Seite · Ränder/Adressfenster geprüft · 41mm QR</td><td>QR aus PDF + Graustufenraster dekodiert; Kurz-URL/QR gleiche lokale Demo</td><td>Datum/597/19/99/Art.14/21 geprüft · Mobil390px ohne Überlauf</td><td>Interne Sichtprüfung; keine Betreiber-/Versandfreigabe</td></tr>`,
  )
  .join('');
await fs.writeFile(
  out + '/pruefmatrix.html',
  `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>20 Brief-Demo-Paare · Prüfmatrix</title><style>body{font:16px/1.5 Arial;margin:24px}td,th{border:1px solid #bbc6d1;padding:12px;vertical-align:top;text-align:left}table{border-collapse:collapse;min-width:1000px}.scroll{overflow:auto}</style><h1>20 fiktive Erstbrief-Demo-Paare</h1><p>Nur lokale Tests. Keine echte Recherche, Postzustellung, Kundenreaktion oder rechtliche Freigabe.</p><a href="index.html">Galerie</a><div class="scroll"><table><tr><th>Paar</th><th>Fiktive geprüfte Detailangaben</th><th>Druck</th><th>Zuordnung</th><th>Konsistenz</th><th>Sichtprüfung</th></tr>${matrix}</table></div></html>`,
);
await fs.writeFile(
  out + '/index.html',
  `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SeitenWerk · Aufgabe 2 · Briefe</title><style>body{font:16px/1.6 Arial;color:#182535;background:#eef2f6;margin:auto;padding:24px;max-width:1400px}h1{line-height:1.15}article{background:white;border-radius:12px;padding:24px;margin:28px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}img{max-width:100%;height:auto}a{color:#174fa9}.note{border-left:4px solid #174fa9;padding:12px 18px;background:white}</style><h1>Aufgabe 2 · Der persönliche Brief</h1>${refined ? '<p class="note">Neu: optimierte Fassung des Betreiberentwurfs. Vergleich mit der unmittelbar vorherigen Briefversion.</p>' : ''}<p>20 ausdrücklich fiktive Testbetriebe. Tatsächliche A4-PDFs und Druckraster, echte Rendereraufnahmen auf Laptop und Smartphone. Kein veröffentlichtes Angebot.</p><p class="note">PDFs/HTML enthalten Testabsender und lokale QR-Ziele. Diese funktionieren nur während des Testservers und dürfen nicht verschickt werden. Betriebliches Freigabe-, Datenschutz- und Rechtstextreview bleiben erforderlich.</p><p><a href="pruefmatrix.html">Prüfmatrix aller20</a> · <a href="after-alle20.webp">Alle20 nachher</a> · <a href="before-alle20.webp">Alle20 vorher</a> · <a href="fuenf-branchen.webp">Fünf Branchen nebeneinander</a></p>${rows.map((r) => `<article id="paar-${r.id}"><h2>${esc(r.id)} · ${esc(r.business)}</h2><p>${esc(r.branch)} · ${esc(r.template)} · fiktive bestätigte Angaben: ${esc(r.details.join('; '))}</p><div class="grid">${['before', 'after'].map((phase) => `<div><h3>${phase === 'before' ? 'Vorher' : 'Nachher'}</h3><a href="${r.id}-${phase}.pdf">A4-PDF öffnen</a> · <a href="${r.id}-${phase}-print.webp">Druckansicht groß</a><a href="${r.id}-${phase}-print.webp"><img loading="lazy" src="${r.id}-${phase}-print.webp" alt="${esc(r.business)} – ${phase === 'before' ? 'alter' : 'neuer'} Brief"></a></div>`).join('')}</div><p><a href="${r.id}-devices.jpg">Echte Laptop-/Handy-Komposition</a> · <a href="${r.id}-desktop.jpg">Desktop-Display</a> · <a href="${r.id}-mobile-full.webp">Vollständige Smartphone-Demo</a> · <a href="${r.id}-demo.html">Zugehörige HTML-Demo</a></p></article>`).join('')}</html>`,
);
console.log('Exported', rows.length, 'verified fictional pairs to', path.resolve(out));
