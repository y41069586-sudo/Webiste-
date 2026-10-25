'use server';

import { redirect } from 'next/navigation';
import { startSubscriptionCheckout } from '@wbm/core';
import { requestTariffChange, requestCancellationV4, withdrawTariffChange } from '@wbm/core';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/components/action-form';

export async function subscribeAction(token: string, _prev: { error?: string }, _form: FormData): Promise<{ error?: string }> {
  void _form;
  const res = await startSubscriptionCheckout(token);
  if (!res.ok) return { error: res.error };
  redirect(res.url);
}

export async function manageTariff(token: string, _previous: ActionResult, form: FormData): Promise<ActionResult> {
  // Each service independently checks the private customer token and order ownership.
  try {
    switch (form.get('operation')) {
      case 'switch':
        await requestTariffChange(token, String(form.get('tier')), form.get('confirm') === 'on');
        break;
      case 'withdraw':
        await withdrawTariffChange(token, String(form.get('id')));
        break;
      case 'cancel':
        await requestCancellationV4(token, form.get('confirm') === 'on');
        break;
      default:
        throw new Error('Aktion ungültig.');
    }
    revalidatePath(`/verlaengern/${token}`);
    return { success: 'Ihre Anfrage wurde gespeichert.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Die Anfrage konnte nicht gespeichert werden.' };
  }
}
