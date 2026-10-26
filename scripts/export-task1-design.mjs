import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const sharp = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url))('sharp');
const root = 'data/exports/task1-design';
const rows = JSON.parse(await fs.readFile(root + '/after/checks.json', 'utf8'));
const out = root + '/galerie';
await fs.mkdir(out, { recursive: true });
const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
for (const phase of ['before', 'after']) {
  const desktop = [],
    mobile = [];
  for (const [i, row] of rows.entries()) {
    for (const width of phase === 'before' ? [1440, 390] : [1440, 360, 390, 430])
      await sharp(`${root}/${phase}/${row.template}-${width}.jpg`)
        .webp({ quality: 88 })
        .toFile(`${out}/${row.template}-${phase}-${width}.webp`);
    if (phase === 'after') {
      await sharp(`${root}/${phase}/${row.template}-long-360.jpg`)
        .webp({ quality: 86 })
        .toFile(`${out}/${row.template}-long-360.webp`);
      await sharp(`${root}/${phase}/${row.template}-no-images-390.jpg`)
        .webp({ quality: 86 })
        .toFile(`${out}/${row.template}-no-images-390.webp`);
      await fs.copyFile(`${root}/${phase}/${row.template}.html`, `${out}/${row.template}.html`);
    }
    for (const [width, list, w, h] of [
      [1440, desktop, 420, 262],
      [390, mobile, 195, 422],
    ]) {
      const src = sharp(`${root}/${phase}/${row.template}-${width}.jpg`);
      const m = await src.metadata();
      list.push({
        input: await src
          .extract({ left: 0, top: 0, width, height: Math.min(m.height, width === 1440 ? 900 : 844) })
          .resize(w, h, { fit: 'contain' })
          .toBuffer(),
        left: (i % 5) * w,
        top: Math.floor(i / 5) * h,
      });
    }
  }
  for (const [name, layers, w, h] of [
    ['desktop', desktop, 420, 262],
    ['mobil', mobile, 195, 422],
  ])
    await sharp({ create: { width: w * 5, height: h * 4, channels: 3, background: '#fff' } })
      .composite(layers)
      .webp({ quality: 90 })
      .toFile(`${out}/${phase}-${name}-uebersicht.webp`);
}
await fs.copyFile(root + '/after/checks.json', out + '/checks.json');
await fs.writeFile(
  out + '/index.html',
  `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>SeitenWerk – Aufgabe 1</title><style>body{font:16px/1.6 Arial;background:#f4f5f7;color:#18202c;max-width:1440px;margin:auto;padding:24px}h1{line-height:1.1}article{background:white;padding:24px;border-radius:12px;margin:28px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}img{max-width:100%;height:auto}a{color:#174cb8}.sample{font-size:14px;color:#53606f}</style><h1>Aufgabe 1 · Kunden-Demos</h1><p>20 ausdrücklich fiktive Testbetriebe. Lokale Renderings, keine veröffentlichten Kunden-Websites. Bilder mit Beispielkennzeichnung. Keine gestalterische oder Versandfreigabe durch automatische Tests.</p><p><a href="before-desktop-uebersicht.webp">Vorher Desktop</a> · <a href="after-desktop-uebersicht.webp">Nachher Desktop</a> · <a href="after-mobil-uebersicht.webp">Nachher Mobil</a></p>${rows
    .map(
      (r) =>
        `<article id="${r.template}"><h2>${escape(r.name)} · ${escape(r.label)}</h2><p class="sample">${r.template} · ${escape(r.city)} · fiktiver Betrieb</p><div class="grid">${[
          ['before', 1440],
          ['after', 1440],
          ['before', 390],
          ['after', 390],
        ]
          .map(
            ([phase, w]) =>
              `<div><p>${phase === 'before' ? 'Vorher' : 'Nachher'} ${w}px</p><a href="${r.template}-${phase}-${w}.webp"><img loading="lazy" src="${r.template}-${phase}-${w}.webp" alt="${escape(r.name)} ${phase} ${w}px"></a></div>`,
          )
          .join(
            '',
          )}</div><p><a href="${r.template}.html">Vollständige lokale Demo</a> · <a href="${r.template}-after-360.webp">360px</a> · <a href="${r.template}-after-430.webp">430px</a> · <a href="${r.template}-long-360.webp">Lange Namen</a> · <a href="${r.template}-no-images-390.webp">Ohne Bilder</a></p></article>`,
    )
    .join('')}</html>`,
);
