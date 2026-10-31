import { expect, test } from '@playwright/test';
import { payOnMockCheckout, prepareWebsiteBeforePayment } from './helpers';
import { seedPublishedDemo, setOfferVersion } from './seed';

test.beforeAll(async () => {
  setOfferVersion('v4');
  await new Promise((r) => setTimeout(r, 3100));
});
test.afterAll(async () => {
  setOfferVersion('legacy');
});

test('Mobile Demo → private Einrichtung mit Logo → Zusammenfassung → Zahlung → übernommene Einrichtung', async ({ page }) => {
  test.setTimeout(240_000);
  const demo = seedPublishedDemo();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/d/${demo.slug}`);
  await page.locator('.sw-demo-buy').click();
  await expect(page).toHaveURL(new RegExp(`/einrichten/${demo.slug}$`));
  await expect(page.getByRole('heading', { name: 'Machen Sie Ihre Website zu Ihrer.' })).toBeVisible();
  await expect(page.getByText(/Erst danach prüfen Sie den Tarif/)).toBeVisible();
  await page.locator('[name="texts.wishes"]').fill('Bitte die Überschrift im persönlichen Gespräch abstimmen.');
  await page.getByLabel('Logo', { exact: true }).setInputFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwcAgAAAFkAMErqCR/AAAAAElFTkSuQmCC', 'base64'),
  });
  await expect(page.getByRole('status')).toContainText('Bilder gespeichert');
  await expect(page.locator('[name="texts.wishes"]')).toHaveValue('Bitte die Überschrift im persönlichen Gespräch abstimmen.');
  await page.getByRole('button', { name: 'Zwischenspeichern' }).click();
  await expect(page.getByText(/Zwischengespeichert/)).toBeVisible();
  await page.reload();
  await expect(page.locator('[name="texts.wishes"]')).toHaveValue('Bitte die Überschrift im persönlichen Gespräch abstimmen.');
  await expect(page.getByRole('img', { name: 'Ihr Logo' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await prepareWebsiteBeforePayment(page, { domain: 'e2e-vor-zahlung.de', plan: 'basis' });
  await expect(page.getByLabel('Ihr Name')).toHaveCount(0); // No duplicate collection at Stripe.
  await payOnMockCheckout(page);
  await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ihre Einrichtung wurde übernommen' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zur Einrichtung und Vorschau' })).toHaveAttribute(
    'href',
    /\/onboarding\/[A-Za-z0-9]{32}$/,
  );
  await page.goto(`/checkout/${demo.slug}`);
  await expect(page.getByRole('heading', { name: 'Bereits bestellt' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Vorschau/ })).toHaveCount(0);
});

test('Care+: Kosten vor Zahlung, keine Vorauswahl und gespeicherte Rückkehr nach Abbruch', async ({ page }) => {
  test.setTimeout(240_000);
  const demo = seedPublishedDemo();
  await page.goto(`/d/${demo.slug}/uebernehmen?plan=care_plus`);
  await prepareWebsiteBeforePayment(page, { domain: 'e2e-care-rueckkehr.de', plan: 'care_plus' });
  await payOnMockCheckout(page, { outcome: 'Abbrechen' });
  await expect(page).toHaveURL(new RegExp(`/einrichten/${demo.slug}/pruefen\\?abgebrochen=1$`));
  await expect(page.getByRole('status')).toContainText('Ihre Einrichtung ist weiterhin gespeichert');
  await expect(page.locator('[name="plan"]:checked')).toHaveCount(0);
  await expect(page.getByText('597,00 € einmalig + insgesamt 19,00 €/Monat ab Go-Live', { exact: true })).toBeVisible();
  await expect(page.getByText('597,00 € einmalig + insgesamt 99,00 €/Monat ab Go-Live', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Zurück und Angaben bearbeiten' }).click();
  await expect(page.locator('[name="domain"]')).toHaveValue('e2e-care-rueckkehr.de');
  await prepareWebsiteBeforePayment(page, { domain: 'e2e-care-rueckkehr.de', plan: 'care_plus' });
  await payOnMockCheckout(page);
  await expect(page.getByRole('heading', { name: 'Ihre Einrichtung wurde übernommen' })).toBeVisible();
});
