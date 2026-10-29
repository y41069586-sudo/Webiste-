import path from 'node:path';
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { seedPublishedDemo, setOfferVersion } from './seed';

/** Kostenlose Änderung vor dem Kauf: Wunsch auf der Demo → Support → Anpassung im Admin → neuer Stand, gleicher Link. */
const SHOTS = process.env.ADMIN_SHOTS_DIR;

test('Wunsch vor dem Kauf: einreichen, anpassen, gleicher Link zeigt den neuen Stand', async ({ page, browser }) => {
  test.setTimeout(300_000);
  setOfferVersion('v4');
  const demo = seedPublishedDemo({ name: 'Malerbetrieb Wunschtest', branch: 'maler', city: 'Dortmund' });

  // 1) Betrieb schickt einen Wunsch über die Demo
  const visitor = await browser.newPage();
  await visitor.goto(`/d/${demo.slug}`);
  const box = visitor.locator('#wunsch');
  await expect(box).toContainText('Ich passe den Entwurf vorher an');
  if (SHOTS) await box.screenshot({ path: path.join(SHOTS, 'wunsch-formular.png') });
  await box.getByLabel('Name').fill('Max Muster');
  await box.getByLabel('E-Mail für den neuen Stand').fill('max@example.org');
  await box.getByLabel('Ihr Wunsch').fill('Bitte als Überschrift „Frische Farbe für Dortmund“ verwenden.');
  await box.getByLabel(/einverstanden/).check();
  await box.getByRole('button', { name: 'Wunsch kostenlos senden' }).click();
  await expect(visitor.getByRole('heading', { name: 'Danke für Ihren Wunsch' })).toBeVisible();

  // 2) Betreiber sieht den Wunsch im Support und passt die Demo an
  await loginAsAdmin(page);
  await page.goto('/admin/support');
  await page
    .getByRole('link', { name: /Änderungswunsch vor dem Kauf: Malerbetrieb Wunschtest/ })
    .first()
    .click();
  await page.getByRole('link', { name: 'Demo jetzt anpassen' }).click();
  await expect(page.getByText('Frische Farbe für Dortmund', { exact: false }).first()).toBeVisible();
  await page.getByLabel('Überschrift').fill('Frische Farbe für Dortmund');
  await page.getByRole('button', { name: 'Änderung speichern' }).click();
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.locator('#anpassen').innerText();
      },
      { timeout: 90_000, intervals: [2000] },
    )
    .toContain('Gespeichert (Version 1)');
  if (SHOTS) await page.locator('#anpassen').screenshot({ path: path.join(SHOTS, 'wunsch-admin.png') });

  // 3) Derselbe Link zeigt den neuen Stand
  await visitor.goto(`/d/${demo.slug}`);
  await expect(visitor.getByRole('heading', { level: 1 })).toContainText(/Malerbetrieb Wunschtest|Frische Farbe für Dortmund/);
  await expect(visitor.locator('body')).toContainText('Frische Farbe für Dortmund');
});
