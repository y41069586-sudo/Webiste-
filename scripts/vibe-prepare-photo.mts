import { readFileSync, writeFileSync } from 'node:fs';
import { optimizeImage } from '../packages/core/src/render/images';
import { closeBrowser } from '../packages/core/src/render/browser';
try {
  const data = await optimizeImage(
    readFileSync(
      process.argv[2] ??
        (() => {
          throw Error('Aufruf: tsx scripts/vibe-prepare-photo.mts /pfad/zum/geprüften/Burst-Foto.jpg');
        })(),
    ),
    'image/jpeg',
    { maxWidth: 1200, format: 'jpeg', quality: 0.8 },
  );
  // JPEG COM preserves source/license locally alongside the manifest; not an invented EXIF ownership field.
  const note = Buffer.from(
    'CC0 1.0 | Kyle Topping / Burst | https://www.shopify.com/stock-photos/photos/beard-oil-and-balm | source checked 2026-10-26',
    'utf8',
  );
  const size = Buffer.alloc(2);
  size.writeUInt16BE(note.length + 2);
  writeFileSync(
    'packages/templates/assets/images/beauty/barber-werkzeug.jpg',
    Buffer.concat([data.subarray(0, 2), Buffer.from([255, 254]), size, note, data.subarray(2)]),
  );
  console.log(data.length);
} finally {
  await closeBrowser();
}
