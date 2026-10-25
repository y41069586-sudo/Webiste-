'use server';

import { revalidatePath } from 'next/cache';
import { confirmFinanceCoverage, recordOperatingCost } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';
import type { ActionResult } from '@/components/action-form';

export async function financeOperation(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const session = await requireAdmin();
  try {
    if (form.get('operation') === 'coverage') {
      await confirmFinanceCoverage(
        String(form.get('from')),
        String(form.get('to')),
        form.get('confirm') === 'on',
        actorOf(session),
      );
    } else {
      await recordOperatingCost(
        {
          kind: String(form.get('kind')) as 'hosting' | 'domain' | 'payment_fee' | 'other' | 'letter',
          amountCents: Math.round(Number(form.get('amount')) * 100),
          incurredAt: new Date(`${String(form.get('date'))}T00:00:00Z`),
          reference: String(form.get('reference')),
          idempotencyKey: String(form.get('idempotencyKey')),
          ...(form.get('customerId') ? { customerId: String(form.get('customerId')) } : {}),
        },
        actorOf(session),
      );
    }
    revalidatePath('/admin/budget');
    revalidatePath('/admin/funnel');
    return { success: 'Gespeichert.' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Buchung nicht möglich.' };
  }
}
