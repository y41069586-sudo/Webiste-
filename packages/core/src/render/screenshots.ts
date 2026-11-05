import type { Page } from 'playwright';
import { withPage } from './browser';

export interface Screenshots {
  desktop: Buffer;
  mobile: Buffer;
  /** Full-page overview plus readable top/middle/end samples of the SAME stored HTML. */
  reviewBoards?: { desktop: Buffer; mobile: Buffer };
}

async function reviewBoard(page: Page, mobile: boolean): Promise<Buffer> {
  // The separate question to SeitenWerk is sales chrome, not the authored business design.
  // Capture-only: the stored HTML and the operator/letter screenshots remain untouched.
  await page.addStyleTag({ content: '.sw-demo-context,.sw-demo-toolbar,#uebernehmen,#frage{display:none!important}' });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  if (height > 18000) throw new Error('Entwurf länger als 18000 px; Sichtprüfung begrenzen und Gestaltung manuell prüfen.');
  const full = await page.screenshot({ type: 'jpeg', quality: 82, fullPage: true });
  // Use the captured page as pixels, never render model HTML in the board document.
  const data = await page.evaluate(
    async ({ src, mobile }) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = mobile ? 1400 : 1040;
      canvas.height = mobile ? 930 : 1440;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#111';
      ctx.font = '18px sans-serif';
      ctx.fillText('GESAMTSEITE', 12, 25);
      const overviewScale = Math.min(200 / img.width, (canvas.height - 60) / img.height);
      ctx.drawImage(img, 12, 45, img.width * overviewScale, img.height * overviewScale);
      const sourceHeight = Math.min(img.height, img.width * (mobile ? 844 / 390 : 900 / 1440));
      const offsets = [0, (img.height - sourceHeight) / 2, img.height - sourceHeight];
      offsets.forEach((offset, index) => {
        const width = mobile ? 380 : 800;
        const x = mobile ? 230 + index * 390 : 230;
        const y = mobile ? 45 : 45 + index * 460;
        const targetHeight = mobile ? 822 : 430;
        ctx.fillStyle = '#111';
        ctx.fillText(['ANFANG', 'MITTE', 'ENDE'][index]!, x, y - 12);
        // Preserve image proportions inside each detail frame.
        const scale = Math.min(width / img.width, targetHeight / sourceHeight);
        ctx.drawImage(img, 0, offset, img.width, sourceHeight, x, y, img.width * scale, sourceHeight * scale);
      });
      return canvas.toDataURL('image/jpeg', 0.82).split(',')[1]!;
    },
    { src: `data:image/jpeg;base64,${full.toString('base64')}`, mobile },
  );
  return Buffer.from(data, 'base64');
}

/** Wartet, bis alle Bilder dekodiert sind – sonst fehlen eingebettete Fotos im Screenshot. */
export async function imagesPainted(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      [...document.images].map((i) => {
        // Capture-only: lazy images outside the viewport must load before PDF/screenshots.
        i.loading = 'eager';
        return i.decode().catch(() => undefined);
      }),
    ),
  );
}

/** Screenshots ohne Banner (Screenshot-Modus): Desktop 1440×900, Mobil 390×844 (2×). */
export async function takeScreenshots(
  html: string,
  opts: { hideDemoChrome?: boolean; studioReview?: boolean } = {},
): Promise<Screenshots> {
  const boards: Partial<{ desktop: Buffer; mobile: Buffer }> = {};
  const desktop = await withPage({ width: 1440, height: 900, deviceScaleFactor: 2 }, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    if (opts.hideDemoChrome)
      await page.addStyleTag({
        content: '.sw-demo-context,.sw-demo-toolbar,#uebernehmen{display:none!important}body{padding-bottom:0!important}',
      });
    await imagesPainted(page);
    await page.evaluate(() => document.fonts.ready);
    const shot = await page.screenshot({ type: 'jpeg', quality: 88, fullPage: false });
    if (opts.studioReview) boards.desktop = await reviewBoard(page, false);
    return shot;
  });
  const mobile = await withPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    if (opts.hideDemoChrome)
      await page.addStyleTag({
        content: '.sw-demo-context,.sw-demo-toolbar,#uebernehmen{display:none!important}body{padding-bottom:0!important}',
      });
    await imagesPainted(page);
    await page.evaluate(() => document.fonts.ready);
    const shot = await page.screenshot({ type: 'jpeg', quality: 88, fullPage: false });
    if (opts.studioReview) boards.mobile = await reviewBoard(page, true);
    return shot;
  });
  return {
    desktop,
    mobile,
    ...(boards.desktop && boards.mobile ? { reviewBoards: { desktop: boards.desktop, mobile: boards.mobile } } : {}),
  };
}

