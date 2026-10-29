'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { rejectInQuickReview, saveQuickReview, WEBSITE_METHODS, type QuickReviewInput } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

function back(params: Record<string, string>): never {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  redirect(`/admin/ablauf/pruefen${q.size ? `?${q}` : ''}`);
}

/**
 * Einfache Prüfung speichern. Drei Haken und die Leistungen werden auf dieselbe Recherche abgebildet wie das
 * ausführliche Formular (alle vier Suchwege über die Such-Knöpfe, Anschrift/aktiv/eigenständig, Kundengruppe,
 * aktuelles Signal). Der Klick auf „Passt – weiter“ ist die Bestätigung, selbst nachgesehen zu haben.
 * Geeignete Betriebe gehen sofort weiter zum Demo-Bau, offene bleiben mit Hinweis stehen.
 */
export async function saveQuickReviewAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  const skip = String(form.get('skip') ?? '');
  if (!/^[0-9a-f-]{36}$/.test(id)) back({ skip });
  const on = (k: string) => form.get(k) === 'on';
  const services = String(form.get('services') ?? '')
    .split(/[,;\n]+/)
    .map((x) => x.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 3);
  const todo = [
    on('noWebsite') ? null : 'Haken bei „Hat keine eigene Website“',
    on('realBusiness') ? null : 'Haken bei „Adresse stimmt, Betrieb ist aktiv“',
    on('active') ? null : 'Haken bei „Ist gerade aktiv“',
    services.length ? null : 'mindestens eine Leistung',
  ].filter(Boolean);
  if (todo.length) back({ lead: id, skip, offen: todo.join(' · ') });
  const business = form.get('clients') === 'business';
  const input: QuickReviewInput = {
    websiteFound: false,
    methods: [...WEBSITE_METHODS],
    addressOk: true,
    operational: true,
    independent: true,
    privateClients: !business,
    businessClients: business,
    services,
    demand: { kind: 'active_profile', text: 'Aktuelle Aktivität (Posts, Angebote oder Termine) selbst gesehen' },
    lawfulUse: true,
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
  back({ lead: id, skip, offen: result.missing.slice(0, 4).join(' · ').slice(0, 600) });
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
