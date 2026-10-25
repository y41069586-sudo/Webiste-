import { expect, test } from '@playwright/test';
import { loginAsAdmin, payOnMockCheckout } from './helpers';
import { seedPublishedDemo } from './seed';

test.describe('Checkout über die Bezahlseite (Stripe, im Test simuliert)', () => {
  test('Demo → Preiskarte → Bezahlseite → (Test-)Zahlung → Danke-Seite → Rechnung im Postausgang', async ({ page }) => {
    const demo = seedPublishedDemo();
    await page.goto(`/d/${demo.slug}`);
    await page
      .getByRole('complementary', { name: 'Website übernehmen' })
      .getByRole('link', { name: 'Diese Website übernehmen' })
      .click();
    // Zwei gleichwertige Preiskarten auf der Demo, Mindestlaufzeit neben den 49 €
    const offer = page.locator('#uebernehmen');
    await expect(offer.getByRole('heading', { name: 'Diese Seite übernehmen' })).toBeVisible();
    await expect(offer).toContainText('12 Monate Mindestlaufzeit');
    await expect(offer).toContainText('Ab Monat 13 nur noch 19');
    await offer.getByRole('link', { name: 'Einmalzahlung wählen' }).click();
    // keine eigene Checkout-Seite: direkt zur Bezahlseite des Anbieters
    await expect(page).toHaveURL(/\/checkout\/mock\/cs_mock_/);
    await expect(page.getByText('simuliert Stripe Checkout')).toBeVisible();
    await expect(page.getByLabel('Firmenname')).not.toHaveValue('');
    await payOnMockCheckout(page, { domain: 'e2e-beispielbetrieb.de' });
    await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
    await expect(page.getByText(/Rechnung RE-\d{4}-\d{4}/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jetzt Angaben eintragen' })).toHaveAttribute(
      'href',
      /\/onboarding\/[A-Za-z0-9]{32}$/,
    );

    // Erneuter Aufruf: bereits bestellt, kein Onboarding-Link
    await page.goto(`/checkout/${demo.slug}`);
    await expect(page.getByRole('heading', { name: 'Bereits bestellt' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Angaben/ })).toHaveCount(0);

    // Admin: Bestellung bezahlt (Angaben aus der Bezahlseite), Rechnung wird erzeugt und versendet
    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await expect(page.getByRole('cell', { name: 'e2e-beispielbetrieb.de' })).toBeVisible();
    await expect(async () => {
      await page.goto('/admin/outbox');
      await expect(page.getByRole('cell', { name: /Rechnung-RE-\d{4}-\d{4}\.pdf/ })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 60_000 });
  });

  test('Monatlich: Mindestlaufzeit auf der Bezahlseite, Abo-Zahlung; Abbrechen führt zurück zu den Preiskarten', async ({
    page,
  }) => {
    const demo = seedPublishedDemo();
    // ohne gewählte Option: zurück zu den beiden Karten (keine Vorauswahl)
    await page.goto(`/checkout/${demo.slug}`);
    await expect(page).toHaveURL(new RegExp(`/d/${demo.slug}#uebernehmen$`));
    await page.goto(`/d/${demo.slug}/uebernehmen?plan=monthly`);
    await expect(page.getByText(/12 Monate Mindestlaufzeit/)).toBeVisible();
    await page.getByRole('button', { name: 'Abbrechen' }).click();
    await expect(page).toHaveURL(new RegExp(`/d/${demo.slug}#uebernehmen$`));
    await page.goto(`/d/${demo.slug}/uebernehmen?plan=monthly`);
    await payOnMockCheckout(page, { name: 'Moritz Monat', email: 'moritz@example.org' });
    await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
  });
});