/**
 * Komposit für den Brief: Laptop und Handy nebeneinander. Eigene, mit CSS gezeichnete
 * Geräterahmen (keine fremden Mockup-Grafiken).
 */
export type DeviceComposition = 'minimal' | 'editorial' | 'studio';
export interface DeviceOptions {
  variant?: DeviceComposition;
  businessName?: string;
  printWidthMm?: number;
}
/** Conservative geometry guard. It does not certify human readability. */
export function devicePresentation(opts: DeviceOptions = {}) {
  const clear = ((((opts.printWidthMm ?? 165) * 72) / 25.4) * 42) / 1800 < 7 || !opts.businessName?.trim();
  return {
    mode: clear ? 'clear' : (opts.variant ?? 'minimal'),
    reason: clear ? 'Kleine Druckfläche oder fehlende Namensbeschriftung: klare Ansichten statt Geräteperspektive.' : null,
  };
}
export function compositeHtml(desktopJpeg: Buffer, mobileJpeg: Buffer, opts: DeviceOptions = {}): string {
  const d = `data:image/jpeg;base64,${desktopJpeg.toString('base64')}`;
  const m = `data:image/jpeg;base64,${mobileJpeg.toString('base64')}`;
  const escape = (v: string) =>
    v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const state = devicePresentation(opts);
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
html,body{margin:0;background:white;font-family:Arial,sans-serif}.stage{position:relative;width:1800px;height:1120px;overflow:hidden;background:#fafaf9}.caption{position:absolute;top:22px;left:65px;font-size:42px;font-weight:600;color:#202b38;max-width:1670px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.laptop{position:absolute;left:50px;top:150px;width:1370px}.lid{position:relative;background:#20252b;border:3px solid #5a6068;border-radius:24px 24px 8px 8px;padding:25px 25px 20px;box-shadow:0 24px 36px #17212e20}.lid img{display:block;width:100%;aspect-ratio:16/10;height:auto;object-fit:contain;background:#fff}.cam{position:absolute;top:8px;left:50%;width:7px;height:7px;border-radius:50%;background:#68737f}.base{height:22px;margin:0 -32px;background:linear-gradient(#e9eaec,#929aa3);border-radius:0 0 24px 24px}.notch{width:180px;height:8px;margin:auto;background:#77828c;border-radius:0 0 12px 12px}
.phone{position:absolute;right:100px;top:325px;width:300px;background:#171b20;border:3px solid #69717b;border-radius:46px;padding:20px 10px 12px;box-shadow:0 24px 36px #17212e25}.phone img{display:block;width:100%;aspect-ratio:390/844;height:auto;object-fit:contain;border-radius:30px;background:white}.speaker{position:absolute;top:7px;left:44%;width:42px;height:5px;background:#56606a;border-radius:6px}.editorial .laptop{left:45px;width:1450px}.editorial .phone{right:90px;top:330px}.studio{background:linear-gradient(140deg,#e8edf0,#f9fafb)}.studio .laptop{left:100px;top:155px;transform:perspective(3600px) rotateY(4deg)}.studio .phone{right:90px;top:320px;transform:rotate(2deg)}.clear .laptop{left:50px;top:120px;width:1530px}.clear .lid{background:#fff;padding:0;border:2px solid #bcc4ce;box-shadow:none;border-radius:0}.clear .base,.clear .cam,.clear .speaker{display:none}.clear .phone{border:2px solid #bcc4ce;background:white;padding:0;box-shadow:none;border-radius:0}.clear .phone img{border-radius:0}
</style></head><body><div class="stage ${state.mode}" data-presentation="${state.mode}"><div class="caption">${escape(opts.businessName ?? 'Desktop- und Smartphone-Ansicht')}</div><div class="laptop"><div class="lid"><span class="cam"></span><img src="${d}" alt="Tatsächlicher Desktop-Entwurf"></div><div class="base"><div class="notch"></div></div></div><div class="phone"><img src="${m}" alt="Derselbe Entwurf auf dem Smartphone"><span class="speaker"></span></div></div></body></html>`;
}
export async function renderComposite(desktopJpeg: Buffer, mobileJpeg: Buffer, opts: DeviceOptions = {}): Promise<Buffer> {
  return withPage({ width: 1800, height: 1120 }, async (page) => {
    await page.setContent(compositeHtml(desktopJpeg, mobileJpeg, opts), { waitUntil: 'load' });
    await imagesPainted(page);
    return page.screenshot({ type: 'jpeg', quality: 95, fullPage: false });
  });
}
