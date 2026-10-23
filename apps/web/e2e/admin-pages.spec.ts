import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('alle Admin-Seiten laden ohne Fehler', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await loginAsAdmin(page);
  const pages: [string, string][] = [
    ['/admin', 'Übersicht'],
    ['/admin/kpis', 'Kennzahlen'],
    ['/admin/leads', 'Leads'],
    ['/admin/demos', 'Demos'],
    ['/admin/letters', 'Briefe'],
    ['/admin/claims', 'Claims'],
    ['/admin/orders', 'Bestellungen'],
    ['/admin/customers', 'Kunden & Seiten'],
    ['/admin/support', 'Support'],
    ['/admin/budget', 'Budget'],
    ['/admin/reports', 'Wochenberichte'],
    ['/admin/jobs', 'Jobs'],
    ['/admin/settings', 'Einstellungen'],
    ['/admin/audit', 'Audit'],
    ['/admin/outbox', 'Postausgang'],
  ];
  for (const [path, heading] of pages) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole('heading', { level: 1, name: new RegExp(heading) })).toBeVisible();
  }
  await page.goto('/admin/kpis?von=2026-01-01&bis=2026-12-31&branche=maler');
  await expect(page.getByText('Nach Segment')).toBeVisible();
  expect(errors).toEqual([]);
});

test('Claims: Freigabe nur mit Bestätigung, gesperrte Quellen ohne Button', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/claims');
  const card = page.locator('[data-claim-id="HANDWERK_DIGITAL_ATTRAKTIVER"]');
  await expect(card.getByText('wartet auf Freigabe')).toBeVisible();
  await card.getByLabel(/selbst geprüft/).check();
  await card.getByRole('button', { name: 'Freigeben' }).click();
  await expect(card.getByText('freigegeben', { exact: true })).toBeVisible();
  // abgelaufene Gastro-Quelle: kein Freigabe-Button, Begründung sichtbar
  const gastro = page.locator('[data-claim-id="GASTRO_SPEISEKARTE_ONLINE"]');
  await expect(gastro.getByText(/Quelle älter als 24 Monate/).first()).toBeVisible();
  await expect(gastro.getByRole('button', { name: 'Freigeben' })).toHaveCount(0);
  // zurücksetzen, damit weitere Läufe denselben Ausgangszustand sehen
  await card.getByRole('button', { name: 'Sperren' }).click();
  await card.getByRole('button', { name: 'Sperre aufheben' }).click();
  await expect(card.getByText('wartet auf Freigabe')).toBeVisible();
});
