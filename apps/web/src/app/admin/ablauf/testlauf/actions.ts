'use server';

import { redirect } from 'next/navigation';
import { startTestRun } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

/** Neuen Testlauf mit erfundenem Betrieb starten. */
export async function startTestRunAction(): Promise<void> {
  const s = await requireAdmin();
  await startTestRun(actorOf(s));
  redirect('/admin/ablauf/testlauf');
}
