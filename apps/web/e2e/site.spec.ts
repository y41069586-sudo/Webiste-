import { expect, test } from '@playwright/test';

const PAGES: [string, RegExp][] = [
  ['/', /Ihre Website ist schon fertig/],
  ['/so-funktionierts', /drei Schritten/],
  ['/preise', /Offene Preise/],
  ['/garantie', /Zufriedenheitsgarantie/],
  ['/beispiele', /So sieht ein Entwurf aus/],
  ['/ueber-mich', /Hallo, (ich bin|hier ist)/],
  ['/kontakt', /Schreiben Sie mir/],
  ['/impressum', /Impressum/],
  ['/datenschutz', /Datenschutz/],
  ['/agb', /AGB|Allgemeine/],
  ['/quellen', /Quellen/],
];

test.describe('Firmen-Website', () => {
  test('alle Seiten laden, eine H1, Navigation, keine Fehler', async ({ page }) => {
    test.setTimeout(240_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const [path, h1] of PAGES) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(h1);
      await expect(page.locator('h1')).toHaveCount(1);
    }
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Preise', exact: true }).click();
    await expect(page).toHaveURL(/\/preise$/);
    expect(errors).toEqual([]);
  });

  test('Preise: Umschalter wechselt den Preis; Vergleich zeigt beide Wege mit Mindestlaufzeit', async ({ page }) => {
    await page.goto('/preise');
    await page.waitForLoadState('networkidle');
    const toggle = page.getByRole('radiogroup', { name: 'Zahlweise' });
    await expect(page.getByText('590 €').first()).toBeVisible();
    await toggle.getByRole('radio', { name: 'Monatlich' }).click();
    await expect(toggle.getByRole('radio', { name: 'Monatlich' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('12 Monate Mindestlaufzeit, erste Rate beim Kauf.')).toBeVisible();
    const table = page.getByRole('table');
    await expect(table).toContainText('12 Monate Mindestlaufzeit');
    await expect(table).toContainText('19 €/Monat');
  });

  test('Beispiele: Karussell, klar als Beispiel gekennzeichnet', async ({ page }) => {
    await page.goto('/beispiele');
    const region = page.getByRole('region', { name: 'Beispiel-Websites je Branche' });
    await expect(region.getByText('Beispiel', { exact: true })).toHaveCount(5);
    await expect(region.getByRole('img').first()).toHaveAttribute('alt', /erfundenen Betrieb/);
  });

  test('Kontaktformular: Pflichtfelder, dann Danke (landet im Support)', async ({ page }) => {
    await page.goto('/kontakt');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Name').fill('Erika Beispiel');
    await page.getByLabel('E-Mail').fill('erika@example.org');
    await page.getByLabel('Nachricht').fill('Wie lange dauert es bis zum Start?');
    await page.getByLabel(/Ich bin einverstanden/).check();
    // Zeitfalle gegen Bots: mindestens 3 Sekunden nach dem Laden
    await page.waitForTimeout(3200);
    await page.getByRole('button', { name: 'Nachricht senden' }).click();
    await expect(page.getByRole('status')).toContainText('Ihre Nachricht ist angekommen');
  });
});

test('Startseite: keine Konsolenfehler (Hydration)', async ({ page }) => {
  const msgs: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') msgs.push(m.text());
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.goto('/preise');
  await page.waitForLoadState('networkidle');
  expect(msgs).toEqual([]);
});
