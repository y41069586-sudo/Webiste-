import type { Browser } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

/** Real local production responses, Chromium mobile emulation; no score or real-world CWV claim. */
export async function measureTrustPages(browser: Browser, base: string, routes: { label: string; url: string }[], out: string) {
  const results = [];
  for (const route of routes) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    try {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 93750,
        connectionType: 'cellular4g',
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.addInitScript(() => {
        const marks = { lcp: 0, cls: 0 };
        Object.assign(window, { __trustMetrics: marks });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) marks.lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[])
            if (!entry.hadRecentInput) marks.cls += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
      });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const response = await page.goto(new URL(route.url, base).href, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      const metrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return {
          ...(window as unknown as { __trustMetrics: { lcp: number; cls: number } }).__trustMetrics,
          ttfb: nav.responseStart,
          domContentLoaded: nav.domContentLoadedEventEnd,
          load: nav.loadEventEnd,
          bytes: nav.transferSize,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
          brokenImages: Array.from(document.images).filter((i) => {
            const r = i.getBoundingClientRect();
            const inView = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
            return (i.complete || inView) && !i.naturalWidth;
          }).length,
          pendingLazyImages: Array.from(document.images).filter((i) => !i.complete && i.loading === 'lazy').length,
        };
      });
      await page.screenshot({ path: path.join(out, `performance-${route.label}.jpg`), type: 'jpeg', quality: 85 });
      results.push({ label: route.label, status: response?.status(), ...metrics, errors });
    } finally {
      await context.close();
    }
  }
  writeFileSync(
    path.join(out, 'mobile-performance.json'),
    JSON.stringify(
      {
        scope: 'local production build, synthetic single cold run; not field CWV or Stripe-hosted performance',
        profile: { width: 390, rttMs: 150, downloadBytesPerSecond: 200000, cpuSlowdown: 4 },
        results,
      },
      null,
      2,
    ),
  );
  return results;
}
