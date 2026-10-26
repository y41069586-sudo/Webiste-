'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { approveDemo, rejectDemo, DEMO_QUALITY_DIMENSIONS, type ManualQualityScores } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function approveDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  try {
    await approveDemo(String(form.get('id')), actorOf(s), {
      manual: true,
      note: String(form.get('note') ?? '') || undefined,
      review: {
        qualityScores: Object.fromEntries(
          Object.keys(DEMO_QUALITY_DIMENSIONS).map((key) => [
            key,
            form.has(`quality_${key}`) ? Number(form.get(`quality_${key}`)) : NaN,
          ]),
        ) as ManualQualityScores,
        facts: form.get('facts') === 'on',
        desktop: form.get('desktop') === 'on',
        mobile: form.get('mobile') === 'on',
        images: form.get('images') === 'on',
        text: form.get('text') === 'on',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Qualitätsbewertung'))
      redirect(`/admin/demos/${encodeURIComponent(String(form.get('id')))}?quality=required`);
    throw error;
  }
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
