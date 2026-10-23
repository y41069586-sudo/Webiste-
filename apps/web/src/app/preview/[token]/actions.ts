'use server';

import { redirect } from 'next/navigation';
import { approvePreview, requestChanges } from '@wbm/core';

export interface PreviewState {
  error?: string;
}

export async function approveAction(token: string, _prev: PreviewState, form: FormData): Promise<PreviewState> {
  if (form.get('confirm') !== 'on') return { error: 'Bitte bestätigen Sie, dass alles passt.' };
  const res = await approvePreview(token);
  if (!res.ok) return { error: res.error };
  redirect(`/preview/${token}?freigegeben=1`);
}

export async function changesAction(token: string, _prev: PreviewState, form: FormData): Promise<PreviewState> {
  const res = await requestChanges(token, String(form.get('text') ?? ''));
  if (!res.ok) return { error: res.error };
  redirect(`/preview/${token}?aenderung=${res.mode}`);
}
