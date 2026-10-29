'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { rejectInQuickReview, saveQuickReview, WEBSITE_METHODS, type QuickReviewInput } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

const DEMAND_KINDS = ['service_advertising', 'available_dates', 'new_offer', 'expansion', 'takeover', 'active_profile'] as const;

function back(params: Record<string, string>): never {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  redirect(`/admin/ablauf/pruefen${q.size ? `?${q}` : ''}`);
}

/** Schnellprüfung speichern; geeignete Betriebe gehen sofort weiter zum Demo-Bau, offene bleiben mit Hinweis stehen. */
export async function saveQuickReviewAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  const skip = String(form.get('skip') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) back({ skip });
  const demandKind = String(form.get('demandKind') ?? '');
  const input: QuickReviewInput = {
    websiteFound: false,
    methods: WEBSITE_METHODS.filter((m) => form.get(`m_${m}`) === 'on'),
    addressOk: form.get('addressOk') === 'on',
    operational: form.get('operational') === 'on',
    independent: form.get('independent') === 'on',
    privateClients: form.get('privateClients') === 'on',
    businessClients: form.get('businessClients') === 'on',
    services: [0, 1, 2].map((i) => String(form.get(`service${i}`) ?? '').slice(0, 60)),
    demand: (DEMAND_KINDS as readonly string[]).includes(demandKind)
      ? { kind: demandKind as (typeof DEMAND_KINDS)[number], text: String(form.get('demandText') ?? '').slice(0, 140) }
      : null,
    source: String(form.get('source') ?? '').slice(0, 500),
    lawfulUse: form.get('lawfulUse') === 'on',
  };
  let result: { state: string; missing: string[]; exclusions: string[] };
  try {
    result = await saveQuickReview(id, input, actorOf(s));
  } catch (err) {
    back({ lead: id, skip, fehler: err instanceof Error ? err.message.slice(0, 300) : 'Speichern fehlgeschlagen' });
  }
  revalidatePath('/admin/ablauf');
  revalidatePath('/admin/leads');
  if (result.state === 'ready') back({ skip, ok: id });
  if (result.state === 'excluded') back({ skip, aus: id });
  // Noch offen: beim selben Betrieb bleiben und zeigen, was fehlt
  back({ lead: id, skip, offen: result.missing.slice(0, 6).join(' · ').slice(0, 600) });
}

export async function rejectQuickReviewAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  const skip = String(form.get('skip') ?? '');
  if (/^[0-9a-f-]{36}$/.test(id)) await rejectInQuickReview(id, String(form.get('reason') ?? 'manual'), actorOf(s));
  revalidatePath('/admin/ablauf');
  back({ skip, aus: id });
}

export async function skipQuickReviewAction(form: FormData): Promise<void> {
  await requireAdmin();
  const id = String(form.get('id'));
  const skip = [...String(form.get('skip') ?? '').split(','), id].filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(-100);
  back({ skip: skip.join(',') });
}
