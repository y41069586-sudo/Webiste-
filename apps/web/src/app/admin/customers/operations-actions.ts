'use server';

import { revalidatePath } from 'next/cache';
import {
  approveTariffChange,
  cancelTariffChange,
  priceCareWork,
  recordCareWork,
  reviewCareCheck,
  runCareTechnicalCheck,
  startBillingV4,
  voidCareWork,
} from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';
import type { ActionResult } from '@/components/action-form';

export async function customerOperation(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const session = await requireAdmin();
  const actor = actorOf(session);
  const customerId = String(form.get('customerId') ?? '');
  const id = String(form.get('id') ?? '');
  const kind = String(form.get('operation'));
  try {
    switch (kind) {
      case 'work':
        await recordCareWork(
          {
            customerId,
            kind: String(form.get('kind')) as 'included_content' | 'technical' | 'extra_content',
            minutes: Number(form.get('minutes')),
            hourlyCostCents: form.get('hourlyCost') ? Math.round(Number(form.get('hourlyCost')) * 100) : null,
            workedAt: new Date(String(form.get('workedAt'))),
            note: String(form.get('note')),
            extraApproved: form.get('extraApproved') === 'on',
            idempotencyKey: String(form.get('reference')),
            ...(form.get('changeRequestId') ? { changeRequestId: String(form.get('changeRequestId')) } : {}),
          },
          actor,
        );
        break;
      case 'price':
        await priceCareWork(id, Math.round(Number(form.get('hourlyCost')) * 100), actor);
        break;
      case 'void':
        if (form.get('confirm') !== 'on') throw new Error('Storno bitte bestätigen.');
        await voidCareWork(id, actor);
        break;
      case 'check':
        await runCareTechnicalCheck(customerId);
        break;
      case 'review':
        await reviewCareCheck(id, String(form.get('note')), form.get('confirm') === 'on', actor);
        break;
      case 'tariffApprove':
        if (form.get('confirm') !== 'on') throw new Error('Tarifwechsel bitte bestätigen.');
        await approveTariffChange(id, actor);
        break;
      case 'tariffCancel':
        await cancelTariffChange(id, actor);
        break;
      case 'billing':
        await startBillingV4(id, actor);
        break;
      default:
        throw new Error('Unbekannte Aktion.');
    }
    revalidatePath(`/admin/customers/${customerId}`);
    revalidatePath('/admin/budget');
    return { success: 'Gespeichert.' };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Speichern nicht möglich.' };
  }
}
