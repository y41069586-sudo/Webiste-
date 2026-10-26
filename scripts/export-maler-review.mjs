/** Export actual rendered local review evidence. Run from repository root after PDF rasterization. */
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
const sharp = createRequire(new URL('../apps/web/node_modules/next/package.json', import.meta.url))('sharp');
const src = 'data/exports/maler-design-review',
  dst = 'docs/design-review/evidence';
await fs.mkdir(dst, { recursive: true });
const ids = ['handwerk-klar', 'handwerk-solid', 'handwerk-werkstatt'];
const heroLayers = [];
const grayLayers = [];
for (const [i, id] of ids.entries()) {
  for (const [name, file] of [
    ['desktop', `${id}-after-1440.png`],
    ['mobile', `${id}-after-390.png`],
    ['mobile-360', `${id}-after-360.png`],
    ['mobile-430', `${id}-after-430.png`],
    ['vorher-desktop', `${id}-before-1440.png`],
    ['vorher-mobile', `${id}-before-390.png`],
    ['druck', `${id}-druck.png`],
    ['angebot', `${id}-offer.png`],
  ])
    await sharp(`${src}/${file}`).webp({ quality: 86 }).toFile(`${dst}/${id}-${name}.webp`);
  await fs.copyFile(`${src}/${id}-hero.jpg`, `${dst}/${id}-hero.jpg`);
  await fs.copyFile(`${src}/${id}.html`, `${dst}/${id}.html`);
  await fs.copyFile(`${src}/${id}-brief.pdf`, `${dst}/${id}-brief.pdf`);
  heroLayers.push({
    input: await sharp(`${src}/${id}-hero.jpg`).resize(600, 390, { fit: 'contain', background: '#fff' }).toBuffer(),
    left: i * 600,
    top: 0,
  });
  grayLayers.push({
    input: await sharp(`${src}/${id}-grayscale.png`).resize(600, 390, { fit: 'contain', background: '#fff' }).toBuffer(),
    left: i * 600,
    top: 0,
  });
}
for (const [name, layers] of [
  ['konzepte', heroLayers],
  ['graustufen', grayLayers],
])
  await sharp({ create: { width: 1800, height: 390, channels: 3, background: '#fff' } })
    .composite(layers)
    .webp({ quality: 88 })
    .toFile(`${dst}/${name}.webp`);
await fs.copyFile(src + '/checks.json', dst + '/checks.json');
