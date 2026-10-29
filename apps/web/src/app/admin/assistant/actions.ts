'use server';

import { revalidatePath } from 'next/cache';
import { eq, isNull } from 'drizzle-orm';
import {
  answerOffline,
  applyMinLeadScore,
  askAssistantAi,
  assistantActionSchema,
  audit,
  dbAssistantData,
  describeAction,
  getConfig,
  getDb,
  getEnv,
  logger,
  schema,
  transitionLead,
  updateConfig,
  type AssistantAction,
  type AssistantLink,
  type AssistantTurn,
} from '@wbm/core';

const { alerts, leads } = schema;
import { assistantSnapshot } from '@/lib/assistant-snapshot';
import { actorOf, requireAdmin } from '@/lib/auth';
import { enqueueLeadSearch, stopLeadSearch } from '@/lib/lead-search';

export interface AssistantAnswer {
  antwort: string;
  modus: 'ki' | 'befehle';
  aktionen: (AssistantAction & { label: string })[];
  links: AssistantLink[];
  hinweis?: string;
}

/** Eine Nachricht an den Assistenten. Mit KI nur, wenn eingeschaltet und ein Anthropic-Schlüssel vorhanden ist. */
export async function askAssistant(history: AssistantTurn[], opts: { voice?: boolean } = {}): Promise<AssistantAnswer> {
  await requireAdmin();
  const turns = history
    .filter((h) => (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string')
    .slice(-12)
    .map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }));
  const last = [...turns].reverse().find((h) => h.role === 'user');
  if (!last?.text.trim()) return { antwort: 'Schreib mir einfach, was du brauchst.', modus: 'befehle', aktionen: [], links: [] };
  const [cfg, snap] = await Promise.all([getConfig(), assistantSnapshot()]);
  const aiReady = cfg.assistant.useAi && Boolean(getEnv().ANTHROPIC_API_KEY);
  // Ohne KI: Absichten, Datenbank (lesend) und Projektwissen; mit KI dient das als Grundlage für Claude
  let reply = await answerOffline(last.text, { snap, cfg, data: dbAssistantData, history: turns.slice(0, -1) });
  let hinweis: string | undefined;
  if (aiReady) {
    try {
      const offline = reply;
      reply = await askAssistantAi(snap, turns, offline.antwort, opts.voice === true);
      if (!reply.links?.length) reply.links = offline.links;
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.name : 'unknown' }, 'assistent: KI nicht erreichbar, Befehlsmodus');
      hinweis = 'KI gerade nicht erreichbar – Antwort aus dem Befehlsmodus.';
    }
  }
  return {
    antwort: reply.antwort,
    modus: reply.modus,
    aktionen: reply.aktionen.map((a) => ({ ...a, label: describeAction(a, snap) })),
    links: (reply.links ?? []).filter((l) => l.href.startsWith('/admin')).slice(0, 5),
    hinweis,
  };
}

