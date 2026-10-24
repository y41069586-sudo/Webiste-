import { and, eq, isNotNull, lt, sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { leads, objections } from '../db/schema';
import { CLASSIFY_SCHEMA, CLASSIFY_SYSTEM, CLASSIFY_TOOL } from '../support/prompts';
import { OBJECTION_CATEGORIES, type Industry, type ObjectionCategory } from '../types';
import { sha256 } from '../util/crypto';
import { addDays } from '../util/time';
import { audit } from './audit';
import { llmStructured } from './llm';

/**
 * Einwände (L6, B6.5/B7): Kategorie dauerhaft, Text nur 90 Tage (Lösch-Job). Grundlage für den
 * Wochenbericht des Lern-Agents und die Einwand-Übersicht im Dashboard.
 */
export const OBJECTION_TEXT_DAYS = 90;

export interface ObjectionInput {
  leadId: string | null;
  /** Branche aus diesem Lead übernehmen (auch wenn leadId bewusst leer bleibt, z. B. bei Widerspruch) */
  industryFromLeadId?: string | null;
  industry?: Industry | null;
  source: 'whatsapp' | 'form' | 'email';
  category: ObjectionCategory;
  text: string | null;
  supportMessageId?: string | null;
}

export async function recordObjection(db: DbOrTx, i: ObjectionInput): Promise<void> {
  let industry = i.industry ?? null;
  const fromLead = i.industryFromLeadId ?? i.leadId;
  if (!industry && fromLead) {
    const l = await db.query.leads.findFirst({ where: eq(leads.id, fromLead), columns: { industry: true } });
    industry = l?.industry ?? null;
  }
  const normalized = (i.text ?? '').replace(/\s+/g, ' ').trim();
  await db
    .insert(objections)
    .values({
      leadId: i.leadId,
      industry,
      source: i.source,
      category: i.category,
      textHash: sha256(normalized || `${i.category}:${Date.now()}`),
      text: normalized ? normalized.slice(0, 1000) : null,
      supportMessageId: i.supportMessageId ?? null,
    })
    .onConflictDoNothing();
}

/**
 * WhatsApp-Frage von Hand erfassen (WhatsApp ist nur ein Link, über den der Betrieb uns schreibt – es gibt
 * keine Anbindung). Der Text wird klassifiziert; gespeichert werden Kategorie, Hash und der Text für 90 Tage.
 */
export async function recordManualObjection(
  input: { leadId: string | null; text: string; source?: 'whatsapp' | 'email' | 'form' },
  actor: string,
  db: DbOrTx = getDb(),
): Promise<ObjectionCategory | null> {
  const text = input.text.trim().slice(0, 4000);
  if (!text) return null;
  const c = await llmStructured<{ objection: ObjectionCategory | 'keiner' }>({
    tier: 'bulk',
    system: CLASSIFY_SYSTEM,
    prompt: `Betreff: WhatsApp-Nachricht\n\nNachricht:\n${text}`,
    toolName: CLASSIFY_TOOL,
    toolDescription: 'Klassifiziert die Nachricht.',
    inputSchema: CLASSIFY_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 400,
    effort: 'low',
    purpose: 'objection_classify',
    leadId: input.leadId ?? undefined,
  });
  const category = OBJECTION_CATEGORIES.includes(c.objection as ObjectionCategory) ? (c.objection as ObjectionCategory) : null;
  if (!category) return null;
  await recordObjection(db, { leadId: input.leadId, source: input.source ?? 'whatsapp', category, text });
  await audit(db, {
    entity: 'objection',
    entityId: input.leadId ?? 'ohne-lead',
    action: 'recorded',
    actor,
    context: { category },
  });
  return category;
}

export interface ObjectionStat {
  industry: string;
  category: ObjectionCategory;
  count: number;
}

/** Häufigkeit je Branche und Kategorie seit `from`. */
export async function objectionStats(from: Date, db: DbOrTx = getDb()): Promise<ObjectionStat[]> {
  const res = await db.execute<{ industry: string | null; category: ObjectionCategory; n: number }>(sql`
    SELECT industry, category, count(*)::int AS n FROM objections WHERE created_at >= ${from.toISOString()}::timestamptz
    GROUP BY industry, category ORDER BY n DESC, category`);
  return res.rows.map((r) => ({ industry: r.industry ?? 'unbekannt', category: r.category, count: Number(r.n) }));
}

/** Verlauf je Woche und Kategorie (Dashboard). */
export async function objectionTrend(weeks = 12, db: DbOrTx = getDb()) {
  const res = await db.execute<{ week: string; category: ObjectionCategory; n: number }>(sql`
    SELECT to_char(date_trunc('week', created_at), 'IYYY-"KW"IW') AS week, category, count(*)::int AS n
    FROM objections WHERE created_at >= now() - make_interval(weeks => ${weeks})
    GROUP BY 1, 2 ORDER BY 1, 2`);
  return res.rows.map((r) => ({ week: r.week, category: r.category, count: Number(r.n) }));
}

/** Lösch-Job: Texte nach 90 Tagen entfernen, Kategorie und Hash bleiben. */
export async function purgeObjectionTexts(now = new Date(), db: DbOrTx = getDb()): Promise<number> {
  const res = await db
    .update(objections)
    .set({ text: null })
    .where(and(isNotNull(objections.text), lt(objections.createdAt, addDays(now, -OBJECTION_TEXT_DAYS))))
    .returning({ id: objections.id });
  return res.length;
}
