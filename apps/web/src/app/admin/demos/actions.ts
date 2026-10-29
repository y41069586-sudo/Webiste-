'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  approveDemo,
  demoRevisionKey,
  enqueue,
  QUEUES,
  rejectDemo,
  setSetting,
  DEMO_QUALITY_DIMENSIONS,
  type DemoRevisionPatch,
  type ManualQualityScores,
} from '@wbm/core';
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

/** Kostenlose Anpassung vor dem Kauf: Änderung speichern, der Server erzeugt die Demo unter demselben Link neu. */
export async function reviseDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Ungültige Demo');
  const text = (k: string, max: number) => String(form.get(k) ?? '').slice(0, max);
  const services: NonNullable<DemoRevisionPatch['services']> = [];
  for (let i = 0; i < 8; i++) {
    const title = text(`service_title_${i}`, 60).trim();
    if (title) services.push({ title, text: text(`service_text_${i}`, 200).trim() });
  }
  const [templateId, palette] = String(form.get('design') ?? '').split('|');
  const patch: DemoRevisionPatch = {
    hero_headline: text('hero_headline', 120),
    hero_subline: text('hero_subline', 300),
    about: text('about', 900),
    cta_text: text('cta_text', 60),
    services,
    servicesConfirmedByBusiness: form.get('confirmed') === 'on',
    ...(templateId && palette ? { templateId, palette } : {}),
  };
  const wishId = String(form.get('wishId') ?? '');
  await setSetting(demoRevisionKey(id), { state: 'pending', at: new Date().toISOString() }, actorOf(s));
  await enqueue(QUEUES.reviseDemo, {
    demoId: id,
    patch,
    actor: actorOf(s),
    wishMessageId: /^[0-9a-f-]{36}$/.test(wishId) ? wishId : null,
  });
  revalidatePath(`/admin/demos/${id}`);
}
