import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { customers, leads, orders, sites } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { resetDb } from './helpers';

const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/hosting-acceptance.ts', import.meta.url));
const email = 'self@hosting-acceptance.test';
beforeEach(resetDb);

async function fixture() {
  const db = getDb();
  await updateConfig({ sender: { email } }, 'test:hosting');
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: 'hosting-fixture',
      businessName: 'Fiktiver Testbetrieb',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Testort',
      segmentKey: 'test',
      trackToken: randomBytes(16).toString('hex'),
    })
    .returning();
  const [order] = await db
    .insert(orders)
    .values({
      leadId: lead!.id,
      provider: 'stripe',
      paymentMode: 'test',
      status: 'paid',
      amountCents: 59700,
      netCents: 59700,
      customerCompany: 'Fiktiver Testbetrieb',
      customerName: 'Test',
      customerEmail: email,
      billingAddressJson: { street: 'Testweg 1', postalCode: '12345', city: 'Testort', country: 'DE' },
    })
    .returning();
  const token = randomBytes(16).toString('hex');
  const [customer] = await db
    .insert(customers)
    .values({
      orderId: order!.id,
      leadId: lead!.id,
      company: 'Fiktiver Testbetrieb',
      contactName: 'Test',
      email,
      accessToken: token,
    })
    .returning();
  const key = `sites/${order!.id}/hosting-preview.html`;
  const [site] = await db
    .insert(sites)
    .values({
      customerId: customer!.id,
      templateId: 'handwerk-klar',
      palette: 'werkblau',
      contentJson: {},
      formKey: token,
      status: 'preview',
      onboardingSubmittedAt: new Date(),
      previewHtmlKey: key,
    })
    .returning();
  await getProviders().storage.put(
    key,
    '<!DOCTYPE html><html lang="de"><head><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fiktiver Test</title></head><body><h1>Fiktiver Testbetrieb</h1><form><button type="submit" disabled>Test</button></form></body></html>',
  );
  return { order: order!, site: site!, token, key };
}

function run(id: string, apply = false) {
  return exec(process.execPath, ['--import', 'tsx', script, `--order=${id}`, ...(apply ? ['--apply'] : [])], {
    env: { ...process.env, NETLIFY_API_TOKEN: 'hosting_fixture_token', HOSTING_ACCEPTANCE_CONFIRM: '' },
  });
}

it('checks an inert fictional preview without external calls or changing customer publication', async () => {
  const f = await fixture();
  const result = await run(f.order.id);
  expect(JSON.parse(result.stdout)).toMatchObject({ stage: 'fixture_checked', providerCalls: false });
  expect(result.stdout).not.toContain('hosting_fixture_token');
  expect((await getDb().query.sites.findFirst({ where: eq(sites.id, f.site.id) }))?.status).toBe('preview');
});

it('refuses unconfirmed apply and real-payment records before reaching hosting', async () => {
  const f = await fixture();
  await expect(run(f.order.id, true)).rejects.toThrow(/HOSTING_ACCEPTANCE_CONFIRM/);
  await getDb().update(orders).set({ paymentMode: 'live' }).where(eq(orders.id, f.order.id));
  await expect(run(f.order.id)).rejects.toThrow(/fiktive.*Sandbox/);
});

it('refuses private customer tokens inside the page', async () => {
  const f = await fixture();
  await getProviders().storage.put(f.key, `<html>fiktiv <a href="/preview/${f.token}">Privat</a></html>`);
  await expect(run(f.order.id)).rejects.toThrow(/Private Zugangslinks/);
});
