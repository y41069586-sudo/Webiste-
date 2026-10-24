'use server';

import { revalidatePath } from 'next/cache';
import { getDb, refreshFunnel } from '@wbm/core';
import { requireAdmin } from '@/lib/auth';

export async function refreshFunnelAction(): Promise<void> {
  await requireAdmin();
  await refreshFunnel(getDb());
  revalidatePath('/admin/funnel');
}
