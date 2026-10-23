import { withPage } from './browser';

export interface Screenshots {
  desktop: Buffer;
  mobile: Buffer;
}

/** Screenshots ohne Banner (Screenshot-Modus): Desktop 1440×900, Mobil 390×844 (2×). */
export async function takeScreenshots(html: string): Promise<Screenshots> {
  const desktop = await withPage({ width: 1440, height: 900 }, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    return page.screenshot({ type: 'jpeg', quality: 88, fullPage: false });
  });
  const mobile = await withPage({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true }, async (page) => {
    await page.setContent(html, { waitUntil: 'load' });
    return page.screenshot({ type: 'jpeg', quality: 88, fullPage: false });
  });
  return { desktop, mobile };
}

/**
 * Komposit für den Brief: Laptop und Handy nebeneinander. Eigene, mit CSS gezeichnete
 * Geräterahmen (keine fremden Mockup-Grafiken).
 */
export function compositeHtml(desktopJpeg: Buffer, mobileJpeg: Buffer): string {
  const d = `data:image/jpeg;base64,${desktopJpeg.toString('base64')}`;
  const m = `data:image/jpeg;base64,${mobileJpeg.toString('base64')}`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#fff}
  .stage{position:relative;width:1800px;height:1080px}
  .laptop{position:absolute;left:40px;top:40px;width:1440px}
  .lid{background:#1f2328;border-radius:28px 28px 0 0;padding:34px 34px 40px;box-shadow:0 30px 60px rgba(0,0,0,.18)}
  .lid img{display:block;width:100%;border-radius:4px}
  .cam{position:absolute;left:50%;top:14px;width:10px;height:10px;margin-left:-5px;border-radius:50%;background:#3b4048}
  .base{height:34px;margin:0 -70px;background:linear-gradient(#d9dde2,#aeb4bb);border-radius:0 0 26px 26px}
  .notch{width:220px;height:12px;margin:0 auto;background:#9aa1a9;border-radius:0 0 12px 12px}
  .phone{position:absolute;right:40px;bottom:30px;width:420px;background:#111418;border-radius:64px;padding:34px 22px 22px;box-shadow:0 30px 60px rgba(0,0,0,.28)}
  .phone img{display:block;width:100%;border-radius:44px}
  .speaker{position:absolute;left:50%;top:13px;width:70px;height:9px;margin-left:-35px;border-radius:6px;background:#2a2f36}
</style></head><body><div class="stage">
  <div class="laptop"><div class="lid"><span class="cam"></span><img src="${d}" alt=""></div><div class="base"><div class="notch"></div></div></div>
  <div class="phone"><img src="${m}" alt=""><span class="speaker"></span></div>
</div></body></html>`;
}

export async function renderComposite(desktopJpeg: Buffer, mobileJpeg: Buffer): Promise<Buffer> {
  return withPage({ width: 1800, height: 1080 }, async (page) => {
    await page.setContent(compositeHtml(desktopJpeg, mobileJpeg), { waitUntil: 'load' });
    return page.screenshot({ type: 'jpeg', quality: 86, fullPage: false });
  });
}
