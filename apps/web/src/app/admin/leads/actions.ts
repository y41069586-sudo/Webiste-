'use server';

import { revalidatePath } from 'next/cache';
import {
  getDb,
  markLetterUndeliverable,
  optOutLead,
  transitionLead,
  saveLeadResearch,
  WEBSITE_METHODS,
  assertAcquisitionEligible,
  schema,
  type LeadResearch,
} from '@wbm/core';
import { eq } from 'drizzle-orm';
import { actorOf, requireAdmin } from '@/lib/auth';

export async function requalifyLead(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  await getDb().transaction(async (tx) => {
    const lead = await tx.query.leads.findFirst({ where: eq(schema.leads.id, id) });
    if (!lead) throw Error('Betrieb nicht gefunden.');
    await assertAcquisitionEligible(lead, tx);
    await transitionLead(tx, id, 'qualified', { actor: actorOf(s), reason: 'manuell freigegeben', soft: true });
  });
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}

export async function saveResearchAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(form.get('id'));
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw Error('Ungültiger Betrieb.');
  if (form.get('lawfulUse') !== 'on') throw Error('Quellenzuordnung und zulässige Nutzung bestätigen.');
  const date = (key: string) => {
    const value = String(form.get(key) ?? '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Prüf-/Beobachtungsdatum fehlt.');
    return new Date(value + 'T00:00:00Z').toISOString();
  };
  const signals: LeadResearch['signals'] = [];
  for (let i = 0; i < 20; i++) {
    const text = String(form.get(`text${i}`) ?? '').trim();
    if (!text) continue;
    if (form.get(`verified${i}`) !== 'on') throw Error('Jede verwendete Angabe einzeln als überprüft bestätigen.');
    signals.push({
      kind: String(form.get(`kind${i}`)) as LeadResearch['signals'][number]['kind'],
      text,
      source: String(form.get(`source${i}`) ?? '').trim(),
      observedAt: date(`observed${i}`),
      verified: true,
      ...(form.get(`occurred${i}`) ? { occurredOn: String(form.get(`occurred${i}`)) } : {}),
    });
  }
  await saveLeadResearch(
    id,
    {
      lawfulUseConfirmed: true,
      website: {
        result: String(form.get('websiteResult')) as LeadResearch['website']['result'],
        checkedAt: date('websiteDate'),
        source: String(form.get('websiteSource') ?? '').trim(),
        methods: WEBSITE_METHODS.filter((m) => form.get(m) === 'on'),
        ...(form.get('foundUrl') ? { foundUrl: String(form.get('foundUrl')) } : {}),
      },
      signals,
    },
    actorOf(admin),
  );
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}

export async function rejectLead(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  const reason = String(form.get('reason') || 'manuell abgelehnt');
  await getDb().transaction((tx) => transitionLead(tx, id, 'rejected', { actor: actorOf(s), reason, soft: true }));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}

export async function suppressLead(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  await getDb().transaction((tx) => optOutLead(tx, id, actorOf(s), 'admin_sperre'));
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin/leads');
}

/** Rücksendung „unzustellbar“ erfassen (B6.1) – nur mit getippter Bestätigung, da der Lead auf failed geht. */
export async function markUndeliverableAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const letterId = String(form.get('letterId'));
  const leadId = String(form.get('leadId'));
  if (String(form.get('confirm')).trim().toUpperCase() !== 'UNZUSTELLBAR')
    throw new Error('Bitte zur Bestätigung UNZUSTELLBAR eintippen.');
  await markLetterUndeliverable(letterId, actorOf(s));
  revalidatePath(`/admin/leads/${leadId}`);
}
