import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

/**
 * Screenshots der Admin-Oberfläche (iPad quer 1180 × 820, iPad hoch 820 × 1180, Desktop 1440 × 900).
 * Nur mit ADMIN_SHOTS_DIR=<ordner>.
 */
const DIR = process.env.ADMIN_SHOTS_DIR;
const PAGES = [
  '/admin',
  '/admin/suche',
  '/admin/settings',
  '/admin/settings?bereich=letter',
  '/admin/leads',
  '/admin/letters',
  '/admin/demos',
  '/admin/jobs',
];
const SIZES = [
  ['ipad-quer', 1180, 820],
  ['ipad-hoch', 820, 1180],
  ['desktop', 1440, 900],
] as const;

test.describe('Admin-Screenshots', () => {
  test.skip(!DIR, 'nur mit ADMIN_SHOTS_DIR');

  test('Admin-Seiten auf iPad und Desktop', async ({ page }) => {
    test.setTimeout(900_000);
    mkdirSync(DIR!, { recursive: true });
    await loginAsAdmin(page);
    for (const [label, width, height] of SIZES) {
      await page.setViewportSize({ width, height });
      for (const p of PAGES) {
        await page.goto(p);
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        const file = `${p.replace(/^\/admin\/?/, '').replace(/[^a-z0-9]+/gi, '-') || 'uebersicht'}-${label}.png`;
        await page.screenshot({ path: path.join(DIR!, file), fullPage: true });
      }
    }
  });
});
