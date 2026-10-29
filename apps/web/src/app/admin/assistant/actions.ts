'use server';

import { revalidatePath } from 'next/cache';
import {
  applyMinLeadScore,
  askAssistantAi,
  assistantActionSchema,
  describeAction,
  getConfig,
  getEnv,
  logger,
  runCommand,
  updateConfig,
  type AssistantAction,
  type AssistantTurn,
} from '@wbm/core';
import { assistantSnapshot } from '@/lib/assistant-snapshot';
import { actorOf, requireAdmin } from '@/lib/auth';
import { enqueueLeadSearch, stopLeadSearch } from '@/lib/lead-search';

export interface AssistantAnswer {
  antwort: string;
  modus: 'ki' | 'befehle';
  aktionen: (AssistantAction & { label: string })[];
  hinweis?: string;
}

/** Eine Nachricht an den Assistenten. Mit KI nur, wenn eingeschaltet und ein Anthropic-Schlüssel vorhanden ist. */
export async function askAssistant(history: AssistantTurn[]): Promise<AssistantAnswer> {
  await requireAdmin();
  const turns = history
    .filter((h) => (h.role === 'user' || h.role === 'assistant') && typeof h.text === 'string')
    .slice(-12)
    .map((h) => ({ role: h.role, text: h.text.slice(0, 2000) }));
  const last = [...turns].reverse().find((h) => h.role === 'user');
  if (!last?.text.trim()) return { antwort: 'Schreib mir einfach, was du brauchst.', modus: 'befehle', aktionen: [] };
  const [cfg, snap] = await Promise.all([getConfig(), assistantSnapshot()]);
  const aiReady = cfg.assistant.useAi && Boolean(getEnv().ANTHROPIC_API_KEY);
  let reply = runCommand(last.text, snap);
  let hinweis: string | undefined;
  if (aiReady) {
    try {
      reply = await askAssistantAi(snap, turns);
    } catch (err) {
      logger.warn({ err: err instanceof Error ? err.name : 'unknown' }, 'assistent: KI nicht erreichbar, Befehlsmodus');
      hinweis = 'KI gerade nicht erreichbar – Antwort aus dem Befehlsmodus.';
    }
  }
  return {
    antwort: reply.antwort,
    modus: reply.modus,
    aktionen: reply.aktionen.map((a) => ({ ...a, label: describeAction(a, snap) })),
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
  }
}
