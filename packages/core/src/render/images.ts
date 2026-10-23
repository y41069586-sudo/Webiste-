import { withPage } from './browser';

/**
 * Bild verkleinern und neu kodieren (entfernt dabei Metadaten wie GPS-Daten aus EXIF).
 * Läuft im Browser (Canvas) – keine native Bildbibliothek nötig. Skript als String,
 * damit der Transpiler keine Hilfsfunktionen einfügt, die im Browser fehlen.
 */
export async function optimizeImage(
  data: Buffer,
  mime: string,
  opts: { maxWidth: number; format: 'jpeg' | 'png'; quality?: number },
): Promise<Buffer> {
  const args = JSON.stringify({
    src: `data:${mime};base64,${data.toString('base64')}`,
    maxW: opts.maxWidth,
    format: opts.format,
    quality: opts.quality ?? 0.82,
  });
  const script = `(async () => {
    const a = ${args};
    const img = new Image();
    img.src = a.src;
    await img.decode();
    const scale = Math.min(1, a.maxW / img.naturalWidth);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * scale));
    c.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = c.getContext('2d');
    if (a.format === 'jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(a.format === 'jpeg' ? 'image/jpeg' : 'image/png', a.quality);
  })()`;
  return withPage({ width: 400, height: 300 }, async (page) => {
    await page.setContent('<!DOCTYPE html><html><body></body></html>');
    const out = (await page.evaluate(script)) as string;
    return Buffer.from(out.slice(out.indexOf(',') + 1), 'base64');
  });
}
