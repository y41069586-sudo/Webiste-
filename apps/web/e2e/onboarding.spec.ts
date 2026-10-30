import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { payOnMockCheckout } from './helpers';
import { seedPublishedDemo } from './seed';

/** Kleines gültiges PNG für den Logo-Upload. */
function png(w = 60, h = 20): Buffer {
  const table = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = table[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0x30)])));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function buyDemo(page: Page): Promise<string> {
  const demo = seedPublishedDemo();
  await page.goto(`/d/${demo.slug}/uebernehmen?plan=one_time`);
  await payOnMockCheckout(page);
  const link = page.getByRole('link', { name: 'Jetzt Angaben eintragen' });
  await expect(link).toBeVisible();
  const href = (await link.getAttribute('href'))!;
  return href.split('/').pop()!;
}

test.describe('Onboarding bis Go-Live', () => {
  test('Angaben → Vorschau → Änderung → Freigabe → Live-Seite mit Kontaktformular', async ({ page }) => {
    test.setTimeout(240_000);
    const token = await buyDemo(page);
    await page.goto(`/onboarding/${token}`);
    await expect(page.getByRole('heading', { name: 'Ihre Angaben für die Website' })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Logo hochladen (eigenes Formular)
    await page.locator('#logo-datei').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png() });
    await page.getByRole('button', { name: 'Logo hochladen' }).click();
    await expect(page.getByText('Bild gespeichert.')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Ihr Logo' })).toBeVisible();
    // Nach dem Neuladen erst hydrieren lassen, sonst greift die Formularprüfung im Browser nicht
    await page.waitForLoadState('networkidle');

    // Absenden ohne Pflichtangaben → Fehler
    await page.getByRole('button', { name: /Angaben absenden/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'markierten Angaben' })).toBeVisible();

    await page.getByLabel('Rechtsform').selectOption('Einzelunternehmen');
    await page.getByLabel('Telefon', { exact: true }).fill('0231 123456');
    await page
      .getByLabel('Ihre Datenschutzerklärung (Text einfügen)')
      .fill(
        'Datenschutzerklärung\n\n' +
          'Wir verarbeiten personenbezogene Daten nur im Rahmen der gesetzlichen Bestimmungen. '.repeat(8),
      );
    await page.getByLabel(/Ich bestätige, dass die Angaben/).check();
    await page.getByRole('button', { name: 'Zwischenspeichern' }).click();
    await expect(page.getByText('Zwischengespeichert.')).toBeVisible();
    await page.getByLabel(/Ich bestätige, dass die Angaben/).check();
    await page.getByRole('button', { name: /Angaben absenden/ }).click();
    await expect(page.getByRole('heading', { name: /Ihre Angaben sind da/ })).toBeVisible();

    // Vorschau (Worker baut sie)
    await expect(async () => {
      await page.goto(`/preview/${token}`);
      await expect(page.getByRole('heading', { name: 'Vorschau Ihrer Website' })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 90_000 });
    await expect(page.frameLocator('iframe[title="Vorschau Ihrer Website"]').getByLabel('Vorschau')).toBeVisible();
    await expect(page.getByText('Noch 2 von 2 Änderungsrunden')).toBeVisible();

    // Änderungsrunde
    await page.getByLabel('Was soll geändert werden?').fill('Bitte die Überschrift etwas freundlicher formulieren.');
    await page.getByRole('button', { name: 'Änderungswunsch senden' }).click();
    await expect(page.getByRole('heading', { name: /arbeiten Ihre Änderungen ein/ })).toBeVisible();
    await expect(async () => {
      await page.goto(`/preview/${token}`);
      await expect(page.getByText('Noch 1 von 2 Änderungsrunden')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 90_000 });

    // Freigabe → Veröffentlichung (Mock-Registrar/-Hosting) → live
    await page.getByLabel(/Ich habe die Vorschau geprüft/).check();
    await page.getByRole('button', { name: 'Freigeben und veröffentlichen' }).click();
    await expect(page.getByRole('heading', { name: 'Vielen Dank für die Freigabe!' })).toBeVisible();
    let liveUrl = '';
    await expect(async () => {
      await page.goto(`/preview/${token}`);
      await expect(page.getByRole('heading', { name: 'Ihre Website ist online' })).toBeVisible({ timeout: 2_000 });
      liveUrl = (await page.getByRole('link', { name: /mock-hosting/ }).getAttribute('href'))!;
    }).toPass({ timeout: 120_000 });

    // Live-Seite: indexierbar, ohne Banner; der globale Mock-Mailer darf keine Zustellung vortäuschen.
    const res = await page.goto(liveUrl);
    expect(res?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
    await expect(page.getByRole('complementary', { name: 'Hinweis zum Entwurf' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Impressum' }).first().click();
    await expect(page.getByRole('heading', { name: 'Impressum' })).toBeVisible();
    await expect(page.getByText('Angaben gemäß § 5 DDG')).toBeVisible();
    await page.goto(liveUrl);
    await page.getByLabel('Name').fill('Max Muster');
    await page.getByLabel('E-Mail').fill('max@example.net');
    // Branchenformular (L2b): Titel, Zusatzfeld und Knopf hängen von der Branche ab
    const wish = page.locator('#f-wish');
    if (await wish.count()) await wish.fill('Nächste Woche, vormittags');
    await page.getByLabel('Nachricht').fill('Bitte um Rückruf.');
    await page.getByLabel(/Ich bin einverstanden/).check();
    await page.locator('#frage button[type="submit"]').click();
    await expect(page.getByRole('heading', { name: 'Anfrage nicht gesendet' })).toBeVisible();
    await expect(page.locator('main')).toContainText('Ihre Anfrage wurde nicht versendet');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: test.info().outputPath('site-form-unavailable-390.png'), fullPage: true });
    await page.goto(new URL('danke.html', liveUrl).toString());
    await expect(page.locator('main')).toContainText('erst nach ausdrücklicher Bestätigung');
  });
});
