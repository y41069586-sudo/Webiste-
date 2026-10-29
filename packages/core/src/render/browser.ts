import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { getEnv } from '../config/env';
import { logger } from '../logger';

interface BrowserGlobal {
  __wbmBrowser?: Promise<Browser>;
}
const g = globalThis as unknown as BrowserGlobal;

/** Gemeinsamer Chromium-Prozess (PDFs, Screenshots, QA). */
export function getBrowser(): Promise<Browser> {
  if (!g.__wbmBrowser) {
    const executablePath = getEnv().CHROMIUM_EXECUTABLE_PATH;
    const pending = chromium
      .launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        // Absturzberichte nach /tmp: im schreibgeschützten Worker-Container sonst Start-Abbruch (crashpad)
        args: ['--disable-dev-shm-usage', '--font-render-hinting=none', '--crash-dumps-dir=/tmp/chromium-crashes'],
      })
      .then((b) => {
        b.on('disconnected', () => {
          // Closing an older process must not evict a newer renderer started meanwhile.
          if (g.__wbmBrowser === pending) g.__wbmBrowser = undefined;
        });
        return b;
      });
    g.__wbmBrowser = pending;
    pending.catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Chromium-Start fehlgeschlagen');
      if (g.__wbmBrowser === pending) g.__wbmBrowser = undefined;
    });
  }
  return g.__wbmBrowser;
}

export async function closeBrowser(): Promise<void> {
  if (g.__wbmBrowser) {
    const b = await g.__wbmBrowser.catch(() => null);
    g.__wbmBrowser = undefined;
    await b?.close().catch(() => undefined);
  }
}

/**
 * Seite in einem frischen Kontext öffnen. Externe Netzwerkzugriffe werden blockiert
 * (Templates sind eigenständig; verhindert Tracking/Leaks beim Rendern).
 */
export async function withPage<T>(
  opts: { width: number; height: number; deviceScaleFactor?: number; isMobile?: boolean; allowNetwork?: boolean },
  fn: (page: Page, ctx: BrowserContext) => Promise<T>,
): Promise<T> {
  const browser = await getBrowser();
  const ctx = await browser.newContext({
    viewport: { width: opts.width, height: opts.height },
    deviceScaleFactor: opts.deviceScaleFactor ?? 1,
    isMobile: opts.isMobile ?? false,
    hasTouch: opts.isMobile ?? false,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
    reducedMotion: 'reduce',
  });
  try {
    // Stalled screenshots must fail into the existing job retry/review path, not hang forever.
    ctx.setDefaultTimeout(45_000);
    ctx.setDefaultNavigationTimeout(45_000);
    if (!opts.allowNetwork) await ctx.route(/^https?:\/\//, (route) => route.abort());
    const page = await ctx.newPage();
    return await fn(page, ctx);
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
