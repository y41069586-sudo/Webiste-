'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import {
  approveDemo,
  demoRevisionKey,
  enqueue,
  QUEUES,
  rejectDemo,
  setSetting,
  getDb,
  schema,
  DEMO_QUALITY_DIMENSIONS,
  type DemoRevisionPatch,
  type ManualQualityScores,
} from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

/** Gesamteindruck des Betreibers → Bewertung je Bereich (Mindestniveau 80, kein Bereich unter 60) */
const RATING_SCORES: Record<string, number> = { sehr_gut: 92, gut: 82, schwach: 50 };

export async function approveDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  // Einfache Prüfung: zwei Haken und eine Gesamtnote statt fünf Haken und fünf Zahlen. Die Gesamtnote des
  // Betreibers gilt für jeden Bereich; „Nicht gut genug“ liegt unter dem Mindestniveau und sperrt die Freigabe.
  const simple = form.get('simple') === '1';
  const rating = RATING_SCORES[String(form.get('rating') ?? '')] ?? NaN;
  // Neue Freigabe (06.11.2026): ein Haken „Angesehen – Name, Adresse und Texte stimmen“ statt zwei Haken und Note
  const ok = form.get('ok') === 'on';
  const seen = ok || form.get('seen') === 'on';
  const correct = ok || form.get('correct') === 'on';
  try {
    await approveDemo(String(form.get('id')), actorOf(s), {
      manual: true,
      acceptTechnical: form.get('accept_technical') === 'on',
      note: String(form.get('note') ?? '') || undefined,
      review: {
        qualityScores: Object.fromEntries(
          Object.keys(DEMO_QUALITY_DIMENSIONS).map((key) => [
            key,
            simple ? rating : form.has(`quality_${key}`) ? Number(form.get(`quality_${key}`)) : NaN,
          ]),
        ) as ManualQualityScores,
        facts: simple ? correct : form.get('facts') === 'on',
        desktop: simple ? seen : form.get('desktop') === 'on',
        mobile: simple ? seen : form.get('mobile') === 'on',
        images: simple ? correct : form.get('images') === 'on',
        text: simple ? correct : form.get('text') === 'on',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Qualitätsbewertung'))
      redirect(
        `/admin/demos/${encodeURIComponent(String(form.get('id')))}?quality=required${form.get('flow') === '1' ? '&flow=1' : ''}`,
      );
    throw error;
  }
  revalidatePath('/admin/demos');
  // Aus dem Ablauf heraus direkt zur nächsten wartenden Demo
  if (form.get('flow') === '1') redirect('/admin/ablauf/naechste-demo');
}

export async function bulkApproveDemos(form: FormData): Promise<void> {
  await requireAdmin();
  void form;
  throw new Error('Demos bitte einzeln mit Fakten-, Desktop-, Mobil-, Bild- und Textprüfung freigeben.');
}

export async function rejectDemoAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const regenerate = form.get('regenerate') === '1';
  const note = String(form.get('note') ?? '')
    .trim()
    .slice(0, 1200);
  // Neubau braucht einen Wunsch – sonst baut die KI nur dasselbe noch einmal
  if (regenerate && !note) throw new Error('Bitte kurz schreiben, was anders werden soll.');
  await rejectDemo(String(form.get('id')), actorOf(s), note || 'abgelehnt', regenerate);
  revalidatePath('/admin/demos');
  if (form.get('flow') === '1') redirect('/admin/ablauf/naechste-demo');
  redirect(regenerate ? '/admin/demos?neu=1' : '/admin/demos?aus=1');
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

/**
 * Sammelfreigabe (07.11.2026, Betreiber: „alle Demos auf einmal freigeben, die ich freigeben kann“). Nur wenn du
 * selbst die Gesamtnote und „alle gelesen“ bestätigst. Demos mit technischem Fehler oder Sperre werden still
 * übersprungen; kein Fehler für einzelne Stücke.
 */
export async function bulkApproveDemosAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const rating = RATING_SCORES[String(form.get('rating') ?? '')];
  if (!rating || form.get('ok') !== 'on') redirect('/admin/demos?tab=review&sammel=nichts');
  const rows = await getDb().select({ id: schema.demos.id }).from(schema.demos).where(eq(schema.demos.status, 'pending_review'));
  let freigegeben = 0;
  for (const row of rows) {
    try {
      await approveDemo(row.id, actorOf(s), {
        manual: true,
        acceptTechnical: form.get('accept_technical') === 'on',
        review: {
          qualityScores: Object.fromEntries(
            Object.keys(DEMO_QUALITY_DIMENSIONS).map((key) => [key, rating]),
          ) as ManualQualityScores,
          facts: true,
          desktop: true,
          mobile: true,
          images: true,
          text: true,
        },
      });
      freigegeben++;
    } catch {
      // Gesperrte Demo (technisch, Fakten, Qualität): bleibt liegen, ohne Meldung pro Stück
    }
  }
  revalidatePath('/admin/demos');
  redirect(`/admin/demos?tab=review&sammel=${freigegeben}von${rows.length}`);
}
