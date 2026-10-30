import { expect, it, beforeEach } from 'vitest';
import { getDb } from '../src/db/client';
import { auditLog, customers, demos, leads, orders, sites } from '../src/db/schema';
import { resetDb } from './helpers';
import { personalizedLetterCopy } from '../src/letters/personalization';
import { devicePresentation } from '../src/render/screenshots';
import { realizedFinanceV4 } from '../src/services/finance-v4';
import { operationalFunnelV4 } from '../src/services/funnel-v4';
beforeEach(resetDb);
it('requires reviewed details and keeps unverified claims out', () => {
  expect(() => personalizedLetterCopy({ businessName: 'Test', city: 'Testort', branchLabel: 'Maler', details: [] })).toThrow(
    /belegt/,
  );
  const p = personalizedLetterCopy({
    businessName: 'Test',
    city: 'Testort',
    branchLabel: 'Maler',
    details: [
      { text: 'Fassaden', verified: true, source: 'test:owner' },
      { text: 'Bester Betrieb', verified: false, source: 'guess' },
    ],
  });
  expect(p.intro.join()).toContain('Fassaden');
  expect(p.intro.join()).not.toContain('Bester');
});
it('falls back for a narrow print area instead of certifying tiny mockups', () => {
  expect(devicePresentation({ businessName: 'Test', printWidthMm: 96 }).mode).toBe('clear');
  expect(devicePresentation({ businessName: 'Test', printWidthMm: 165 }).mode).toBe('minimal');
});
it('separates live revenue from test, mock and unknown records', async () => {
  for (const paymentMode of ['live', 'test', 'mock', 'unknown'] as const) {
    const [order] = await getDb()
      .insert(orders)
      .values({
        provider: paymentMode === 'mock' ? 'mock' : 'stripe',
        paymentMode,
        amountCents: 59700,
        netCents: 59700,
        paidAt: new Date(),
        status: 'paid',
        customerCompany: 'Fiktiver Test',
        customerName: 'Test',
        customerEmail: 'test@example.test',
        billingAddressJson: { street: 'Testweg 1', postalCode: '12345', city: 'Testort', country: 'DE' },
      })
      .returning();
    const [customer] = await getDb()
      .insert(customers)
      .values({
        orderId: order!.id,
        company: 'Fiktiver Test',
        contactName: 'Test',
        email: 'test@example.test',
        accessToken: `test-customer-${paymentMode}`,
      })
      .returning();
    await getDb()
      .insert(sites)
      .values({
        customerId: customer!.id,
        templateId: 'handwerk-klar',
        palette: 'werkblau',
        contentJson: { testFixture: true },
        formKey: `test-form-${paymentMode}`,
        status: 'live',
        liveAt: new Date(),
      });
    await getDb().insert(auditLog).values({ entity: 'order', entityId: order!.id, action: 'v4_tier_changed', actor: 'test' });
  }
  expect((await realizedFinanceV4()).setupReceivedCents).toBe(59700);
  const funnel = await operationalFunnelV4();
  expect(funnel.find((s) => s.label === 'Kauf abgeschlossen')?.count).toBe(1);
  expect(funnel.find((s) => s.label === 'Website live geschaltet')?.count).toBe(1);
  expect(funnel.find((s) => s.label.startsWith('Tarifwechsel'))?.count).toBe(1);
});

it('keeps fictional lead and demo activity out of operational acquisition totals', async () => {
  for (const source of ['osm', 'mock'] as const) {
    const [lead] = await getDb()
      .insert(leads)
      .values({
        source,
        sourceId: `test-${source}`,
        businessName: 'Fiktiver Test',
        branch: 'maler',
        branchGroup: 'handwerk',
        city: 'Testort',
        segmentKey: 'test',
        trackToken: `test-${source}`,
        status: 'qualified',
      })
      .returning();
    await getDb()
      .insert(demos)
      .values({
        leadId: lead!.id,
        slug: `test-${source}`,
        templateId: 'handwerk-klar',
        palette: 'werkblau',
        contentJson: { testFixture: true },
        approvedAt: new Date(),
      });
    await getDb()
      .insert(auditLog)
      .values({ entity: 'lead', entityId: lead!.id, action: 'status:discovered->qualified', actor: 'test' });
  }
  const counts = (await operationalFunnelV4()).slice(0, 4).map((s) => s.count);
  expect(counts).toEqual([1, 1, 1, 1]);
});
