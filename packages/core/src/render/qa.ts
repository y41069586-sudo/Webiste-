import { gzipSync } from 'node:zlib';
import { lighthouseCpuMultiplier } from './lighthouse-cpu';
import { createServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { HtmlValidate } from 'html-validate';
import { chromium } from 'playwright';
import { getEnv } from '../config/env';
import type { QaResult } from '../db/schema';
import { withRenderSlot, boundedRender } from './limits';

type Check = QaResult['checks'][number];

// ---------------------------------------------------------------------------
// HTML-Validierung
// ---------------------------------------------------------------------------
const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: {
    // Inline-Styles/-SVG sind gewollt (eigenständige Seiten ohne externe Dateien)
    'no-inline-style': 'off',
    'long-title': 'off',
    'no-trailing-whitespace': 'off',
    'attribute-boolean-style': 'off',
    'attribute-empty-style': 'off',
    'void-style': 'off',
    'no-implicit-close': 'off',
    'prefer-tbody': 'off',
    'tel-non-breaking': 'off',
    'element-required-attributes': 'error',
    // Honeypot-Feld ist per CSS ausgeblendet und aria-hidden (bewusst)
    'hidden-focusable': 'off',
    'no-redundant-role': 'off',
    'text-content': 'off',
    'wcag/h63': 'off',
  },
});

export async function validateHtml(html: string): Promise<Check> {
  const report = await validator.validateString(html);
  const msgs = report.results.flatMap((r) => r.messages).filter((m) => m.severity === 2);
  return {
    name: 'html-validierung',
    passed: msgs.length === 0,
    ...(msgs.length
      ? {
          details: msgs
            .slice(0, 10)
            .map((m) => `${m.ruleId}: ${m.message} (Z. ${m.line})`)
            .join(' | '),
        }
      : {}),
  };
}

export { browserChecks, type BrowserQaOptions } from './browser-checks';

// ---------------------------------------------------------------------------
// Lighthouse (mobil) auf der Live-Variante der Seite
// ---------------------------------------------------------------------------
async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createNetServer();
    s.listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

export async function lighthouseCheck(
  liveHtml: string,
  minScore = 0.9,
  assets: { path: string; content: Buffer | string; contentType?: string }[] = [],
): Promise<Check> {
  return withRenderSlot(() => {
    let cleanup = async () => {};
    // Includes launch and teardown: a stuck browser.close must never retain the global render slot.
    return boundedRender(
      () =>
        lighthouseInSlot(liveHtml, minScore, assets, (dispose) => {
          cleanup = dispose;
        }),
      () => cleanup(),
      165_000,
    ).finally(() => {
      void cleanup().catch(() => undefined);
    });
  });
}

async function lighthouseInSlot(
  liveHtml: string,
  minScore: number,
  assets: { path: string; content: Buffer | string; contentType?: string }[],
  onCleanup: (dispose: () => Promise<void>) => void,
): Promise<Check> {
  // Netlify serves HTML compressed. Model that delivery while retaining Lighthouse's mobile throttling.
  const compressedHtml = gzipSync(liveHtml);
  const server = createServer((req, res) => {
    const asset = assets.find((a) => `/${a.path.replace(/^\//, '')}` === req.url);
    if (asset) {
      res.writeHead(200, { 'content-type': asset.contentType ?? 'application/octet-stream', 'cache-control': 'max-age=600' });
      res.end(asset.content);
      return;
    }
    if (req.url === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      res.end('User-agent: *\nAllow: /\n');
      return;
    }
    const gzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'max-age=600',
      vary: 'Accept-Encoding',
      ...(gzip ? { 'content-encoding': 'gzip' } : {}),
    });
    res.end(gzip ? compressedHtml : liveHtml);
  });
  onCleanup(async () => {
    server.closeAllConnections();
    server.close();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  const port = (server.address() as { port: number }).port;
  const debugPort = await freePort();
  const executablePath = getEnv().CHROMIUM_EXECUTABLE_PATH;
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: [`--remote-debugging-port=${debugPort}`, '--disable-dev-shm-usage'],
  });
  onCleanup(async () => {
    server.closeAllConnections();
    server.close();
    await browser.close().catch(() => undefined);
  });
  try {
    const { default: lighthouse } = await import('lighthouse');
    const options = {
      port: debugPort,
      output: 'json' as const,
      logLevel: 'error' as const,
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'mobile' as const,
      screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 2, disabled: false },
    };
    let result = await boundedRender(
      () => lighthouse(`http://127.0.0.1:${port}/`, options),
      () => browser.close(),
      65_000,
    );
    if (!result) throw new Error('Lighthouse lieferte kein Ergebnis');
    const baseline = {
      performance: result.lhr.categories.performance?.score,
      benchmarkIndex: result.lhr.environment.benchmarkIndex,
      throttling: result.lhr.configSettings.throttling,
    };
    const cpuSlowdownMultiplier = lighthouseCpuMultiplier(baseline.benchmarkIndex);
    if (cpuSlowdownMultiplier < 3.9) {
      // Keep the standard report as evidence. Same page, network and scoring threshold; only CPU is calibrated.
      result = await boundedRender(
        () =>
          lighthouse(`http://127.0.0.1:${port}/`, {
            ...options,
            throttling: { ...baseline.throttling, cpuSlowdownMultiplier },
          }),
        () => browser.close(),
        65_000,
      );
      if (!result) throw new Error('Kalibrierte Lighthouse-Messung fehlgeschlagen');
    }
    const scores = Object.fromEntries(Object.entries(result.lhr.categories).map(([k, v]) => [k, v.score ?? 0]));
    const min = Math.min(...Object.values(scores));
    const diagnostics = {
      htmlBytes: Buffer.byteLength(liveHtml),
      gzipBytes: compressedHtml.length,
      benchmarkIndex: result.lhr.environment.benchmarkIndex,
      throttling: result.lhr.configSettings.throttling,
      cpuCalibration: {
        baseline,
        referenceBenchmark: 1500,
        appliedMultiplier: cpuSlowdownMultiplier < 3.9 ? cpuSlowdownMultiplier : 4,
      },
      metrics: Object.fromEntries(
        [
          'first-contentful-paint',
          'largest-contentful-paint',
          'total-blocking-time',
          'cumulative-layout-shift',
          'speed-index',
        ].map((id) => [id, result.lhr.audits[id]?.numericValue]),
      ),
      warnings: result.lhr.runWarnings,
      opportunities: Object.values(result.lhr.audits)
        .filter((a) => a.score !== null && a.score < 1 && a.details?.type === 'opportunity')
        .slice(0, 6)
        .map((a) => ({ id: a.id, value: a.displayValue })),
    };
    return {
      name: 'lighthouse',
      passed: min >= minScore,
      score: Math.round(min * 100),
      details:
        Object.entries(scores)
          .map(([k, v]) => `${k}: ${Math.round(v * 100)}`)
          .join(', ') +
        '; diagnostics: ' +
        JSON.stringify(diagnostics),
    };
  } finally {
    await browser.close().catch(() => undefined);
    server.close();
  }
}
