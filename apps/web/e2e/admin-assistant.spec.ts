import path from 'node:path';
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

/** Assistent + Live-Fortschritt: Suche per Assistent starten und ihren Verlauf live sehen (Mock-Quelle, echter Worker). */
const SHOTS = process.env.ADMIN_SHOTS_DIR;

test('Assistent startet eine Lead-Suche, die Suche zeigt ihren Fortschritt live', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await loginAsAdmin(page);
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/admin/suche');
  await expect(page.getByRole('heading', { name: 'Lead-Suche' })).toBeVisible();

  await page.getByRole('button', { name: 'Assistent' }).click();
  const panel = page.getByRole('dialog', { name: 'Assistent' });
  await expect(panel.getByText('Was soll ich für dich tun?')).toBeVisible();
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'assistent-leer.png') });

  await panel.getByRole('textbox').fill('Was sind die nächsten Schritte?');
  await panel.getByRole('textbox').press('Enter');
  await expect(panel.getByText('Als Nächstes', { exact: false })).toBeVisible();

  await panel.getByRole('textbox').fill('Starte die Suche in Dortmund ab 0 Punkten');
  await panel.getByRole('textbox').press('Enter');
  const action = panel.locator('.assistant-action').last();
  await expect(action).toContainText('Lead-Suche starten: Dortmund');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'assistent-vorschlag.png') });
  await action.getByRole('button', { name: 'Ausführen' }).click();
  await expect(action).toContainText('Suche ist gestartet');

  await page.keyboard.press('Escape');
  const live = page.locator('.search-live');
  await expect(live).toBeVisible();
  // Mock-Suche ist schnell: am Ende steht der Abschluss mit Protokoll
  await expect(live).toContainText('Letzte Suche abgeschlossen', { timeout: 120_000 });
  await expect(live.locator('.search-live-log li').first()).toBeVisible();
  await expect(live.locator('.search-live-percent')).toHaveText('100%');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'suche-fertig.png'), fullPage: true });

  // Ohne KI-Schlüssel: Datenfragen und Projektwissen
  await page.getByRole('button', { name: 'Assistent' }).click();
  await panel.getByRole('textbox').fill('Wie viele Leads in Dortmund?');
  await panel.getByRole('textbox').press('Enter');
  await expect(panel.locator('.assistant-msg.is-bot').last()).toContainText('Leads (in Dortmund)');
  await expect(panel.locator('.assistant-links').last()).toContainText('Leads');
  await panel.getByRole('textbox').fill('Was kostet die Website für Kunden?');
  await panel.getByRole('textbox').press('Enter');
  await expect(panel.locator('.assistant-msg.is-bot').last()).toContainText('€ einmalig');
  await panel.getByRole('textbox').fill('Zeig die besten Leads');
  await panel.getByRole('textbox').press('Enter');
  await expect(panel.locator('.assistant-msg.is-bot').last()).toContainText('Punkte');
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'assistent-daten.png') });
  expect(errors).toEqual([]);
});
