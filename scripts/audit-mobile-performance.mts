declare global {
  interface Window {
    __qa: { lcp: number; cls: number; longTasks: number };
  }
}
import { chromium } from '../packages/core/node_modules/playwright/index.mjs';
import { writeFile, mkdir } from 'node:fs/promises';
import pg from '../packages/core/node_modules/pg/lib/index.js';
const base = process.env.AUDIT_BASE_URL ?? 'http://localhost:3216';
const target = new URL(process.env.E2E_DATABASE_URL!);
if (
  !['localhost', '127.0.0.1'].includes(target.hostname) ||
  !/test|e2e/.test(target.pathname) ||
  !['localhost', '127.0.0.1'].includes(new URL(base).hostname)
)
  throw Error('Nur lokale Testziele erlaubt');
const db = new pg.Client({ connectionString: target.toString() });
await db.connect();
const rows = await db.query("SELECT slug FROM demos WHERE status='published' ORDER BY created_at DESC LIMIT 1");
await db.end();
if (!rows.rows[0]) throw Error('Keine lokale Testdemo');
const slug = rows.rows[0].slug;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true });
const results = [];
try {
  for (const [name, path] of [
    ['marketing', '/'],
    ['demo', '/d/' + slug],
    ['checkout', '/d/' + slug + '/uebernehmen?plan=basis'],
  ] as const) {
    for (let run = 1; run <= 3; run++) {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
      });
      const page = await ctx.newPage();
      await page.route('**/*', (r) => (new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()));
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: 200000,
        uploadThroughput: 93750,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.addInitScript(() => {
        window.__qa = { lcp: 0, cls: 0, longTasks: 0 };
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__qa.lcp = e.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries() as (PerformanceEntry & { hadRecentInput: boolean; value: number })[])
            if (!e.hadRecentInput) window.__qa.cls += e.value;
        }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((l) => {
          for (const e of l.getEntries()) window.__qa.longTasks += Math.max(0, e.duration - 50);
        }).observe({ type: 'longtask', buffered: true });
      });
      const response = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120000 });
      await page.waitForTimeout(1500);
      const metrics = await page.evaluate(() => ({
        ...window.__qa,
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        resources: performance.getEntriesByType('resource').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      if (name === 'checkout' && !page.url().includes('/checkout/mock/'))
        throw Error('Keine tatsächliche Mock-Bezahlseite: ' + page.url());
      if (process.env.AUDIT_SCREENSHOTS_DIR && run === 1) {
        await mkdir(process.env.AUDIT_SCREENSHOTS_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.AUDIT_SCREENSHOTS_DIR}/v4-${name}-mobile.png`, fullPage: true });
      }
      results.push({ name, run, finalPath: new URL(page.url()).pathname, status: response?.status(), ...metrics });
      await ctx.close();
    }
  }
  await mkdir('data/exports/final-audit', { recursive: true });
  await writeFile(
    'data/exports/final-audit/mobile-performance.json',
    JSON.stringify(
      {
        method: 'local production, cold cache, 390x844, CPU4x, latency150ms, download1.6Mbps; synthetic, no INP/field data',
        results,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
