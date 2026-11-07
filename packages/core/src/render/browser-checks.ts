// Browser-only checks are shared with the demo self-test. Keep Lighthouse out of the web import graph.
import AxeBuilder from '@axe-core/playwright';
import type { Page } from 'playwright';
import type { QaResult } from '../db/schema';
import { withPage } from './browser';
import { imagesPainted } from './screenshots';

type Check = QaResult['checks'][number];

// ---------------------------------------------------------------------------
// Browser-Prüfungen
// ---------------------------------------------------------------------------
interface LayoutIssue {
  kind: 'overflow-x' | 'offscreen' | 'overlap' | 'clipped';
  detail: string;
}

/**
 * Läuft im Browser: horizontale Überläufe, abgeschnittener Text, überlappende Texte.
 * Als reiner JS-String, weil Transpiler (tsx/esbuild keepNames) sonst Hilfsfunktionen
 * wie `__name` einfügen, die im Browser nicht existieren.
 */
const LAYOUT_SCRIPT = `(() => {
  const issues = [];
  const vw = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > vw + 1) {
    issues.push({ kind: 'overflow-x', detail: 'scrollWidth ' + document.documentElement.scrollWidth + ' > ' + vw });
  }
  function isFixed(el) {
    for (let e = el; e; e = e.parentElement) {
      const pos = getComputedStyle(e).position;
      if (pos === 'fixed' || pos === 'sticky') return true;
    }
    return false;
  }
  function visible(el) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return false;
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector(':scope > summary')?.contains(el)) return false;
    }
    return s.display !== 'none' && s.visibility !== 'hidden';
  }
  function label(el, n) { return (el.textContent || '').trim().slice(0, n); }
  const textEls = Array.from(document.querySelectorAll('h1,h2,h3,p,li,a,button,label,dt,dd,summary,span')).filter(function (el) {
    return visible(el) && Array.from(el.childNodes).some(function (n) { return n.nodeType === 3 && (n.textContent || '').trim().length > 0; }) && !isFixed(el);
  });
  for (const el of textEls) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) issues.push({ kind: 'offscreen', detail: el.tagName + ': „' + label(el, 40) + '“' });
    const ov = getComputedStyle(el).overflowX;
    if ((ov === 'hidden' || ov === 'clip') && el.scrollWidth > el.clientWidth + 2) {
      issues.push({ kind: 'clipped', detail: el.tagName + ': „' + label(el, 40) + '“' });
    }
  }
  const rects = textEls.map(function (el) { return { el: el, r: el.getBoundingClientRect() }; });
  for (let i = 0; i < rects.length && issues.length < 20; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 4 && h > 4) issues.push({ kind: 'overlap', detail: '„' + label(a.el, 30) + '“ ↔ „' + label(b.el, 30) + '“' });
    }
  }
  return issues;
})()`;

async function layoutIssues(page: Page): Promise<LayoutIssue[]> {
  return (await page.evaluate(LAYOUT_SCRIPT)) as LayoutIssue[];
}

export interface BrowserQaOptions {
  /** HTML im Demo-Modus (mit Banner) – für axe, Konsole, Layout */
  html: string;
  expectedFacts?: { name: string; city: string };
}

