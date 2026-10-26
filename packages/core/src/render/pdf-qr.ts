import jsQR from 'jsqr';

interface PdfImage {
  width: number;
  height: number;
  kind: number;
  data?: Uint8Array;
}
/** Decode the QR image actually embedded on PDF page one, not the pre-PDF source PNG. */
export async function pdfQrTargets(pdf: Buffer): Promise<string[]> {
  const { getDocument, OPS, ImageKind } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await getDocument({ data: new Uint8Array(pdf), disableFontFace: true, useSystemFonts: false }).promise;
  try {
    const page = await doc.getPage(1);
    const operators = await page.getOperatorList();
    const targets = new Set<string>();
    for (let i = 0; i < operators.fnArray.length; i++) {
      if (operators.fnArray[i] !== OPS.paintImageXObject) continue;
      const id = operators.argsArray[i][0] as string;
      const image = await new Promise<PdfImage>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('PDF-Bildprüfung überschreitet das Zeitlimit')), 5000);
        (id.startsWith('g_') ? page.commonObjs : page.objs).get(id, (value: PdfImage) => {
          clearTimeout(timer);
          resolve(value);
        });
      });
      const { width, height, data, kind } = image;
      // QR images are square. Avoid allocating a full RGBA copy of the large website screenshot.
      if (!data || width !== height || width < 100 || width > 2000) continue;
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let p = 0; p < width * height; p++) {
        const out = p * 4;
        if (kind === ImageKind.RGB_24BPP) {
          pixels[out] = data[p * 3]!;
          pixels[out + 1] = data[p * 3 + 1]!;
          pixels[out + 2] = data[p * 3 + 2]!;
        } else if (kind === ImageKind.RGBA_32BPP) {
          pixels[out] = data[out]!;
          pixels[out + 1] = data[out + 1]!;
          pixels[out + 2] = data[out + 2]!;
        } else if (kind === ImageKind.GRAYSCALE_1BPP) {
          const y = Math.floor(p / width),
            x = p % width;
          const white = (data[y * Math.ceil(width / 8) + Math.floor(x / 8)]! & (128 >> (x % 8))) !== 0;
          pixels[out] = pixels[out + 1] = pixels[out + 2] = white ? 255 : 0;
        } else continue;
        pixels[out + 3] = 255;
      }
      const decoded = jsQR(pixels, width, height);
      if (decoded) targets.add(decoded.data);
    }
    return [...targets];
  } finally {
    await doc.destroy();
  }
}
