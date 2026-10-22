import { expect, test } from '@playwright/test';
import { e2eState, loginAsAdmin } from './helpers';

test.describe('Admin-Login', () => {
  test('ohne Session wird auf /login umgeleitet', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('falscher 2FA-Code wird abgelehnt', async ({ page }) => {
    const s = e2eState();
    await page.goto('/login');
    await page.getByLabel('E-Mail').fill(s.email);
    await page.getByLabel('Passwort').fill(s.password);
    await page.getByLabel('2FA-Code').fill('000000');
    await page.getByRole('button', { name: 'Anmelden' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Anmeldung fehlgeschlagen' })).toBeVisible();
  });

  test('Login mit Passwort + TOTP öffnet das Dashboard, Logout beendet die Session', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'Übersicht' })).toBeVisible();
    await expect(page.getByText('DRY_RUN')).toBeVisible();
    await page.getByRole('link', { name: 'Einstellungen' }).click();
    await expect(page.getByRole('heading', { name: 'Einstellungen' })).toBeVisible();
    await page.getByRole('button', { name: 'Abmelden' }).click();
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('Health-Endpoint und robots.txt', async ({ request }) => {
    const h = await request.get('/api/health');
    expect(h.ok()).toBeTruthy();
    const r = await request.get('/robots.txt');
    expect(await r.text()).toContain('Disallow: /d/');
  });
});
