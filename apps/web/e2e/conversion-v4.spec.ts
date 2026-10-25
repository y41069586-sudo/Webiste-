import { expect, test } from '@playwright/test';
import { seedPublishedDemo, setOfferVersion } from './seed';
import { payOnMockCheckout } from './helpers';

test.beforeAll(async () => {
  setOfferVersion('v4');
  await new Promise((resolve) => setTimeout(resolve, 3100));
});
test.afterAll(async () => {
  setOfferVersion('legacy');
  await new Promise((resolve) => setTimeout(resolve, 3100));
});

test('V4: mobile Tarifkarten, echte Formularzustimmung und gesperrter Aboabschluss vor Go-Live', async ({ page }) => {
  test.setTimeout(300_000);
  const demo = seedPublishedDemo();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/d/${demo.slug}`);
  await expect(page.getByText('Unverbindlicher Website-Entwurf', { exact: true })).toBeVisible();
  const offers = page.locator('#uebernehmen');
  await expect(offers.getByRole('heading', { name: 'Gefällt Ihnen Ihre neue Website?' })).toBeVisible();
  await expect(offers.getByRole('link', { name: 'Mit Basis übernehmen' })).toBeVisible();
  await expect(offers.getByRole('link', { name: 'Mit Care+ übernehmen' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await offers.getByRole('link', { name: 'Mit Care+ übernehmen' }).click();
  await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
  await expect(page.getByText(/597,00/).first()).toBeVisible();
  await expect(page.getByText(/ich stimme dem gewählten Monatstarif/)).toContainText(/99,00/);
  await expect(page.getByLabel(/AGB/)).not.toBeChecked();
  await payOnMockCheckout(page, { domain: 'v4-browser-fixture.de' });
  await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
  const onboarding = await page.getByRole('link', { name: 'Jetzt Angaben eintragen' }).getAttribute('href');
  const token = onboarding!.split('/').at(-1)!;
  await page.goto(`/verlaengern/${token}`);
  await expect(page.getByRole('heading', { name: 'SeitenWerk Care+' })).toBeVisible();
  await expect(page.getByText(/Sie müssen kein zweites Abo abschließen/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Monatstarif ausdrücklich bestätigen' })).toHaveCount(0);
  await page.goto(`/onboarding/${token}`);
  await page.getByLabel('Rechtsform').selectOption('Einzelunternehmen');
  await page.getByLabel('Telefon', { exact: true }).fill('030 00000000');
  await page
    .getByLabel('Ihre Datenschutzerklärung (Text einfügen)')
    .fill('Fiktive Datenschutzerklärung für den isolierten Test. '.repeat(15));
  await page.getByLabel(/Ich bestätige, dass die Angaben/).check();
  await page.getByRole('button', { name: /Angaben absenden/ }).click();
  await expect(async () => {
    await page.goto(`/preview/${token}`);
    await expect(page.getByRole('heading', { name: 'Vorschau Ihrer Website' })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 90000 });
  await page.getByLabel(/Ich habe die Vorschau geprüft/).check();
  await page.getByRole('button', { name: 'Freigeben und veröffentlichen' }).click();
  await expect(async () => {
    await page.goto(`/preview/${token}`);
    await expect(page.getByRole('heading', { name: 'Ihre Website ist online' })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 120000 });
  await expect(async () => {
    await page.goto(`/verlaengern/${token}`);
    await expect(page.getByText('Ihr Monatstarif ist aktiv.', { exact: false })).toBeVisible({ timeout: 2000 });
  }).toPass({ timeout: 30000 });
  await page.getByLabel(/Ich wünsche diesen Wechsel/).check();
  await page.getByRole('button', { name: 'Tarifwechsel anfragen' }).click();
  await expect(page.getByText(/wird geprüft/)).toBeVisible();
  await page.getByRole('button', { name: 'Wechsel zurücknehmen' }).click();
  await expect(page.getByRole('button', { name: 'Tarifwechsel anfragen' })).toBeVisible();
  await page.getByLabel(/Ich bestätige die Kündigung/).check();
  await page.getByRole('button', { name: 'Zum Periodenende kündigen' }).click();
  await expect(page.getByText(/Ihre Kündigung zum Ende/)).toBeVisible();
});

test('V4: Firmen-Preise zeigen zwei Tarife ohne alte Jahresbindung', async ({ page }) => {
  await page.goto('/preise');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Zwei Tarife. Klare Leistungen.');
  await expect(page.getByRole('heading', { name: 'SeitenWerk Basis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SeitenWerk Care+' })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Zahlweise' })).toHaveCount(0);
  await expect(page.getByText(/825/)).toBeVisible();
  await expect(page.getByText(/1.785/)).toBeVisible();
});
