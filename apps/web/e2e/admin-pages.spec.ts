import { expect, test } from '@playwright/test';
import { seedPendingDemo } from './seed';
import { loginAsAdmin } from './helpers';

test('alle Admin-Seiten laden ohne Fehler', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await loginAsAdmin(page);
  const pages: [string, string][] = [
    ['/admin', 'Guten|Gute Nacht'],
    ['/admin/kpis', 'Kennzahlen'],
    ['/admin/leads', 'Alle Betriebe'],
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
    ['/admin/support', 'Nachrichten'],
    ['/admin/budget', 'Budget'],
    ['/admin/reports', 'Wochenberichte'],
    ['/admin/jobs', 'Hintergrund'],
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

test('Qualitätsfreigabe: keine voreingestellte Note, schwache Demo blockiert, Einzelprüfung gibt frei', async ({ page }) => {
  test.setTimeout(180_000);
  const demo = seedPendingDemo();
  await loginAsAdmin(page);
  await page.goto(`/admin/demos/${demo.demoId}`);
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Freigeben – geht online', exact: true }) });
  // Keine Note ist vorausgewählt
  for (const name of ['Sehr gut', 'Gut', 'Nicht gut genug'])
    await expect(form.getByRole('radio', { name, exact: true })).not.toBeChecked();
  const fillReview = async (rating: string) => {
    await form.getByRole('checkbox', { name: /Am Computer und am Handy/ }).check();
    await form.getByRole('checkbox', { name: /Name, Adresse, Bilder/ }).check();
    // Explicitly simulated human rating for an isolated fictional fixture.
    await form.getByText(rating, { exact: true }).click();
  };
  await fillReview('Nicht gut genug');
  await form.getByRole('button', { name: 'Freigeben – geht online', exact: true }).click();
  await expect(page.getByText('Noch nicht freigegeben', { exact: false })).toBeVisible();
  await expect(form).toBeVisible();
  await fillReview('Sehr gut');
  await form.getByRole('button', { name: 'Freigeben – geht online', exact: true }).click();
  await expect(page.getByText(/^(Freigegeben|Online)/).first()).toBeVisible();
  await expect(form).toHaveCount(0);
  await expect(page.getByText('Noch nicht freigegeben', { exact: false })).toHaveCount(0);
});
