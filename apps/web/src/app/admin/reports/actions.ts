'use server';

import { revalidatePath } from 'next/cache';
import { applyReport, enqueue, QUEUES } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function applyReportAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await applyReport(String(form.get('id')), actorOf(s));
  revalidatePath('/admin/reports');
}

export async function runOptimizerAction(): Promise<void> {
  const s = await requireAdmin();
  await enqueue(QUEUES.weeklyOptimizer, { periodEnd: new Date().toISOString() }, { singletonKey: `optimizer-${actorOf(s)}-${Date.now()}` });
  revalidatePath('/admin/reports');
}
