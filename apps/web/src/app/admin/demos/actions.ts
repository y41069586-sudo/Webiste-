'use server';

import { revalidatePath } from 'next/cache';
import { approveDemo, rejectDemo } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function approveDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await approveDemo(String(form.get('id')), actorOf(s), {
    manual: true,
    note: String(form.get('note') ?? '') || undefined,
    review: {
      facts: form.get('facts') === 'on',
      desktop: form.get('desktop') === 'on',
      mobile: form.get('mobile') === 'on',
      images: form.get('images') === 'on',
      text: form.get('text') === 'on',
    },
  });
  revalidatePath('/admin/demos');
}

export async function bulkApproveDemos(form: FormData): Promise<void> {
  await requireAdmin();
  void form;
  throw new Error('Demos bitte einzeln mit Fakten-, Desktop-, Mobil-, Bild- und Textprüfung freigeben.');
}

export async function rejectDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await rejectDemo(String(form.get('id')), actorOf(s), String(form.get('note') || 'abgelehnt'), form.get('regenerate') === '1');
  revalidatePath('/admin/demos');
}
