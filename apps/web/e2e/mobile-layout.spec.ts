import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser, type Page } from '@playwright/test';
import { payOnMockCheckout } from './helpers';
import { seedPublishedDemo } from './seed';

/**
 * Handy-Layout: Firmen-Website, Kauf-Strecke und Demos aller Branchengruppen auf kleinen bis großen Handys.
 * Prüft seitliches Überlaufen, über den Rand ragende Elemente, übereinanderliegende Texte/Bedienelemente,
 * abgeschnittene Überschriften und zu viel festen (fixierten) Bildschirmanteil.
 * MOBILE_SHOTS_DIR=<ordner> legt zusätzlich ganzseitige Screenshots ab.
 */
const PHONES = [
  { name: 'se1-320', width: 320, height: 568 },
  { name: 'android-360', width: 360, height: 740 },
  { name: 'se3-375', width: 375, height: 667 },
  { name: 'iphone-390', width: 390, height: 844 },
  { name: 'pixel-412', width: 412, height: 915 },
  { name: 'promax-430', width: 430, height: 932 },
] as const;

const SITE = ['/', '/so-funktionierts', '/preise', '/garantie', '/beispiele', '/ueber-mich', '/kontakt', '/impressum', '/agb'];

const DEMOS = [
  { name: 'Malerbetrieb Großkopf-Schwarzenberger', branch: 'maler' },
  { name: 'Gebäudereinigung Sauber & Glänzend Ruhrgebiet', branch: 'reinigung' },
  { name: 'Friseursalon Haarmonie Dortmund-Hörde', branch: 'friseur' },
  { name: 'Kosmetikstudio Schönheitsoase', branch: 'kosmetikstudio' },
  { name: 'Restaurant Zur Alten Zechensiedlung', branch: 'restaurant' },
  { name: 'Tanzschule Rhythmus & Bewegung', branch: 'tanzschule' },
];

type Issue = { kind: string; detail: string };

