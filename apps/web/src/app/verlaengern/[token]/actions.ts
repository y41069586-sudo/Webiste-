'use server';

import { redirect } from 'next/navigation';
import { startSubscriptionCheckout } from '@wbm/core';

export async function subscribeAction(token: string, _prev: { error?: string }, _form: FormData): Promise<{ error?: string }> {
  void _form;
  const res = await startSubscriptionCheckout(token);
  if (!res.ok) return { error: res.error };
  redirect(res.url);
}