export async function browserChecks(opts: BrowserQaOptions): Promise<Check[]> {
  const checks: Check[] = [];
  const viewports = [
    { label: 'desktop', width: 1440, height: 900, isMobile: false },
    { label: 'mobil', width: 390, height: 844, isMobile: true },
    // Kleinstes verbreitetes Handy (iPhone SE 1. Gen.): nur Lesbarkeit und Layout, axe/Struktur laufen oben
    { label: 'klein', width: 320, height: 568, isMobile: true, layoutOnly: true },
  ];
  for (const vp of viewports) {
    await withPage(
      { width: vp.width, height: vp.height, isMobile: vp.isMobile, deviceScaleFactor: vp.isMobile ? 2 : 1 },
      async (page) => {
        const consoleErrors: string[] = [];
        page.on('console', (m) => {
          if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
        });
        page.on('pageerror', (e) => consoleErrors.push(e.message.slice(0, 200)));
        await page.setContent(opts.html, { waitUntil: 'load' });
        await imagesPainted(page);
        if (vp.layoutOnly) {
          const issues = await layoutIssues(page);
          checks.push({
            name: `layout-${vp.label}`,
            passed: issues.length === 0,
            ...(issues.length
              ? {
                  details: issues
                    .slice(0, 8)
                    .map((i) => `${i.kind}: ${i.detail}`)
                    .join(' | '),
                }
              : {}),
          });
          return;
        }
        const structureIssues = await page.evaluate((expected) => {
          const problems: string[] = [];
          if (document.querySelectorAll('main h1').length !== 1) problems.push('Genau eine Hauptüberschrift erforderlich.');
          for (const anchor of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
            const href = anchor.getAttribute('href')!;
            if (href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1))))
              problems.push(`Fehlendes Sprungziel: ${href}`);
          }
          const text = document.body.textContent?.replace(/\s+/g, ' ') ?? '';
          if (expected)
            for (const value of [expected.name, expected.city]) {
              if (value && !text.includes(value.replace(/\s+/g, ' '))) problems.push('Erwartete Betriebsangabe fehlt.');
            }
          return [...new Set(problems)];
        }, opts.expectedFacts);
        checks.push({
          name: `struktur-${vp.label}`,
          passed: structureIssues.length === 0,
          ...(structureIssues.length ? { details: structureIssues.join(' | ') } : {}),
        });
        const heroReadability = await page
          .locator('main h1')
          .first()
          .evaluate((heading) => {
            const rect = heading.getBoundingClientRect();
            return { height: Math.round(rect.height), viewport: innerHeight, acceptable: rect.height <= innerHeight * 0.5 };
          })
          .catch(() => ({ height: 0, viewport: vp.height, acceptable: false }));
        checks.push({
          name: `hero-lesbarkeit-${vp.label}`,
          passed: heroReadability.acceptable,
          ...(!heroReadability.acceptable
            ? {
                details: `Hauptüberschrift benötigt ${heroReadability.height}px von ${heroReadability.viewport}px Bildschirmhöhe; individuelle Layoutprüfung erforderlich.`,
              }
            : {}),
        });
        const brokenImages = await page.evaluate(() =>
          Array.from(document.images)
            .filter((image) => !image.complete || image.naturalWidth === 0)
            .map((image) => image.alt || 'Bild ohne Alternativtext'),
        );
        checks.push({
          name: `bilder-${vp.label}`,
          passed: brokenImages.length === 0,
          ...(brokenImages.length ? { details: brokenImages.slice(0, 8).join(' | ') } : {}),
        });
        if (vp.label === 'desktop') {
          checks.push({
            name: 'konsole',
            passed: consoleErrors.length === 0,
            ...(consoleErrors.length ? { details: consoleErrors.join(' | ') } : {}),
          });
        }
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
        const violations = axe.violations.filter((v) => v.impact !== 'minor');
        checks.push({
          name: `axe-${vp.label}`,
          passed: violations.length === 0,
          ...(violations.length
            ? {
                // Mit Fundstelle und Farbangaben, damit eine automatische Nachbesserung genau diese Stelle trifft
                details: violations
                  .map((v) => {
                    const where = v.nodes
                      .slice(0, 3)
                      .map((n) => {
                        const colors = n.any?.[0]?.message?.match(
                          /foreground color: #[0-9a-f]{3,8}, background color: #[0-9a-f]{3,8}/i,
                        )?.[0];
                        return `${String(n.target?.[0] ?? '').slice(0, 80)}${colors ? ` (${colors})` : ''}`;
                      })
                      .join('; ');
                    return `${v.id} (${v.impact}, ${v.nodes.length}×): ${v.help}${where ? ` – ${where}` : ''}`;
                  })
                  .join(' | '),
              }
            : {}),
        });
        const issues = await layoutIssues(page);
        checks.push({
          name: `layout-${vp.label}`,
          passed: issues.length === 0,
          ...(issues.length
            ? {
                details: issues
                  .slice(0, 8)
                  .map((i) => `${i.kind}: ${i.detail}`)
                  .join(' | '),
              }
            : {}),
        });
      },
    );
  }
  return checks;
}
