import { expect, it, beforeEach } from 'vitest';
import { getDb } from '../src/db/client';
import { orders } from '../src/db/schema';
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
  for (const paymentMode of ['live', 'test', 'mock', 'unknown'] as const)
    await getDb()
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
      });
  expect((await realizedFinanceV4()).setupReceivedCents).toBe(59700);
  expect((await operationalFunnelV4()).find((s) => s.label === 'Kauf abgeschlossen')?.count).toBe(1);
});
