import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { seedPublishedDemo, setOfferVersion } from './seed';
import { payOnMockCheckout } from './helpers';
const out = path.resolve('../../data/exports/task3-checkout/after');
test.beforeAll(async () => {
  setOfferVersion('v4');
  mkdirSync(out, { recursive: true });
  await new Promise((r) => setTimeout(r, 3100));
});
test('ausstehende Zahlung: kein Erfolg und kein erneuter Kauf', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': '192.0.2.201' });
  const demo = seedPublishedDemo({ name: 'Café Zahlungsprüfung – fiktiver Testbetrieb', branch: 'cafe', city: 'Teststadt' });
  await page.goto(`/d/${demo.slug}`);
  await page.getByRole('link', { name: 'Mit Basis übernehmen', exact: true }).click();
  await payOnMockCheckout(page, {
    email: 'pending@example.test',
    domain: 'task3-pending-test.de',
    outcome: 'Lastschrift – Zahlung in Bearbeitung',
  });
  await expect(page.getByRole('heading', { name: 'Danke – Ihre Zahlung wird bearbeitet' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jetzt Angaben eintragen' })).toHaveCount(0);
  await page.screenshot({ path: path.join(out, 'zahlung-ausstehend-320.jpg'), fullPage: true, type: 'jpeg' });
  await page.goto(`/checkout/${demo.slug}`);
  await expect(page.getByRole('heading', { name: 'Zahlung wird geprüft' })).toBeVisible();
  await page.screenshot({ path: path.join(out, 'bestellung-processing-320.jpg'), fullPage: true, type: 'jpeg' });
  await page.goto(`/d/${demo.slug}/uebernehmen?plan=care_plus`);
  await expect(page.getByRole('heading', { name: 'Bezahlseite nicht verfügbar' })).toBeVisible();
  await expect(page.getByText('Für diesen Entwurf liegt bereits eine Bestellung vor.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('fehlgeschlagene Zahlung: keine Bestätigung, erneuter Versuch möglich', async ({ page }) => {
  test.setTimeout(180000);
  await page.setViewportSize({ width: 430, height: 932 });
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': '192.0.2.202' });
  const demo = seedPublishedDemo({ name: 'Elektro Rückkehr – fiktiver Testbetrieb', branch: 'elektriker', city: 'Teststadt' });
  await page.goto(`/d/${demo.slug}`);
  await page.getByRole('link', { name: 'Mit Care+ übernehmen', exact: true }).click();
  await payOnMockCheckout(page, {
    email: 'failed@example.test',
    domain: 'task3-failed-test.de',
    outcome: 'Lastschrift – Zahlung fehlgeschlagen',
  });
  await expect(page.getByRole('heading', { name: 'Zahlung noch nicht bestätigt' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Jetzt Angaben eintragen' })).toHaveCount(0);
  await page.screenshot({ path: path.join(out, 'zahlung-fehlgeschlagen-430.jpg'), fullPage: true, type: 'jpeg' });
  await page.goto(`/d/${demo.slug}`);
  await page.getByRole('link', { name: 'Mit Care+ übernehmen', exact: true }).click();
  await payOnMockCheckout(page, { email: 'retry@example.test', domain: 'task3-retry-test.de' });
  await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
});
