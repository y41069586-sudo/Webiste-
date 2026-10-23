import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { seedPublishedDemo } from './seed';

test.describe('Checkout', () => {
  test('Demo → Bestellen → (Test-)Zahlung → Danke-Seite → Rechnung im Postausgang', async ({ page }) => {
    const demo = seedPublishedDemo();
    await page.goto(`/d/${demo.slug}`);
    await page
      .getByRole('complementary', { name: 'Hinweis zum Entwurf' })
      .getByRole('link', { name: 'Seite übernehmen' })
      .click();
    // Zwei gleichwertige Preiskarten auf der Demo, Mindestlaufzeit neben den 49 €
    const offer = page.locator('#uebernehmen');
    await expect(offer.getByRole('heading', { name: 'Diese Seite übernehmen' })).toBeVisible();
    await expect(offer).toContainText('12 Monate Mindestlaufzeit');
    await expect(offer).toContainText('Ab Monat 13 nur noch 19');
    await offer.getByRole('link', { name: 'Einmalzahlung wählen' }).click();
    await expect(page).toHaveURL(new RegExp(`/checkout/${demo.slug}\\?plan=one_time$`));
    await expect(page.getByRole('heading', { name: 'Ihre Website übernehmen' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Einmalzahlung/ })).toBeChecked();
    await expect(page.getByText('Testmodus')).toBeVisible();

    // Ohne Pflicht-Checkboxen → Fehlermeldungen
    await page.getByLabel('Ihr Name (Vor- und Nachname)').fill('Erika Beispiel');
    await page.getByLabel('E-Mail').fill('erika@example.org');
    await page.getByLabel('Wunschdomain').fill('vergeben-beispiel');
    await expect(page.getByText('ist leider schon vergeben')).toBeVisible();
    await page.getByLabel('Wunschdomain').fill('e2e-beispielbetrieb');
    await expect(page.getByText('e2e-beispielbetrieb.de ist frei')).toBeVisible();
    await page.getByRole('button', { name: /Weiter zur Zahlung/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'markierten Angaben' })).toBeVisible();
    await expect(page.getByText('als Unternehmer bestellen')).toBeVisible();

    await page.getByLabel(/als Unternehmer/).check();
    await page.getByLabel(/Ich akzeptiere die/).check();
    await page.getByRole('button', { name: /Weiter zur Zahlung/ }).click();

    await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
    await page.getByRole('button', { name: 'Erfolgreich bezahlen (Karte)' }).click();
    await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
    await expect(page.getByText(/Rechnung RE-\d{4}-\d{4}/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jetzt Angaben eintragen' })).toHaveAttribute(
      'href',
      /\/onboarding\/[A-Za-z0-9]{32}$/,
    );

    // Erneuter Aufruf des Checkouts: bereits bestellt, kein Onboarding-Link
    await page.goto(`/checkout/${demo.slug}`);
    await expect(page.getByRole('heading', { name: 'Bereits bestellt' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Angaben/ })).toHaveCount(0);

    // Admin: Bestellung bezahlt, Rechnung wird vom Worker erzeugt und versendet
    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await expect(page.getByRole('cell', { name: 'e2e-beispielbetrieb.de' })).toBeVisible();
    await expect(async () => {
      await page.goto('/admin/outbox');
      await expect(page.getByRole('cell', { name: /Rechnung-RE-\d{4}-\d{4}\.pdf/ })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
  });

  test('Monatlich: keine Vorauswahl, Mindestlaufzeit im Checkout, Abo-Zahlung', async ({ page }) => {
    const demo = seedPublishedDemo();
    await page.goto(`/checkout/${demo.slug}`);
    await page.waitForLoadState('load');
    await expect(page.getByRole('radio', { name: /Einmalzahlung/ })).not.toBeChecked();
    await expect(page.getByRole('radio', { name: /Monatlich/ })).not.toBeChecked();
    await expect(async () => {
      await page.getByLabel('Wunschdomain').fill(`e2e-monat-${Date.now()}`);
      await expect(page.getByText(/ist frei/)).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
    await page.getByLabel('Ihr Name (Vor- und Nachname)').fill('Moritz Monat');
    await page.getByLabel('E-Mail').fill('moritz@example.org');
    await page.getByLabel(/als Unternehmer/).check();
    await page.getByLabel(/Ich akzeptiere die/).check();
    await page.getByRole('button', { name: 'Weiter zur Zahlung' }).click();
    await expect(page.getByText('Bitte wählen Sie eine der beiden Optionen.')).toBeVisible();
    await page.getByRole('radio', { name: /Monatlich/ }).check();
    await expect(page.getByText(/Mindestlaufzeit 12 Monate/)).toBeVisible();
    await page.getByRole('button', { name: /Weiter zur Zahlung \(49/ }).click();
    await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
    await page.getByRole('button', { name: 'Erfolgreich bezahlen (Karte)' }).click();
    await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
  });
});
