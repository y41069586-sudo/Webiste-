import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { seedPublishedDemo } from './seed';

test('Frage über das Demo-Formular → Entwurf in der Support-Queue → Freigabe', async ({ page }) => {
  test.setTimeout(180_000);
  const demo = seedPublishedDemo();
  await page.goto(`/d/${demo.slug}#frage`);
  await page.waitForTimeout(3200); // Zeitfalle des Spamschutzes
  await page.getByLabel('Name').fill('Support Test');
  await page.getByLabel('E-Mail').fill('support-e2e@example.com');
  await page.getByLabel('Nachricht').fill('Was ist im Paket genau enthalten?');
  await page.getByLabel(/Ich bin einverstanden/).check();
  await page.getByRole('button', { name: 'Nachricht senden' }).click();
  await expect(page.getByRole('heading', { name: 'Danke für Ihre Nachricht' })).toBeVisible();

  await loginAsAdmin(page);
  let link = page.getByRole('link', { name: /Frage zum Entwurf/ }).first();
  await expect(async () => {
    await page.goto('/admin/support?tab=review');
    link = page.getByRole('link', { name: /Frage zum Entwurf/ }).first();
    await expect(link).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await link.click();
  await expect(page.getByLabel(/Entwurf/)).not.toHaveValue('');
  await page.getByRole('button', { name: 'Freigeben und senden' }).click();
  await expect(async () => {
    await page.goto('/admin/support?tab=sent');
    await expect(page.getByRole('link', { name: /Frage zum Entwurf/ }).first()).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
});
