'use server';

import { revalidatePath } from 'next/cache';
import { allocationsFrom, applyAllocations, evaluateIndustries, getDb, reactivateVariant, refreshFunnel } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

/** Zuteilung jetzt rechnen und übernehmen (Entscheidung des Betreibers, unabhängig von AUTO_OPTIMIZE). */
export async function applyAllocationsAction(): Promise<void> {
  const s = await requireAdmin();
  await refreshFunnel(getDb());
  const evals = await evaluateIndustries();
  await applyAllocations(allocationsFrom(evals), actorOf(s));
  revalidatePath('/admin/optimizer');
}

/** Pausierte Variante wieder aktivieren (z. B. nach Prüfung eines Sicherheitsnetzes). */
export async function reactivateVariantAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await reactivateVariant(String(form.get('id') ?? ''), actorOf(s));
  revalidatePath('/admin/optimizer');
}
