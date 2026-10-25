import { expect, test } from '@playwright/test';
import { setOfferVersion } from './seed';

const PAGES: [string, RegExp][] = [
  ['/', /Erst sehen.*Dann entscheiden/s],
  ['/so-funktionierts', /drei Schritten/],
  ['/preise', /Zwei Tarife/],
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
      const legal = page.getByRole('navigation', { name: 'Rechtliches' });
      for (const [label, href] of [
        ['Impressum', '/impressum'],
        ['Datenschutz', '/datenschutz'],
        ['AGB', '/agb'],
      ])
        await expect(legal.getByRole('link', { name: label, exact: true })).toHaveAttribute('href', href!);
    }
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name: 'Preise', exact: true }).click();
    await expect(page).toHaveURL(/\/preise$/);
    expect(errors).toEqual([]);
  });

  test('Preise: öffentliche V4-Tarife bleiben auch mit gespeicherter Legacy-Konfiguration aktuell', async ({ page }) => {
    setOfferVersion('legacy');
    await page.goto('/preise');
    await page.waitForLoadState('networkidle');
    const tariffs = page.getByRole('region', { name: 'Tarife' });
    await expect(tariffs.getByRole('heading', { name: 'SeitenWerk Basis', exact: true })).toBeVisible();
    await expect(tariffs.getByRole('heading', { name: 'SeitenWerk Care+', exact: true })).toBeVisible();
    await expect(tariffs).toContainText('597 €');
    await expect(tariffs).toContainText('19 €/Monat insgesamt ab Go-Live');
    await expect(tariffs).toContainText('99 €/Monat insgesamt ab Go-Live');
    for (const route of ['/', '/preise', '/agb', '/garantie']) {
      await page.goto(route);
      await expect(page.locator('main')).not.toContainText(/49\s*€|590\s*€/);
    }
  });

  test('Startseite: ruhige Produktvorschau und tatsächlich ansehbare Muster', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Erst sehen.*Dann entscheiden/s);
    await expect(page.locator('.site-example-stage img')).toBeVisible();
    await page.getByRole('link', { name: 'Musterwebsite für Handwerk ansehen' }).click();
    await expect(page.getByText('Fiktive Musterwebsite von SeitenWerk.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Zurück zu SeitenWerk' })).toBeVisible();
  });

  test('Beispiele: fünf erfundene Musterbetriebe, klar gekennzeichnet', async ({ page }) => {
    await page.goto('/beispiele');
    const list = page.getByRole('list', { name: 'Beispiel-Websites je Branche' });
    await expect(list.getByRole('listitem')).toHaveCount(5);
    await expect(list.getByText('Beispiel', { exact: true })).toHaveCount(5);
    await expect(list.getByRole('img').first()).toHaveAttribute('alt', /erfundenen Betrieb/);
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
