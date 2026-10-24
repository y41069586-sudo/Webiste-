import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Browser } from '@playwright/test';
import { seedPublishedDemo } from './seed';

/**
 * Screenshots der Firmen-Website und der Kauf-Strecke (Desktop 1440 × 900, Handy 390 × 844), ganzseitig.
 * Nur mit SHOTS_DIR=<ordner>; Animationen im Endzustand (reduzierte Bewegung).
 */
const DIR = process.env.SHOTS_DIR;
const SITE = [
  '/',
  '/so-funktionierts',
  '/preise',
  '/garantie',
  '/beispiele',
  '/ueber-mich',
  '/kontakt',
  '/impressum',
  '/datenschutz',
  '/agb',
  '/quellen',
];
const name = (p: string) => (p === '/' ? 'startseite' : p.replace(/^\//, '').replace(/\//g, '-'));

async function shoot(browser: Browser, url: string, file: string) {
  for (const [kind, opts] of [
    ['desktop', { viewport: { width: 1440, height: 900 } }],
    ['handy', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ] as const) {
    const ctx = await browser.newContext({ ...opts, reducedMotion: 'reduce', locale: 'de-DE' });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(DIR!, `${file}-${kind}.png`), fullPage: true });
    await ctx.close();
  }
}

test.describe('Screenshots', () => {
  test.skip(!DIR, 'nur mit SHOTS_DIR');

  test('Firmen-Website und Kauf-Strecke', async ({ browser, page }) => {
    test.setTimeout(600_000);
    mkdirSync(DIR!, { recursive: true });
    for (const p of SITE) await shoot(browser, p, `site-${name(p)}`);
    // Kauf-Strecke: Demo → Checkout → Testzahlung → Danke → Angaben
    const demo = seedPublishedDemo();
    await shoot(browser, `/d/${demo.slug}`, 'kauf-1-entwurf');
    await shoot(browser, `/checkout/${demo.slug}`, 'kauf-2-checkout');
    await page.goto(`/checkout/${demo.slug}`);
    await page.waitForLoadState('networkidle');
    await expect(async () => {
      await page.getByLabel('Wunschdomain').fill(`screens-${Date.now()}`);
      await expect(page.getByText(/ist frei/)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await page.getByRole('radio', { name: /Einmalzahlung/ }).check();
    await page.getByLabel('Ihr Name (Vor- und Nachname)').fill('Erika Beispiel');
    await page.getByLabel('E-Mail').fill('erika@example.org');
    await page.getByLabel(/als Unternehmer/).check();
    await page.getByLabel(/Ich akzeptiere die/).check();
    await page.getByRole('button', { name: /Weiter zur Zahlung/ }).click();
    await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
    await shoot(browser, page.url(), 'kauf-3-zahlung');
    await page.getByRole('button', { name: 'Erfolgreich bezahlen (Karte)' }).click();
    const link = page.getByRole('link', { name: 'Jetzt Angaben eintragen' });
    await expect(link).toBeVisible();
    await shoot(browser, page.url(), 'kauf-4-danke');
    await shoot(browser, (await link.getAttribute('href'))!, 'kauf-5-angaben');
  });
});
