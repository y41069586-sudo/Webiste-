import { eq } from 'drizzle-orm';
import { expect } from 'vitest';
import { getDb } from '../src/db/client';
import { customers, demos, leads, orders, sites } from '../src/db/schema';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { startHostedCheckout, simulateMockPayment, processPaymentWebhook } from '../src/services/orders';
import { getProviders } from '../src/providers';
import type { MockPayment } from '../src/providers/mock/payment';
const meta = { ua: 'fixture/browser', ipHash: 'v4-fixture', isBot: false };
export async function buy(tier: 'basis' | 'care_plus') {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Testbetrieb',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Beispielstadt',
      street: 'Musterweg',
      houseNumber: '1',
      postalCode: '12345',
      segmentKey: 'test:handwerk:maler',
      trackToken: randomToken(24),
      status: 'cta_clicked',
    })
    .returning();
  const [demo] = await db
    .insert(demos)
    .values({
      leadId: lead!.id,
      slug: randomToken(24),
      templateId: 'handwerk-solid',
      palette: 'werkblau',
      status: 'published',
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
    })
    .returning();
  const result = await startHostedCheckout(demo!.slug, tier, meta);
  if (!result.ok) throw new Error(result.error);
  const pending = (await db.query.orders.findFirst({ where: eq(orders.id, result.orderId) }))!;
  expect(pending.offerSnapshot?.consentAt).toBeNull();
  await simulateMockPayment(pending.stripeSessionId!, 'paid', {
    businessName: 'Testbetrieb',
    name: 'Erika Beispiel',
    email: 'fixture@example.test',
    address: { line1: 'Musterweg 1', postalCode: '12345', city: 'Beispielstadt', country: 'DE' },
    customFields: { wunschdomain: 'fixture-beispiel.de', unternehmer: 'ja', agb: 'ja' },
  });
  const order = (await db.query.orders.findFirst({ where: eq(orders.id, result.orderId) }))!;
  const customer = (await db.query.customers.findFirst({ where: eq(customers.orderId, order.id) }))!;
  return { order, customer };
}
export async function live(customerId: string) {
  const db = getDb();
  const existing = await db.query.sites.findFirst({ where: eq(sites.customerId, customerId) });
  if (existing)
    return db
      .update(sites)
      .set({ status: 'live', liveAt: new Date(Date.now() - 1000) })
      .where(eq(sites.id, existing.id));
  return db.insert(sites).values({
    customerId,
    templateId: 'handwerk-solid',
    palette: 'werkblau',
    contentJson: {},
    formKey: randomToken(24),
    formTargetEmail: 'fixture@example.test',
    status: 'live',
    liveAt: new Date(Date.now() - 1000),
  });
}
export async function webhook(event: Record<string, unknown>) {
  const raw = JSON.stringify(event);
  return processPaymentWebhook(raw, (getProviders().payment as MockPayment).sign(raw));
}
