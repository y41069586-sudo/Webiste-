'use server';

import { revalidatePath } from 'next/cache';
import { approveDemo, rejectDemo } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function approveDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await approveDemo(String(form.get('id')), actorOf(s), { manual: true, note: String(form.get('note') ?? '') || undefined });
  revalidatePath('/admin/demos');
}

export async function bulkApproveDemos(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const ids = form.getAll('ids').map(String);
  for (const id of ids) {
    await approveDemo(id, actorOf(s), { manual: true }).catch(() => undefined);
  }
  revalidatePath('/admin/demos');
}

export async function rejectDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await rejectDemo(String(form.get('id')), actorOf(s), String(form.get('note') || 'abgelehnt'), form.get('regenerate') === '1');
  revalidatePath('/admin/demos');
}
