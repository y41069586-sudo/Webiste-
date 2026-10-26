import { mkdirSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { seedPublishedDemo, setOfferVersion } from './seed';

test('private research form updates campaign eligibility without rewriting the existing demo', async ({ page, request }) => {
  setOfferVersion('v4');
  const demo = seedPublishedDemo({
    name: 'Fiktiver Fliesenbetrieb für Recherchetest',
    branch: 'fliesenleger',
    city: 'Fiktivstadt',
  });
  const url = `/admin/leads/${demo.leadId}`;
  expect((await request.get(url, { maxRedirects: 0 })).status()).toBe(307);
  await loginAsAdmin(page);
  await page.goto(url);
  await expect(page.getByRole('heading', { name: 'Akquise-Eignung: Recherche vor Briefversand' })).toBeVisible();
  await expect(page.getByText('Geschäftsalter unbekannt.', { exact: false })).toBeVisible();
  await page.getByText('Recherche prüfen oder ergänzen', { exact: true }).click();
  await page.locator('[name=websiteResult]').selectOption('not_found');
  await page.locator('[name=websiteSource]').fill('review:explicit-fictional-search');
  for (const method of ['name_city', 'phone', 'directory_links', 'profile_links']) await page.locator(`[name=${method}]`).check();
  const signals = [
    ['operational', 'Aktiver fiktiver Testbetrieb'],
    ['address', 'Anschrift im Testprofil geprüft'],
    ['independent', 'Eigenständiger fiktiver Betrieb'],
    ['private_clients', 'Privatkundenangebot bestätigt'],
    ['service', 'Badsanierung'],
    ['service_advertising', 'Aktuelle Werbung im fiktiven Profil'],
  ];
  for (const [i, [kind, text]] of signals.entries()) {
    await page.locator(`[name=kind${i}]`).selectOption(kind!);
    await page.locator(`[name=text${i}]`).fill(text!);
    await page.locator(`[name=source${i}]`).fill('review:explicit-fictional-source');
    await page.locator(`[name=verified${i}]`).check();
  }
  await page.locator('[name=lawfulUse]').check();
  const original = await (await page.request.get(`/d/${demo.slug}`)).text();
  await page.getByRole('button', { name: 'Recherche und Eignung speichern' }).click();
  await expect(page.getByText('Belegte Eignung, noch keine Versandfreigabe', { exact: false })).toBeVisible();
  expect(await (await page.request.get(`/d/${demo.slug}`)).text()).toBe(original);
  const summary = page.getByText('Recherche prüfen oder ergänzen', { exact: true });
  if (await summary.locator('..').evaluate((el) => (el as HTMLDetailsElement).open)) await summary.click();
  mkdirSync('../../docs/acquisition-priorities/evidence', { recursive: true });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `../../docs/acquisition-priorities/evidence/admin-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  }
  // Removing the sole intent signal must visibly withdraw readiness.
  await page.getByText('Recherche prüfen oder ergänzen', { exact: true }).click();
  await page.locator('[name=text5]').fill('');
  await page.locator('[name=lawfulUse]').check();
  await page.getByRole('button', { name: 'Recherche und Eignung speichern' }).click();
  await expect(page.getByText(/Kein belegtes Akquisesignal/).first()).toBeVisible();
  setOfferVersion('legacy');
});
