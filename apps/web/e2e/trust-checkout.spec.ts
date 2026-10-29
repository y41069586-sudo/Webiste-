/** Task 3: isolated browser acceptance. All provider actions are explicit mocks, not Stripe evidence. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { seedPublishedDemo, setOfferVersion } from './seed';
import { payOnMockCheckout } from './helpers';
import { measureTrustPages } from './trust-performance';

const out = path.resolve(process.env.QUALITY_EXPORT_DIR ?? '../../data/exports/task3-checkout/after');
const profiles = [
  ['Maleratelier Nordlicht – fiktiver Testbetrieb', 'maler', 'Teststadt'],
  ['Elektro Nordlicht – fiktiver Testbetrieb', 'elektriker', 'Beispielort'],
  ['Objektpflege Klarraum – fiktiver Testbetrieb', 'reinigung', 'Teststadt'],
  ['Fliesenatelier Fuge – fiktiver Testbetrieb', 'fliesenleger', 'Beispielort'],
  ['Restaurant Kleine Küche – fiktiver Testbetrieb', 'restaurant', 'Teststadt'],
  ['Café Morgenlicht – fiktiver Testbetrieb', 'cafe', 'Beispielort'],
  ['Blumen & Zweige – fiktiver Testbetrieb', 'blumenladen', 'Teststadt'],
  ['Modeatelier Lindenhof – fiktiver Testbetrieb', 'modegeschaeft', 'Beispielort'],
  ['Yoga Bewegungsraum – fiktiver Testbetrieb', 'yogastudio', 'Teststadt'],
  ['Tanzschule Rhythmus & Raum – fiktiver Testbetrieb', 'tanzschule', 'Beispielort'],
];
const results: Record<string, unknown>[] = [];
test.beforeAll(async () => {
  setOfferVersion('v4');
  mkdirSync(out, { recursive: true });
  await new Promise((r) => setTimeout(r, 3100));
});
test.afterAll(() => {
  writeFileSync(
    path.join(out, 'journeys.json'),
    JSON.stringify({ scope: 'local mock providers; no Stripe test payment', results }, null, 2),
  );
});
for (const [index, [name, branch, city]] of profiles.entries()) {
  test(`${index + 1}: ${branch} – Demo bis Rechnung und Onboarding`, async ({ page, browser, baseURL }) => {
    test.setTimeout(300000);
    // Distinct fictional visitors (RFC5737 TEST-NET); keep the real ten/hour abuse limit enabled.
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': `192.0.2.${index + 1}` });
    const id = String(index + 1).padStart(2, '0');
    const plan = index % 2 === 0 ? 'Basis' : 'Care+';
    const demo = seedPublishedDemo({ name: name!, branch: branch!, city: city! });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    // Actual short-URL/QR routing, no public marketing detour.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/q/${demo.trackToken}`);
    await expect(page).toHaveURL(new RegExp(`/d/${demo.slug}$`));
    await expect(page.getByText(name!, { exact: true }).first()).toBeVisible();
    await expect(page.locator('.sw-demo-context')).toContainText('nicht die offizielle Website');
    for (const width of [320, 360, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${branch} overflow at ${width}`,
      ).toBe(true);
      expect(await page.locator('.sw-demo-buy').evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
      if (width === 390 || width === 1440)
        await page.screenshot({ path: path.join(out, `${id}-demo-${width}.jpg`), fullPage: true, type: 'jpeg', quality: 82 });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.sw-demo-buy').click();
    await expect(page).toHaveURL(/#uebernehmen$/);
    const offer = page.locator('#uebernehmen');
    await expect(offer).toContainText('Was Sie beauftragen');
    await expect(offer).toContainText('597 €');
    // Einmalpreis und Monatsbetrag gleich deutlich, dazu die Summe des ersten Jahres
    await expect(offer).toContainText(/\+ 19\s*€\s*pro Monat, erst ab Go-Live/);
    await expect(offer).toContainText(/\+ 99\s*€\s*pro Monat, erst ab Go-Live/);
    expect(await offer.innerText()).not.toMatch(/590\s*€|49\s*€|hallo@example\.com/);
    await offer.screenshot({
      path: path.join(out, `${id}-angebot-390.jpg`),
      type: 'jpeg',
      quality: 86,
      style: '.sw-demo-toolbar { visibility:hidden }',
    });
    await offer.getByRole('link', { name: `Mit ${plan} übernehmen`, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Testzahlung' })).toBeVisible();
    await expect(page.getByText('Testmodus – simuliert Stripe Checkout, keine echte Zahlung')).toBeVisible();
    await page.screenshot({ path: path.join(out, `${id}-checkout-390.jpg`), fullPage: true, type: 'jpeg', quality: 85 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (index === 0) {
      await payOnMockCheckout(page, { outcome: 'Abbrechen' });
      await expect(page).toHaveURL(new RegExp(`/d/${demo.slug}\\?abgebrochen=1&plan=basis#uebernehmen`));
      await expect(page.getByRole('status')).toContainText('Zuletzt gewählter Tarif: Basis');
      await page.screenshot({ path: path.join(out, '01-abbruch.jpg'), fullPage: false, type: 'jpeg' });
      await page.getByRole('link', { name: 'Mit Basis übernehmen', exact: true }).click();
    }
    if (index === 0) {
      const measured = await measureTrustPages(
        browser,
        baseURL!,
        [
          { label: 'demo', url: `/d/${demo.slug}` },
          { label: 'startseite', url: '/' },
          { label: 'preise', url: '/preise' },
          { label: 'checkout-mock', url: page.url() },
        ],
        out,
      );
      expect(
        measured.every(
          (row) => row.status === 200 && !row.horizontalOverflow && row.brokenImages === 0 && row.errors.length === 0,
        ),
      ).toBe(true);
    }
    await payOnMockCheckout(page, { email: `task3-${id}@example.test`, domain: `task3-test-${id}.de` });
    await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
    await expect(page.getByText(/Die Zahlung ist eingegangen/)).toContainText('Rechnung');
    await page.screenshot({ path: path.join(out, `${id}-bestaetigung.jpg`), fullPage: true, type: 'jpeg', quality: 85 });
    const success = page.url();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Vielen Dank für Ihre Bestellung!' })).toBeVisible();
    await page.getByRole('link', { name: 'Jetzt Angaben eintragen' }).click();
    await expect(page.getByLabel('Rechtsform')).toBeVisible();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(out, `${id}-onboarding.jpg`), fullPage: true, type: 'jpeg', quality: 82 });
    expect(errors).toEqual([]);
    results.push({
      id,
      branch,
      name,
      plan,
      slug: demo.slug,
      successReturn: success.includes('/erfolg?'),
      widths: [320, 360, 390, 430, 1440],
      paidReturn: true,
      invoiceAssigned: true,
      onboarding: true,
      simulation: true,
    });
    writeFileSync(
      path.join(out, 'journeys.json'),
      JSON.stringify({ scope: 'local mock providers; no Stripe test payment', results }, null, 2),
    );
  });
}
