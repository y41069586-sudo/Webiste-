'use server';

import { revalidatePath } from 'next/cache';
import { desc, eq } from 'drizzle-orm';
import {
  LETTER_QUALITY_DIMENSIONS,
  type LetterQualityScores,
  approveLetter,
  approveLetterWithReason,
  audit,
  bulkApproveLetters,
  enqueue,
  getConfig,
  getDb,
  QUEUES,
  rejectLetter,
  restoreStalledLetters,
  schema,
  submitLxpTestJob,
} from '@wbm/core';
import { redirect } from 'next/navigation';
import { actorOf, requireAdmin } from '@/lib/auth';

/** Gesamteindruck des Betreibers → Bewertung je Bereich (Mindestniveau 80, kein Bereich unter 60) */
const RATING_SCORES: Record<string, number> = { sehr_gut: 92, gut: 82, schwach: 50 };

export async function approveLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  // Einfache Prüfung: ein Haken (gelesen, passt) und eine Gesamtnote für alle Bereiche
  const simple = form.get('simple') === '1';
  const flow = form.get('flow') === '1';
  const rating = simple && form.get('read') === 'on' ? (RATING_SCORES[String(form.get('rating') ?? '')] ?? NaN) : NaN;
  const res = await approveLetterWithReason(
    String(form.get('id')),
    actorOf(s),
    Object.fromEntries(
      Object.keys(LETTER_QUALITY_DIMENSIONS).map((key) => [
        key,
        simple ? rating : form.has(`quality_${key}`) ? Number(form.get(`quality_${key}`)) : NaN,
      ]),
    ) as LetterQualityScores,
  );
  if (!res.ok) {
    // Neuerzeugung läuft: zurück zur Übersicht, der neue Brief erscheint unter „Warten auf dich“
    if (res.regenerating) redirect(`/admin/letters?tab=review&hinweis=${encodeURIComponent(res.reason ?? '')}`);
    redirect(
      `/admin/letters/${encodeURIComponent(String(form.get('id')))}?${flow ? 'flow=1&' : ''}hinweis=${encodeURIComponent(
        `Noch nicht freigegeben: ${res.reason ?? (simple ? 'Haken setzen und „Sehr gut“ oder „Gut“ wählen.' : 'Prüfung nicht bestanden.')}`,
      )}`,
    );
  }
  revalidatePath('/admin/letters');
  if (flow) redirect('/admin/ablauf/naechster-brief');
}

export async function bulkApproveLettersAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const ids = form.getAll('ids').map(String);
  const count = await bulkApproveLetters(ids, actorOf(s));
  if (count < ids.length)
    redirect(
      `/admin/letters/${encodeURIComponent(ids[0]!)}?hinweis=${encodeURIComponent('Neue Briefe benötigen eine tatsächliche Einzelbewertung. Nicht alle ausgewählten Briefe wurden freigegeben.')}`,
    );
  revalidatePath('/admin/letters');
}

export async function rejectLetterAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await rejectLetter(String(form.get('id')), actorOf(s), String(form.get('note') || 'verworfen'), form.get('regenerate') === '1');
  revalidatePath('/admin/letters');
  if (form.get('flow') === '1') redirect('/admin/ablauf/naechster-brief');
}

/** Testbrief an die in den Einstellungen hinterlegte eigene Adresse (nutzt die neueste veröffentlichte Demo). */
export async function createTestLetterAction(): Promise<void> {
  const s = await requireAdmin();
  const cfg = await getConfig({ fresh: true });
  const t = cfg.letter.testRecipient;
  if (!t.street || !t.postalCode || !t.city)
    throw new Error('Bitte zuerst die Testadresse unter Einstellungen → Brief & Versand eintragen.');
  const demo = await getDb()
    .select({ leadId: schema.demos.leadId })
    .from(schema.demos)
    .where(eq(schema.demos.status, 'published'))
    .orderBy(desc(schema.demos.publishedAt))
    .limit(1);
  if (!demo[0]) throw new Error('Es gibt noch keine veröffentlichte Demo als Vorlage.');
  await enqueue(QUEUES.generateLetter, { leadId: demo[0].leadId, sequence: 1, triggeredBy: actorOf(s), test: true });
  await audit(getDb(), { entity: 'letter', entityId: 'test', action: 'test_requested', actor: actorOf(s) });
  revalidatePath('/admin/letters');
}

