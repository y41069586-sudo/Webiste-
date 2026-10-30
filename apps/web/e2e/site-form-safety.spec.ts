import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('public form requests cannot select another recipient or enable the internal own-inbox acceptance', async ({ request }) => {
  const response = await request.post(`/api/forms/${'a'.repeat(24)}`, {
    form: {
      name: 'Fiktiver Besucher',
      email: 'visitor@example.test',
      message: 'Bitte einen Termin abstimmen.',
      consent: 'on',
      anliegen: 'Terminanfrage',
      wunsch: 'Dienstag, 10 Uhr',
      to: 'other@example.test',
      acceptance: 'own-inbox',
    },
  });
  expect(response.status()).toBe(404);
  expect(await response.text()).not.toContain('Vielen Dank für Ihre Nachricht');
});

test('real test forwarding requires admin authentication, same origin and the fixed own-inbox command', async ({
  page,
  request,
  baseURL,
}) => {
  const command = { check: 'site_form', confirm: 'own-inbox' };
  const unauthorized = await request.post('/api/admin/integrations', { data: command, headers: { origin: baseURL! } });
  expect(unauthorized.status()).toBe(401);
  await loginAsAdmin(page);
  const crossOrigin = await page.request.post('/api/admin/integrations', {
    data: command,
    headers: { origin: 'https://outside.example.test' },
  });
  expect(crossOrigin.status()).toBe(403);
  const unconfirmed = await page.request.post('/api/admin/integrations', {
    data: { check: 'site_form' },
    headers: { origin: baseURL! },
  });
  expect(unconfirmed.status()).toBe(400);
  const notConfigured = await page.request.post('/api/admin/integrations', { data: command, headers: { origin: baseURL! } });
  expect(notConfigured.status()).toBe(503);
});
