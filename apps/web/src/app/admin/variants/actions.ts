'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  approveProposal,
  enqueue,
  pauseVariant,
  QUEUES,
  reactivateVariant,
  rejectProposal,
  retireVariant,
  VariantReviewError,
} from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

function back(error?: string): never {
  revalidatePath('/admin/variants');
  redirect(error ? `/admin/variants?error=${encodeURIComponent(error)}` : '/admin/variants');
}

async function run(fn: () => Promise<unknown>): Promise<never> {
  try {
    await fn();
  } catch (err) {
    if (err instanceof VariantReviewError) back(err.message);
    throw err;
  }
  back();
}

export async function approveProposalAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await run(() => approveProposal(String(form.get('id')), actorOf(s)));
}

export async function rejectProposalAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await run(() => rejectProposal(String(form.get('id')), actorOf(s), String(form.get('note') ?? '')));
}

export async function pauseVariantAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await run(() => pauseVariant(String(form.get('id')), actorOf(s)));
}

export async function reactivateAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await run(() => reactivateVariant(String(form.get('id')), actorOf(s)));
}

export async function retireVariantAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await run(() => retireVariant(String(form.get('id')), actorOf(s), String(form.get('note') ?? '')));
}

/** Lern-Agent sofort laufen lassen (erzeugt den Bericht dieser Woche neu). */
export async function runLearningAgentAction(): Promise<void> {
  const s = await requireAdmin();
  await enqueue(QUEUES.learningAgent, { force: true, triggeredBy: actorOf(s) }, { singletonKey: `learning-${Date.now()}` });
  revalidatePath('/admin/learning');
  redirect('/admin/learning?gestartet=1');
}
