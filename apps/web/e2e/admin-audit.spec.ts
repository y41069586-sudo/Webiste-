import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { seedPendingDemo, seedPublishedDemo } from './seed';

/**
 * Rundgang durch die gesamte Verwaltung auf iPad-Breiten: Konsolenfehler, Seitenfehler, fehlgeschlagene Anfragen,
 * seitliches Überlaufen und Ladezeit je Seite. ADMIN_AUDIT_FILE=<datei> schreibt den Bericht als JSON.
 */
const LIST = [
  '/admin',
  '/admin/suche',
  '/admin/leads',
  '/admin/demos',
  '/admin/letters',
  '/admin/outbox',
  '/admin/orders',
  '/admin/customers',
  '/admin/support',
  '/admin/budget',
  '/admin/kpis',
  '/admin/funnel',
  '/admin/reports',
  '/admin/optimizer',
  '/admin/variants',
  '/admin/learning',
  '/admin/objections',
  '/admin/claims',
  '/admin/jobs',
  '/admin/settings',
  '/admin/audit',
];
const DETAIL = /^\/admin\/(leads|demos|letters|orders|customers|support)\/[0-9a-f-]{36}$/;

type Finding = { page: string; width: number; kind: string; detail: string };

async function visit(page: Page, url: string, width: number, findings: Finding[]) {
  const started = Date.now();
  const res = await page.goto(url);
  await page.waitForLoadState('networkidle');
  const ms = Date.now() - started;
  if (!res || res.status() >= 400) findings.push({ page: url, width, kind: 'status', detail: String(res?.status()) });
  if (ms > 4000) findings.push({ page: url, width, kind: 'langsam', detail: `${ms} ms` });
  const overflow = await page.evaluate(() => {
    const main = document.getElementById('admin-content');
    const doc = document.documentElement;
    const out: string[] = [];
    if (doc.scrollWidth > doc.clientWidth + 1) out.push(`Seite ${doc.scrollWidth}>${doc.clientWidth}`);
    if (main) {
      for (const el of main.querySelectorAll<HTMLElement>('*')) {
        const r = el.getBoundingClientRect();
        const m = main.getBoundingClientRect();
        let clipped = false;
        for (let p = el.parentElement; p && p !== main; p = p.parentElement) {
          const o = getComputedStyle(p).overflowX;
          if (o === 'auto' || o === 'scroll' || o === 'hidden') clipped = true;
        }
        if (!clipped && r.width > 0 && r.right > m.right + 2)
          out.push(
            `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} ragt ${Math.round(r.right - m.right)}px hinaus`,
          );
        if (out.length > 4) break;
      }
    }
    return out;
  });
  for (const o of overflow) findings.push({ page: url, width, kind: 'ueberlauf', detail: o });
}

test('Rundgang Verwaltung: keine Fehler, kein Überlaufen', async ({ page }) => {
  test.setTimeout(900_000);
  seedPublishedDemo();
  seedPendingDemo();
  const findings: Finding[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') findings.push({ page: page.url(), width: 0, kind: 'konsole', detail: m.text().slice(0, 300) });
  });
  page.on('pageerror', (e) =>
    findings.push({ page: page.url(), width: 0, kind: 'seitenfehler', detail: e.message.slice(0, 300) }),
  );
  page.on('requestfailed', (r) => {
    if (!/_rsc|favicon|\.map$/.test(r.url()) && r.failure()?.errorText !== 'net::ERR_ABORTED')
      findings.push({ page: page.url(), width: 0, kind: 'anfrage', detail: `${r.url()} ${r.failure()?.errorText}` });
  });
  await loginAsAdmin(page);
  const details = new Set<string>();
  for (const width of [820, 1180]) {
    await page.setViewportSize({ width, height: width === 820 ? 1180 : 820 });
    for (const url of LIST) {
      await visit(page, url, width, findings);
      if (width === 820)
        for (const href of await page
          .locator('#admin-content a[href^="/admin/"]')
          .evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? '')))
          if (DETAIL.test(href) && [...details].filter((d) => d.split('/')[2] === href.split('/')[2]).length < 1)
            details.add(href);
    }
    for (const url of details) await visit(page, url, width, findings);
  }
  if (process.env.ADMIN_AUDIT_FILE)
    writeFileSync(process.env.ADMIN_AUDIT_FILE, JSON.stringify({ details: [...details], findings }, null, 2));
  expect(findings.filter((f) => f.kind !== 'langsam')).toEqual([]);
});
