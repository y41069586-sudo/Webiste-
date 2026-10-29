import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('Ablauf zeigt alle Schritte und führt zur Schnellprüfung', async ({ page, request }) => {
  expect((await request.get('/admin/ablauf', { maxRedirects: 0 })).status()).toBe(307);
  await loginAsAdmin(page);
  await page.goto('/admin');
  await page.getByRole('link', { name: 'Ablauf: nächster Schritt' }).click();
  await expect(page.getByRole('heading', { name: 'Ablauf', exact: true })).toBeVisible();
  for (const step of [
    'Betriebe finden',
    'Betriebe prüfen',
    'Demo bauen',
    'Demo prüfen',
    'Brief erstellen',
    'Brief freigeben',
    'Versand',
  ])
    await expect(page.getByRole('heading', { name: step, exact: true })).toBeVisible();
  await expect(page.getByText(/Dein nächster Schritt|Alles erledigt/)).toBeVisible();
  await page.getByRole('link', { name: 'Schnellprüfung starten' }).click();
  await expect(page.getByRole('heading', { name: 'Schnellprüfung' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Passt – speichern/ }).or(page.getByText('Gerade wartet kein Betrieb')),
  ).toBeVisible();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of ['/admin/ablauf', '/admin/ablauf/pruefen']) {
      await page.goto(url);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
    }
  }
});

test('Nächste Demo führt zur ältesten wartenden Demo oder zurück zur Liste', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/ablauf/naechste-demo');
  await expect(page).toHaveURL(/\/admin\/demos(\/[0-9a-f-]{36}\?flow=1|\?fertig=1)$/);
});
