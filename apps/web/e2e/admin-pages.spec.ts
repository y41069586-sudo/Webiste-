import { expect, test } from '@playwright/test';
import { seedPendingDemo } from './seed';
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
    ['/admin/funnel', 'Funnel'],
    ['/admin/optimizer', 'Optimizer'],
    ['/admin/variants', 'Varianten-Labor'],
    ['/admin/learning', 'Lern-Agent'],
    ['/admin/objections', 'Einwände'],
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
  // Power-Rechner (B6.3)
  await page.goto('/admin/optimizer?p1=2&p2=3&proWoche=20');
  await expect(page.getByText(/Briefe pro Variante/)).toBeVisible();
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

test('Qualitätsfreigabe: keine voreingestellten Noten, schwaches Design blockiert, Einzelprüfung gibt frei', async ({ page }) => {
  test.setTimeout(180_000);
  const demo = seedPendingDemo();
  await loginAsAdmin(page);
  await page.goto(`/admin/demos/${demo.demoId}`);
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Freigeben & veröffentlichen', exact: true }) });
  const fillReview = async (design: string) => {
    for (const key of ['facts', 'desktop', 'mobile', 'images', 'text']) await form.locator(`input[name="${key}"]`).check();
    // Explicitly simulated human ratings for an isolated fictional fixture, never actual business metrics.
    for (const key of ['design', 'industry', 'personalization', 'images', 'mobile'])
      await form.locator(`input[name="quality_${key}"]`).fill(key === 'design' ? design : '90');
  };
  await expect(form.locator('input[name="quality_design"]')).toHaveValue('');
  await fillReview('0');
  await form.getByRole('button', { name: 'Freigeben & veröffentlichen', exact: true }).click();
  await expect(page.getByText('Qualitätsbewertung unvollständig oder unter Mindestniveau.', { exact: false })).toBeVisible();
  await expect(form).toBeVisible();
  await fillReview('90');
  await form.getByRole('button', { name: 'Freigeben & veröffentlichen', exact: true }).click();
  await expect(page.getByText(/^(approved|published)$/).first()).toBeVisible();
  await expect(form).toHaveCount(0);
  await expect(page.getByText('Qualitätsbewertung unvollständig oder unter Mindestniveau.', { exact: false })).toHaveCount(0);
});
