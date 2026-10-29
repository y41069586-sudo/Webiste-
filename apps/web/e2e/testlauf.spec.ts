import { expect, test } from '@playwright/test';
import { loginAsAdmin, payOnMockCheckout } from './helpers';
import { setOfferVersion } from './seed';

test.beforeAll(async () => {
  setOfferVersion('v4');
  await new Promise((resolve) => setTimeout(resolve, 3100));
});
test.afterAll(async () => {
  setOfferVersion('legacy');
  await new Promise((resolve) => setTimeout(resolve, 3100));
});

test('Testlauf: erfundener Betrieb → Demo freigeben → QR-Link → übernehmen → Testzahlung', async ({ page }) => {
  test.setTimeout(420_000);
  await loginAsAdmin(page);
  await page.goto('/admin/ablauf');
  await page.getByRole('link', { name: 'Testlauf ausprobieren' }).click();
  await page
    .getByRole('button', { name: /Testlauf starten/ })
    .first()
    .click();
  await expect(page.getByText(/Beispiel/).first()).toBeVisible();
  // Der Worker baut die Demo (Mock-KI)
  await expect(async () => {
    await page.goto('/admin/ablauf/testlauf');
    await expect(page.getByRole('link', { name: /Demo ansehen und freigeben/ })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 240_000 });
  await page.getByRole('link', { name: /Demo ansehen und freigeben/ }).click();
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Freigeben – geht online' }) });
  await form.getByRole('checkbox', { name: /Am Computer und am Handy/ }).check();
  await form.getByRole('checkbox', { name: /Name, Adresse, Bilder/ }).check();
  if (await form.getByText('Sehr gut', { exact: true }).count()) await form.getByText('Sehr gut', { exact: true }).click();
  await form.getByRole('button', { name: 'Freigeben – geht online' }).click();
  await expect(async () => {
    await page.goto('/admin/ablauf/testlauf');
    await expect(page.getByRole('link', { name: /Wie nach dem Scan öffnen/ })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 120_000 });
  await expect(page.getByRole('img', { name: 'QR-Code zur Test-Demo' })).toBeVisible();
  const qr = await page.getByRole('link', { name: /Wie nach dem Scan öffnen/ }).getAttribute('href');
  expect(qr).toMatch(/\/q\/[A-Za-z0-9_-]+$/);
  // Wie ein Scan: QR-Link → Demo → übernehmen → Testzahlung
  await page.goto(new URL(qr!).pathname);
  await expect(page.getByText('Unverbindlicher Website-Entwurf', { exact: true })).toBeVisible();
  await page.locator('#uebernehmen').getByRole('link', { name: 'Mit Basis übernehmen' }).click();
  await payOnMockCheckout(page, { domain: `testlauf-${Date.now()}.de` });
  await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
});