export async function sendApprovedNowAction(): Promise<void> {
  const s = await requireAdmin();
  await enqueue(QUEUES.sendApprovedLetters, { triggeredBy: actorOf(s) }, { singletonKey: 'send-approved' });
  await audit(getDb(), { entity: 'job', entityId: QUEUES.sendApprovedLetters, action: 'enqueue', actor: actorOf(s) });
  revalidatePath('/admin/letters');
}

/** Testauftrag im Testmodus des Briefdienstes (easyNova/LetterXpress: kein Druck, keine Kosten – auch bei DRY_RUN). */
export async function lxpTestJobAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  let msg: string;
  try {
    const r = await submitLxpTestJob(id, actorOf(s));
    msg = `Testauftrag ${r.jobId} im Testmodus des Briefdienstes eingeliefert (Status ${r.status}). Bisher ${r.count} Testaufträge.`;
  } catch (err) {
    msg = `Testauftrag fehlgeschlagen: ${err instanceof Error ? err.message : String(err)}`;
  }
  revalidatePath(`/admin/letters/${id}`);
  redirect(`/admin/letters/${id}?hinweis=${encodeURIComponent(msg)}`);
}

/**
 * Sammelfreigabe + Versand (07.11.2026, Betreiber: „alle Briefe auf einmal bestätigen und verschicken“). Nur mit deiner
 * Gesamtnote und „alle gelesen“. Briefe, die der Wahrheits-Check oder die Prüfung sperrt, bleiben still liegen.
 */
export async function bulkApproveAndSendLettersAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const rating = RATING_SCORES[String(form.get('rating') ?? '')];
  if (!rating || form.get('ok') !== 'on') redirect('/admin/letters?tab=review&sammel=nichts');
  const scores = Object.fromEntries(Object.keys(LETTER_QUALITY_DIMENSIONS).map((key) => [key, rating])) as LetterQualityScores;
  const rows = await getDb().select({ id: schema.letters.id }).from(schema.letters).where(eq(schema.letters.status, 'generated'));
  let freigegeben = 0;
  for (const row of rows) {
    try {
      if (await approveLetter(row.id, actorOf(s), scores)) freigegeben++;
    } catch {
      // gesperrter Brief: bleibt liegen, ohne Meldung pro Stück
    }
  }
  if (freigegeben > 0) await enqueue(QUEUES.sendApprovedLetters, { triggeredBy: actorOf(s) }, { singletonKey: 'send-approved' });
  revalidatePath('/admin/letters');
  redirect(`/admin/letters?tab=approved&sammel=${freigegeben}von${rows.length}`);
}

/**
 * Intern stornierte und zurückgestellte Briefe wiederherstellen (10.11.2026). Versendet nichts: wiederhergestellte
 * Briefe warten wieder auf deine Freigabe. Bereits an den Briefdienst übergebene Briefe bleiben zurückgehalten.
 */
export async function restoreStalledLettersAction(): Promise<void> {
  const s = await requireAdmin();
  const res = await restoreStalledLetters(actorOf(s));
  const n = (r: string) => res.filter((x) => x.result === r).length;
  const held = res.filter((x) => x.result === 'held');
  const grund = held[0]?.reason ? ` Erster Grund: ${held[0].reason}` : '';
  revalidatePath('/admin/letters');
  redirect(
    `/admin/letters?tab=failed&hinweis=${encodeURIComponent(
      `${n('reinstated')} sofort wiederhergestellt, ${n('regenerating')} werden neu erzeugt, ${held.length} zurückgehalten.${grund} Wiederhergestellte Briefe warten unter „Warten auf dich“ auf deine Freigabe.`,
    )}`,
  );
}
