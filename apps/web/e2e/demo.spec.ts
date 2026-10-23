import { expect, test } from '@playwright/test';
import { seedPublishedDemo } from './seed';

test.describe('Demo: Ansicht, Frage, Opt-out', () => {
  test('QR → Demo mit Banner, nicht indexierbar; Frage senden; Kein Interesse löscht alles', async ({ page, request }) => {
    const demo = seedPublishedDemo();

    // QR-Scan leitet per 302 auf die Demo
    const scan = await request.get(`/q/${demo.trackToken}`, { maxRedirects: 0 });
    expect(scan.status()).toBe(302);
    expect(scan.headers()['location']).toContain(`/d/${demo.slug}`);

    // Demo: noindex (Header + Meta), Banner mit drei Aktionen
    const res = await page.goto(`/q/${demo.trackToken}`);
    expect(page.url()).toContain(`/d/${demo.slug}`);
    expect(res?.headers()['x-robots-tag']).toContain('noindex');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const banner = page.getByRole('complementary', { name: 'Hinweis zum Entwurf' });
    await expect(banner).toContainText('Unverbindlicher Entwurf');
    await expect(banner.getByRole('link', { name: /übernehmen/ })).toBeVisible();
    await expect(page.getByText('hat diese Seite nicht beauftragt')).toBeVisible();
    await expect(page.getByText('Beispiel-Leistungen')).toBeVisible();

    // Frage stellen → Formular an uns
    await banner.getByRole('link', { name: 'Frage stellen' }).click();
    await expect(page.getByRole('heading', { name: 'Frage zu diesem Entwurf' })).toBeVisible();
    await page.waitForTimeout(3200); // Zeitfalle des Spamschutzes
    await page.getByLabel('Name').fill('E2E Tester');
    await page.getByLabel('E-Mail').fill('e2e@example.com');
    await page.getByLabel('Nachricht').fill('Was kostet eine Anpassung der Farben?');
    await page.getByLabel(/Ich bin einverstanden/).check();
    await page.getByRole('button', { name: 'Nachricht senden' }).click();
    await expect(page.getByRole('heading', { name: 'Danke für Ihre Nachricht' })).toBeVisible();

    // Kein Interesse → sofortiger Widerspruch
    await page.goto(`/d/${demo.slug}`);
    await page
      .getByRole('complementary', { name: 'Hinweis zum Entwurf' })
      .getByRole('button', { name: 'Kein Interesse' })
      .click();
    await expect(page.getByRole('heading', { name: /wir schreiben Ihnen nicht mehr/ })).toBeVisible();

    // Danach: Demo und QR liefern 410
    expect((await request.get(`/d/${demo.slug}`)).status()).toBe(410);
    expect((await request.get(`/q/${demo.trackToken}`, { maxRedirects: 0 })).status()).toBe(410);
  });

  test('robots.txt sperrt /d/ und /q/', async ({ request }) => {
    const txt = await (await request.get('/robots.txt')).text();
    expect(txt).toContain('Disallow: /d/');
    expect(txt).toContain('Disallow: /q/');
  });

  test('unbekannter Slug → 404, ungültiger Token → 404', async ({ request }) => {
    expect((await request.get('/d/abcdefghijklmnopqrstuvwxyz')).status()).toBe(404);
    expect((await request.get('/q/xxxxxxxxxxxxxxxxxxxxxxxx', { maxRedirects: 0 })).status()).toBe(404);
  });
});
