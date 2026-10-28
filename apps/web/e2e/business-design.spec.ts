/** Private styling inputs, isolated fake sources. No image scraping/provider calls. */
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { seedPublishedDemo } from './seed';
import { loginAsAdmin } from './helpers';
test('design sources require admin + same-origin; saving does not replace an existing demo', async ({
  page,
  request,
  baseURL,
}) => {
  const demo = seedPublishedDemo({ name: 'Fiktives Café für Stilprüfung', branch: 'cafe', city: 'Testort' });
  const path = `/admin/leads/${demo.leadId}/design`;
  const anonymous = await request.post(path, { multipart: { sourceRef: 'https://source.example.test' }, maxRedirects: 0 });
  // Ohne Sitzung: die Route selbst lehnt ab (kein vorgeschalteter Proxy mehr)
  expect(anonymous.status()).toBe(401);
  expect(
    (
      await request.post(path, { headers: { cookie: 'wbm_admin=invalid' }, maxRedirects: 0, multipart: { notes: 'bad' } })
    ).status(),
  ).toBe(401);
  await loginAsAdmin(page);
  expect(
    (
      await page.request.post(path, { headers: { origin: 'https://foreign.example.test' }, multipart: { notes: 'bad' } })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post(path, {
        headers: { origin: baseURL! },
        multipart: { sourceRef: 'https://source.example.test/permission', sourceKind: 'owner_provided', notes: 'warm' },
      })
    ).status(),
  ).toBe(400);
  const before = await page.request.get(`/d/${demo.slug}`);
  const original = await before.text();
  expect(before.headers()['content-security-policy']).toContain('font-src data:');
  const saved = await page.request.post(path, {
    headers: { origin: baseURL! },
    multipart: {
      sourceRef: 'https://source.example.test/permission',
      sourceKind: 'owner_provided',
      notes: 'Warme Hölzer, zurückhaltende Typografie.',
      analysisPermission: 'on',
      description: 'Fiktive Bildreferenz',
      photos: {
        name: 'reference.jpg',
        mimeType: 'image/jpeg',
        buffer: readFileSync('../../packages/templates/assets/images/beauty/barber-werkzeug.jpg'),
      },
    },
    maxRedirects: 0,
  });
  expect(saved.status()).toBe(303);
  await page.goto(`/admin/leads/${demo.leadId}`);
  await expect(page.getByText(/nur Gestaltungsauswertung, keine Bildübernahme/)).toBeVisible();
  await page.getByText('Gespeicherte Referenz prüfen', { exact: true }).click();
  const photo = page.getByAltText('Fiktive Bildreferenz');
  await expect(photo).toBeVisible();
  const src = (await photo.getAttribute('src'))!;
  expect((await page.request.get(src)).status()).toBe(200);
  expect((await request.get(src, { maxRedirects: 0 })).status()).toBe(401);
  expect(await (await page.request.get(`/d/${demo.slug}`)).text()).toBe(original);
});
