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
    g.__wbmBrowser = chromium
      .launch({
        headless: true,
        ...(executablePath ? { executablePath } : {}),
        args: ['--disable-dev-shm-usage', '--font-render-hinting=none'],
      })
      .then((b) => {
        b.on('disconnected', () => {
          g.__wbmBrowser = undefined;
        });
        return b;
      });
    g.__wbmBrowser.catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Chromium-Start fehlgeschlagen');
      g.__wbmBrowser = undefined;
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
  if (!opts.allowNetwork) {
    await ctx.route(/^https?:\/\//, (route) => route.abort());
  }
  const page = await ctx.newPage();
  try {
    return await fn(page, ctx);
  } finally {
    await ctx.close().catch(() => undefined);
  }
}
