import assert from 'node:assert/strict';
import { test } from 'node:test';
import { v4Offer, v4FirstYearCents, assertV4BillingReady, prepareV4Switch } from '../packages/core/src/services/offers-v4';
import { contributionV4 } from '../packages/core/src/services/contribution-v4';
import { DEFAULT_CONFIG } from '../packages/core/src/config/settings';
import { planAmounts } from '../packages/core/src/invoices/build';

test('new offers have one setup fee and exactly one monthly tier, legacy amounts unchanged', () => {
  assert.equal(v4Offer('basis').setupCents, 59700);
  assert.equal(v4Offer('care_plus').setupCents, 59700);
  assert.equal(v4Offer('basis').monthlyCents, 1900);
  assert.equal(v4Offer('care_plus').monthlyCents, 9900);
  assert.equal(v4FirstYearCents('basis'), 82500);
  assert.equal(v4FirstYearCents('care_plus'), 178500);
  assert.equal(v4Offer('basis').minTermMonths, 0);
  assert.equal(v4Offer('care_plus').includedChangeMinutes, 60);
  assert.equal(planAmounts(DEFAULT_CONFIG, 'one_time').grossCents, 59000);
  assert.equal(planAmounts(DEFAULT_CONFIG, 'monthly').grossCents, 4900);
  assert.equal(planAmounts(DEFAULT_CONFIG, 'basis').grossCents, 59700);
  assert.equal(planAmounts(DEFAULT_CONFIG, 'care_plus').grossCents, 59700);
});
test('billing is blocked until paid, consented and actually live', () => {
  const now = new Date('2026-10-25T10:00:00Z');
  const offer = v4Offer('care_plus', now.toISOString());
  const valid = { offer, paid: true, liveAt: now, now };
  for (const patch of [
    { paid: false },
    { liveAt: null },
    { cancelled: true },
    { liveAt: new Date('2026-10-26') },
    { offer: v4Offer('care_plus') },
  ])
    assert.throws(() => assertV4BillingReady({ ...valid, ...patch }));
  assert.equal(assertV4BillingReady(valid).amountCents, 9900);
});
test('switches require confirmation and future period end with no proration', () => {
  const r = prepareV4Switch('basis', 'care_plus', new Date('2026-11-25'), new Date('2026-10-25'));
  assert.equal(r.proration, 'none');
  assert.throws(() => prepareV4Switch('basis', 'basis', new Date('2026-11-25'), new Date('2026-10-25')));
});
test('contribution uses cash received minus refunds and real costs, not promised revenue', () => {
  const r = contributionV4({
    setupReceivedCents: 59700,
    monthlyReceivedCents: 9900,
    refundsCents: 0,
    letterCostCents: 4000,
    hostingCostCents: 1000,
    domainCostCents: 1200,
    paymentFeeCents: 1000,
    careMinutes: 60,
    careHourlyCostCents: 3000,
    deliveredLetters: 40,
    buyers: 1,
  });
  assert.equal(r.receivedCents, 69600);
  assert.equal(r.careCostCents, 3000);
  assert.equal(r.contributionCents, 59400);
});
