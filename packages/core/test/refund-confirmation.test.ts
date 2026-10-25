import { beforeEach, afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDb } from '../src/db/client';
import { orders } from '../src/db/schema';
import type { MockPayment } from '../src/providers/mock/payment';
import { getProviders } from '../src/providers';
import { updateConfig } from '../src/config/service';
import { refundOrder, applyRefund } from '../src/services/orders';
import { stopBoss } from '../src/queue';
import { resetDb } from './helpers';
import { buy, webhook } from './v4-helpers';

describe('Erstattung ist erst bei bestätigtem Erfolg ein Geldabgang', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ offers: { activeVersion: 'v4' } }, 'test:refund');
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(() => stopBoss());
  it('pending wird nicht als erstattet verbucht; parallele Wiederholung legt keine zweite Erstattung an', async () => {
    const { order } = await buy('basis');
    const refund = vi
      .spyOn(getProviders().payment as MockPayment, 'refund')
      .mockResolvedValue({ refundId: 're_pending_fixture', status: 'pending' });
    expect(await Promise.all([refundOrder(order.id, 'test:admin', 5000), refundOrder(order.id, 'test:admin', 5000)])).toEqual([
      false,
      false,
    ]);
    expect(refund).toHaveBeenCalledTimes(1);
    let saved = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(saved.refundedCents).toBe(0);
    expect(saved.pendingRefundStatus).toBe('pending');
    const event = {
      eventId: 'evt_refund_pending',
      type: 'refund.updated',
      rawType: 'refund.updated',
      refundId: 're_pending_fixture',
      refundStatus: 'pending',
      amountTotal: 5000,
      metadata: { orderId: order.id, cumulativeTarget: '5000' },
    };
    await webhook(event);
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))?.refundedCents).toBe(0);
    await webhook({ ...event, eventId: 'evt_refund_success', refundStatus: 'succeeded' });
    await webhook({ ...event, eventId: 'evt_refund_success_again', refundStatus: 'succeeded' });
    saved = (await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))!;
    expect(saved.refundedCents).toBe(5000);
    expect(saved.pendingRefundId).toBeNull();
  });
  it('bestätigte kumulative Erstattungen können bei Event-Überholung nicht kleiner werden', async () => {
    const { order } = await buy('basis');
    await Promise.all([applyRefund(order.id, 5000, 'test'), applyRefund(order.id, 3000, 'test')]);
    expect((await getDb().query.orders.findFirst({ where: eq(orders.id, order.id) }))?.refundedCents).toBe(5000);
    await expect(applyRefund(order.id, 999999, 'test')).rejects.toThrow(/Ungültig/);
  });
});
