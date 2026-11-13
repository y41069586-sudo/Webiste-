/** Schnellbestellung (13.11.2026): Übernehmen → Tarif → Bezahlseite, Angaben erst nach der Zahlung. Nur Mock-Anbieter. */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { seedPublishedDemo, setOfferVersion } from './seed';
import { payOnMockCheckout } from './helpers';

const out = process.env.QUICK_ORDER_SHOTS;

test.beforeAll(() => setOfferVersion('v4'));

test('Schnellbestellung am Handy: ohne Formular zur Bezahlseite, Angaben danach', async ({ page }) => {
  test.setTimeout(240000);
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': '192.0.2.77' });
  await page.setViewportSize({ width: 390, height: 844 });
  const demo = seedPublishedDemo({ name: 'Maleratelier Schnellweg – fiktiver Testbetrieb', branch: 'maler', city: 'Teststadt' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/d/${demo.slug}/uebernehmen?plan=basis`);
  await expect(page).toHaveURL(new RegExp(`/einrichten/${demo.slug}`));
  const quick = page.locator('section[aria-labelledby="schnell"]');
  await expect(quick.getByRole('heading', { name: 'Jetzt bestellen, Angaben später ergänzen' })).toBeVisible();
  // Preis, heutiger Betrag und Laufzeit stehen auf jedem Knopf; keine Vorauswahl, kein Formularzwang
  const basis = quick.getByRole('button', { name: /SeitenWerk Basis bestellen/ });
  await expect(basis).toContainText('597,00 € einmalig');
  await expect(basis).toContainText(/19,00\s*€\/Monat ab Go-Live/);
  await expect(basis).toContainText('Heute fällig: 597,00 €');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (out) await page.screenshot({ path: path.join(out, 'quick-1-einrichten-390.png') });
  // Das ausführliche Formular bleibt als zweiter Weg erhalten
  await expect(page.getByRole('heading', { name: 'Machen Sie Ihre Website zu Ihrer.' })).toBeVisible();
  await basis.click();
  await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
  if (out) await page.screenshot({ path: path.join(out, 'quick-2-bezahlseite-390.png'), fullPage: true });
  await payOnMockCheckout(page, { email: 'schnell@example.test', domain: 'schnellweg-test.de' });
  await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
  if (out) await page.screenshot({ path: path.join(out, 'quick-3-danke-390.png'), fullPage: true });
  // Nach der Zahlung führt der Link zum Formular für die Website-Angaben (nicht zu einer fertigen Einrichtung)
  await page
    .getByRole('link', { name: /Einrichtung|Angaben/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/onboarding\//);
  await expect(page.getByLabel('Name des Betriebs')).toBeVisible();
  if (out) await page.screenshot({ path: path.join(out, 'quick-4-onboarding-390.png') });
  expect(errors).toEqual([]);
});