/** Bestätigte Aktion ausführen. Nur die freigegebene Liste; alles andere wird abgelehnt. */
export async function runAssistantAction(raw: unknown): Promise<{ ok: boolean; text: string; href?: string }> {
  const s = await requireAdmin();
  const parsed = assistantActionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, text: 'Diese Aktion kenne ich nicht.' };
  const a = parsed.data;
  const actor = `${actorOf(s)}:assistent`;
  const cfg = await getConfig({ fresh: true });
  switch (a.typ) {
    case 'lead_suche_starten': {
      const known = new Set(cfg.targeting.branches.map((b) => b.key));
      const cities = a.staedte.filter((c) => cfg.targeting.cities.includes(c));
      const r = await enqueueLeadSearch(actor, {
        cities: cities.length ? cities : cfg.targeting.cities.slice(0, 1),
        branches: a.branchen.filter((b) => known.has(b)),
        minScore: a.punkte ?? undefined,
      });
      revalidatePath('/admin/suche');
      return r === 'started'
        ? { ok: true, text: 'Suche ist gestartet. Den Fortschritt siehst du live unter Lead-Suche.', href: '/admin/suche' }
        : { ok: false, text: 'Es läuft schon eine Suche.', href: '/admin/suche' };
    }
    case 'lead_suche_stoppen':
      await stopLeadSearch(actor);
      revalidatePath('/admin/suche');
      return { ok: true, text: 'Stopp angefordert – die Suche hält nach dem aktuellen Betrieb an.', href: '/admin/suche' };
    case 'mindestgrenze_setzen':
      if (a.punkte === null) return { ok: false, text: 'Welche Grenze soll gelten?' };
      await updateConfig({ filters: { minLeadScore: a.punkte } }, actor);
      revalidatePath('/admin/suche');
      return { ok: true, text: `Mindestgrenze ist jetzt ${a.punkte} Punkte.` };
    case 'mindestgrenze_anwenden': {
      const n = await applyMinLeadScore(cfg.filters.minLeadScore, actor);
      revalidatePath('/admin/suche');
      revalidatePath('/admin/leads');
      return { ok: true, text: `${n} Leads unter ${cfg.filters.minLeadScore} Punkten aussortiert.` };
    }
    case 'seite_oeffnen':
      return a.ziel.startsWith('/admin') ? { ok: true, text: '', href: a.ziel } : { ok: false, text: 'Unbekannte Seite.' };
    case 'lead_aussortieren':
    case 'lead_zurueckholen': {
      if (!a.leadId) return { ok: false, text: 'Welcher Lead?' };
      const db = getDb();
      const lead = await db.query.leads.findFirst({ where: eq(leads.id, a.leadId) });
      if (!lead || lead.anonymizedAt) return { ok: false, text: 'Lead nicht gefunden.' };
      const out = a.typ === 'lead_aussortieren';
      if (out ? !['discovered', 'qualified'].includes(lead.status) : lead.status !== 'rejected')
        return { ok: false, text: out ? 'Nur offene Leads lassen sich aussortieren.' : 'Der Lead ist nicht aussortiert.' };
      await db.transaction(async (tx) => {
        const reasons = out
          ? [...new Set([...lead.rejectionReasons, 'manual'])]
          : lead.rejectionReasons.filter((r) => r !== 'manual' && r !== 'score_too_low');
        await tx.update(leads).set({ rejectionReasons: reasons, updatedAt: new Date() }).where(eq(leads.id, lead.id));
        await transitionLead(tx, lead.id, out ? 'rejected' : 'discovered', { actor, reason: out ? 'manual' : 'manual_restore' });
      });
      revalidatePath('/admin/leads');
      return {
        ok: true,
        text: out ? `${lead.businessName} ist aussortiert.` : `${lead.businessName} ist wieder zur Prüfung.`,
        href: `/admin/leads/${lead.id}`,
      };
    }
    case 'warnungen_erledigen': {
      const db = getDb();
      const done = await db
        .update(alerts)
        .set({ acknowledgedAt: new Date() })
        .where(isNull(alerts.acknowledgedAt))
        .returning({ id: alerts.id });
      await audit(db, { entity: 'alert', entityId: 'all', action: 'acknowledge', actor, context: { n: done.length } });
      revalidatePath('/admin');
      return { ok: true, text: `${done.length} Warnung(en) erledigt.` };
    }
    case 'zielstadt_hinzufuegen':
    case 'zielstadt_entfernen': {
      const names = a.staedte.map((c) => c.trim()).filter((c) => /^[\p{L}][\p{L} .'-]{1,59}$/u.test(c));
      if (!names.length) return { ok: false, text: 'Welche Stadt?' };
      const lower = (c: string) => c.toLowerCase();
      const current = cfg.targeting.cities;
      const next =
        a.typ === 'zielstadt_hinzufuegen'
          ? [...current, ...names.filter((n) => !current.map(lower).includes(lower(n)))]
          : current.filter((c) => !names.map(lower).includes(lower(c)));
      if (!next.length) return { ok: false, text: 'Mindestens eine Zielstadt muss bleiben.' };
      await updateConfig({ targeting: { cities: next } }, actor);
      revalidatePath('/admin/suche');
      return { ok: true, text: `Zielstädte: ${next.join(', ')}.` };
    }
  }
}