/** Läuft im Browser: sammelt Layout-Probleme der aktuellen Seite. */
function auditLayout(): Issue[] {
  const issues: Issue[] = [];
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const label = (el: Element) => {
    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 50);
    const cls = typeof el.className === 'string' ? el.className.split(' ').slice(0, 3).join('.') : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''} „${text}“`;
  };
  const visible = (el: Element) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) <= 0.05 || r.width <= 0 || r.height <= 0)
      return false;
    // Inhalt zugeklappter <details> (FAQ) wird nicht dargestellt, behält aber Maße
    const closed = el.closest('details:not([open])');
    if (closed && !el.closest('summary')) return false;
    // Von einem abschneidenden Vorfahren (z. B. zugeklapptes Akkordeon) größtenteils verdeckt = nicht sichtbar
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (Number(ps.opacity) <= 0.05) return false;
      if (ps.overflowY === 'visible' && ps.overflowX === 'visible') continue;
      const pr = p.getBoundingClientRect();
      const w = Math.min(r.right, pr.right) - Math.max(r.left, pr.left);
      const h = Math.min(r.bottom, pr.bottom) - Math.max(r.top, pr.top);
      if (w <= 0 || h <= 0 || (w * h) / (r.width * r.height) < 0.5) return false;
    }
    return true;
  };
  /** Innerhalb eines Containers, der Überlauf abschneidet oder scrollt (Karussell) – dort ist Überstand gewollt */
  const clipped = (el: Element) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const o = getComputedStyle(p).overflowX;
      if (o === 'hidden' || o === 'auto' || o === 'scroll' || o === 'clip') return true;
    }
    return false;
  };
  if (document.documentElement.scrollWidth > vw + 1)
    issues.push({ kind: 'seitlich-scrollbar', detail: `Seite ${document.documentElement.scrollWidth}px breit bei ${vw}px` });

  const all = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'svg', 'path'].includes(el.tagName));
  for (const el of all) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !clipped(el) && getComputedStyle(el).position !== 'fixed')
      issues.push({ kind: 'ragt-ueber-rand', detail: `${label(el)} (${Math.round(r.left)}–${Math.round(r.right)}px)` });
  }

  // Abgeschnittene/überlaufende Texte: Überschriften, Knöpfe, Links, Preise
  for (const el of document.querySelectorAll('h1,h2,h3,h4,button,a,label,p,li,dt,dd,strong')) {
    if (!visible(el) || clipped(el)) continue;
    const s = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 2 && s.overflowX === 'visible' && el.clientWidth > 0 && s.display !== 'inline')
      issues.push({ kind: 'text-zu-breit', detail: `${label(el)} (${el.scrollWidth} > ${el.clientWidth}px)` });
  }

  // Überschriften, die auf dem Handy zu groß sind (mehr als ~13 % der Bildschirmbreite je Zeichenhöhe)
  for (const el of document.querySelectorAll('h1,h2')) {
    if (!visible(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size > vw * 0.135) issues.push({ kind: 'ueberschrift-zu-gross', detail: `${label(el)} ${size}px bei ${vw}px` });
  }

  // Übereinanderliegende Texte/Bedienelemente (Blätter mit eigenem Text)
  /** In einer festen/klebenden Leiste (Banner, Kopfzeile): liegt absichtlich über dem Inhalt */
  const inFixedBar = (el: Element) => {
    for (let p: Element | null = el; p && p !== document.body; p = p.parentElement)
      if (['fixed', 'sticky'].includes(getComputedStyle(p).position)) return true;
    return false;
  };
  const leaves = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,label,li,dt,dd,span,strong,small,input,select,textarea')]
    // Dekorative, für Screenreader verborgene Mockups (z. B. animierte Handy-Vorschau) dürfen sich überlagern
    .filter((el) => visible(el) && !inFixedBar(el) && !el.closest('[aria-hidden="true"]'))
    .filter((el) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return true;
      return [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1);
    });
  const boxes = leaves.map((el) => ({ el, r: el.getBoundingClientRect() }));
  let overlaps = 0;
  for (let i = 0; i < boxes.length && overlaps < 15; i++) {
    for (let j = i + 1; j < boxes.length && overlaps < 15; j++) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // Inline-Elemente im selben Absatz umspannen beim Zeilenumbruch gemeinsame Rechtecke
      if (a.el.parentElement === b.el.parentElement && getComputedStyle(a.el).display === 'inline') continue;
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (w > 4 && h > 4) {
        overlaps++;
        issues.push({ kind: 'ueberlappung', detail: `${label(a.el)} ⟷ ${label(b.el)} (${Math.round(w)}×${Math.round(h)}px)` });
      }
    }
  }

  // Feste Leisten (Banner, Kopfzeilen) dürfen nicht zu viel vom Bildschirm verdecken
  const fixedHeight = all
    .filter((el) => visible(el) && ['fixed', 'sticky'].includes(getComputedStyle(el).position))
    .filter((el) => !el.parentElement || !['fixed', 'sticky'].includes(getComputedStyle(el.parentElement).position))
    .reduce((sum, el) => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < vh ? sum + Math.min(r.bottom, vh) - Math.max(r.top, 0) : sum;
    }, 0);
  if (fixedHeight > vh * 0.3)
    issues.push({ kind: 'feste-leisten-zu-hoch', detail: `${Math.round(fixedHeight)}px von ${vh}px fest verdeckt` });
  return issues;
}

const SHOTS = process.env.MOBILE_SHOTS_DIR;
const report: Record<string, Issue[]> = {};

async function check(browser: Browser, url: string, name: string, prepare?: (page: Page) => Promise<void>) {
  for (const phone of PHONES) {
    const ctx = await browser.newContext({
      viewport: { width: phone.width, height: phone.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: 'reduce',
      locale: 'de-DE',
    });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    if (prepare) await prepare(page);
    const issues = await page.evaluate(auditLayout);
    if (issues.length) report[`${name} @ ${phone.name}`] = issues;
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${name}-${phone.name}.png`), fullPage: true });
    await ctx.close();
  }
}

test.describe('Handy-Layout', () => {
  test.afterAll(() => {
    if (SHOTS) writeFileSync(path.join(SHOTS, 'report.json'), JSON.stringify(report, null, 2));
  });

  test('Firmen-Website, Kauf-Strecke und Demos aller Gruppen auf 320–430 px', async ({ browser, page }) => {
    test.setTimeout(1_800_000);
    if (SHOTS) mkdirSync(SHOTS, { recursive: true });
    for (const p of SITE) await check(browser, p, `site${p === '/' ? '-start' : p.replace(/\//g, '-')}`);
    for (const d of DEMOS) {
      const demo = seedPublishedDemo({ name: d.name, branch: d.branch, city: 'Dortmund' });
      await check(browser, `/d/${demo.slug}`, `demo-${d.branch}`);
    }
    const demo = seedPublishedDemo();
    await page.goto(`/d/${demo.slug}/uebernehmen?plan=one_time`);
    await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
    await check(browser, page.url(), 'kauf-bezahlseite');
    await payOnMockCheckout(page);
    const link = page.getByRole('link', { name: 'Jetzt Angaben eintragen' });
    await expect(link).toBeVisible();
    await check(browser, page.url(), 'kauf-danke');
    await check(browser, (await link.getAttribute('href'))!, 'kauf-angaben');
    expect(report, JSON.stringify(report, null, 2)).toEqual({});
  });
});
