import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateLetterPdf } from '../packages/core/src/render/pdf';
import { getBrowser, closeBrowser } from '../packages/core/src/render/browser';
const root = 'data/exports/conversion-v4';
const rasterDir = mkdtempSync(join(tmpdir(), 'seitenwerk-v4-qr-'));
const result = [];
const browser = await getBrowser();
const page = await browser.newPage();
await page.route(/^https?:\/\//, (route) => route.abort());
await page.setContent('<!doctype html><html lang="de"><body></body></html>');
await page.addScriptTag({ path: new URL('../packages/templates/node_modules/jsqr/dist/jsQR.js', import.meta.url).pathname });
try {
  for (const file of readdirSync(root).filter((f) => f.endsWith('.pdf'))) {
    const group = /brief-(.*)-\d\.pdf/.exec(file)![1]!;
    const r = await validateLetterPdf(readFileSync(`${root}/${file}`), {
      recipientLines: [`An das Team von Beispielbetrieb ${group}`, 'Musterweg 2', '12345 Beispielstadt'],
      position: 'left',
      expectedPages: 1,
    });
    const raster = join(rasterDir, file);
    execFileSync('pdftoppm', ['-r', '150', '-png', '-singlefile', `${root}/${file}`, raster]);
    const uri = 'data:image/png;base64,' + readFileSync(`${raster}.png`).toString('base64');
    const decoded = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);
      const qr = (globalThis as unknown as { jsQR: (pixels: Uint8ClampedArray, w: number, h: number) => { data: string } | null })
        .jsQR;
      return qr(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? null;
    }, uri);
    if (decoded !== `https://example.test/t/fictional-${group}`) throw new Error(`PDF QR nicht decodierbar: ${file}`);
    if (r.issues.length || r.pages !== 1) throw new Error(`PDF-Layoutfehler: ${file} ${JSON.stringify(r.issues)}`);
    result.push({ file, ...r, rasterizedPdfQr: true });
  }
  writeFileSync(`${root}/pdf-layout-checks.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify(
      result.map((r) => ({ file: r.file, pages: r.pages, issues: r.issues, pdfQr: r.rasterizedPdfQr })),
      null,
      2,
    ),
  );
} finally {
  await page.close();
  await closeBrowser();
  rmSync(rasterDir, { recursive: true, force: true });
}
