'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb, schema } from '@wbm/core';
import { requireAdmin } from '@/lib/auth';

export async function acknowledgeAlert(form: FormData): Promise<void> {
  await requireAdmin();
  await getDb()
    .update(schema.alerts)
    .set({ acknowledgedAt: new Date() })
    .where(eq(schema.alerts.id, String(form.get('id'))));
  revalidatePath('/admin');
}
