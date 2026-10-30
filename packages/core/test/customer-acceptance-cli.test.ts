import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { customers, leads, orders, sites } from '../src/db/schema';
import { v4Offer } from '../src/services/offers-v4';
import { resetDb } from './helpers';

const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/customer-acceptance.ts', import.meta.url));
const id = 'c7e74a8b-1b06-4809-8680-951b014919e6';
const own = 'own@acceptance.test';
beforeEach(resetDb);
async function fixture() {
  const db = getDb();
  await updateConfig({ sender: { email: own }, switches: { dryRun: true } }, 'test:acceptance');
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: 'customer-acceptance',
      businessName: 'Fiktiver TESTBETRIEB',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Testort',
      segmentKey: 'test',
      trackToken: randomBytes(16).toString('hex'),
    })
    .returning();
  await db
    .insert(orders)
    .values({
      id,
      leadId: lead!.id,
      plan: 'care_plus',
      provider: 'stripe',
      paymentMode: 'test',
      status: 'paid',
      amountCents: 59700,
      netCents: 59700,
      customerEmail: own,
      customerCompany: 'Fiktiver TESTBETRIEB',
      customerName: 'Test',
      offerSnapshot: v4Offer('care_plus', new Date().toISOString()),
      billingAddressJson: { street: 'Testweg 1', postalCode: '12345', city: 'Testort', country: 'DE' },
    });
  const [customer] = await db
    .insert(customers)
    .values({
      orderId: id,
      leadId: lead!.id,
      company: 'Fiktiver TESTBETRIEB',
      contactName: 'Test',
      email: own,
      accessToken: randomBytes(16).toString('hex'),
    })
    .returning();
  await db
    .insert(sites)
    .values({
      customerId: customer!.id,
      templateId: 'handwerk-klar',
      palette: 'werkblau',
      contentJson: {},
      formKey: randomBytes(16).toString('hex'),
      status: 'onboarding',
    });
}
function run(orderId = id, opts: { apply?: boolean; confirm?: string } = {}) {
  return exec(process.execPath, ['--import', 'tsx', script, `--order=${orderId}`, ...(opts.apply ? ['--apply'] : [])], {
    env: {
      ...process.env,
      DRY_RUN: 'true',
      CUSTOMER_ACCEPTANCE_CONFIRM: opts.confirm ?? '',
      NETLIFY_API_TOKEN: '',
      NELITFY_API_TOKEN: '',
      STRIPE_SECRET_KEY: '',
    },
  });
}
it('preflights the exact fictional paid order without APIs, domain writes or billing', async () => {
  await fixture();
  const result = await run();
  expect(JSON.parse(result.stdout)).toMatchObject({ stage: 'fixture_checked', providerCalls: false, tier: 'care_plus' });
  expect((await getDb().query.customers.findFirst({ where: eq(customers.orderId, id) }))?.domain).toBeNull();
  expect((await getDb().query.orders.findFirst({ where: eq(orders.id, id) }))?.billingStartedAt).toBeNull();
});
it('blocks unknown orders and an unconfirmed actual execution', async () => {
  await fixture();
  await expect(run('00000000-0000-0000-0000-000000000000')).rejects.toThrow(/zwei festgelegten/);
  await expect(run(id, { apply: true })).rejects.toThrow(/CUSTOMER_ACCEPTANCE_CONFIRM/);
});
it('blocks live records, external recipients and absent secrets before external side effects', async () => {
  await fixture();
  const db = getDb();
  await db.update(orders).set({ paymentMode: 'live' }).where(eq(orders.id, id));
  await expect(run()).rejects.toThrow(/fiktive Stripe-Testbestellung/);
  await db.update(orders).set({ paymentMode: 'test' }).where(eq(orders.id, id));
  await db.update(customers).set({ email: 'external@acceptance.test' }).where(eq(customers.orderId, id));
  await expect(run()).rejects.toThrow(/eigenem Postfach/);
  await db.update(customers).set({ email: own }).where(eq(customers.orderId, id));
  await expect(run(id, { apply: true, confirm: 'stripe-sandbox-owned-domain' })).rejects.toThrow(/Secrets im Worker/);
  expect((await db.query.customers.findFirst({ where: eq(customers.orderId, id) }))?.domain).toBeNull();
});
