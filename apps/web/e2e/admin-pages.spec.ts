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
