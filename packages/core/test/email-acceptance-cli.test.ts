import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { beforeEach, expect, it } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { customers, leads, orders, outboundEmails } from '../src/db/schema';
import { v4Offer } from '../src/services/offers-v4';
import { resetDb } from './helpers';

const exec = promisify(execFile);
const script = fileURLToPath(new URL('../scripts/email-acceptance.ts', import.meta.url));
const own = 'self@acceptance.test';
beforeEach(resetDb);

async function fixture() {
  const db = getDb();
  await updateConfig({ sender: { email: own }, tax: { operatorConfirmed: false } }, 'test:email');
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: 'email-fixture',
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
      customerEmail: own,
      paidAt: new Date(),
      invoiceJson: { taxNote: null },
      invoiceNumber: 'TEST-1',
      invoicePdfKey: 'invoices/test.pdf',
      billingAddressJson: { street: 'Testweg 1', postalCode: '12345', city: 'Testort', country: 'DE' },
    })
    .returning();
  await db
    .update(orders)
    .set({
      offerSnapshot: v4Offer('care_plus'),
    })
    .where(eq(orders.id, order!.id));
  await db.insert(customers).values({
    orderId: order!.id,
    leadId: lead!.id,
    company: 'Fiktiver Testbetrieb',
    contactName: 'Test',
    email: own,
    accessToken: randomBytes(16).toString('hex'),
  });
  return order!.id;
}

function run(id: string, options: { apply?: boolean; confirm?: string; from?: string } = {}) {
  return exec(process.execPath, ['--import', 'tsx', script, `--order=${id}`, ...(options.apply ? ['--apply'] : [])], {
    env: {
      ...process.env,
      DRY_RUN: 'true',
      APP_URL: 'https://seitenwerkworld.netlify.app',
      EMAIL_PROVIDER: 'mock',
      EMAIL_API_KEY: '',
      EMAIL_FROM: options.from ?? `Self <${own}>`,
      EMAIL_ACCEPTANCE_CONFIRM: options.confirm ?? '',
    },
  });
}

it('checks the real-order fixture without sending, leaking links, or rewriting historic mail state', async () => {
  const id = await fixture();
  await getDb()
    .insert(outboundEmails)
    .values({
      kind: 'invoice',
      idempotencyKey: `invoice:${id}`,
      toEmail: own,
      subject: 'Historischer Mock',
      provider: 'mock',
      status: 'sent',
      orderId: id,
    });
  const result = await run(id);
  expect(JSON.parse(result.stdout)).toMatchObject({ stage: 'fixture_checked', ownRecipient: true, providerCalls: false });
  expect(result.stdout).not.toContain('/onboarding/');
  expect(await getDb().select().from(outboundEmails)).toMatchObject([{ provider: 'mock', status: 'sent', kind: 'invoice' }]);
  expect((await getDb().query.orders.findFirst({ where: eq(orders.id, id) }))?.invoiceSentAt).toBeNull();
});

it('refuses an unconfirmed actual send and a live payment before reaching the provider', async () => {
  const id = await fixture();
  await expect(run(id, { apply: true })).rejects.toThrow(/EMAIL_ACCEPTANCE_CONFIRM/);
  await getDb().update(orders).set({ paymentMode: 'live' }).where(eq(orders.id, id));
  await expect(run(id, { apply: true, confirm: 'own-inbox' })).rejects.toThrow(/fiktive.*Sandbox/);
});

it('refuses any recipient or sender outside the configured own mailbox', async () => {
  const id = await fixture();
  await expect(run(id, { apply: true, confirm: 'own-inbox', from: 'Other <other@acceptance.test>' })).rejects.toThrow(
    /Absender.*Testempfänger/,
  );
  await getDb().update(orders).set({ customerEmail: 'other@acceptance.test' }).where(eq(orders.id, id));
  await expect(run(id, { apply: true, confirm: 'own-inbox' })).rejects.toThrow(/Absender.*Testempfänger/);
  expect(await getDb().select().from(outboundEmails)).toHaveLength(0);
});

it('does not resend the old invoice with an unconfirmed tax claim', async () => {
  const id = await fixture();
  await getDb()
    .update(orders)
    .set({ invoiceJson: { taxNote: '§19 unbestätigt' } })
    .where(eq(orders.id, id));
  await expect(run(id, { apply: true, confirm: 'own-inbox' })).rejects.toThrow(/unbestätigtem Steuerhinweis/);
});

it('refuses a real send without worker credentials instead of recording a mock success', async () => {
  const id = await fixture();
  await expect(run(id, { apply: true, confirm: 'own-inbox' })).rejects.toThrow(/EMAIL_API_KEY fehlt/);
  expect(await getDb().select().from(outboundEmails)).toHaveLength(0);
});
