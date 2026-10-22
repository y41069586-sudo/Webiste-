import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb, type Db, type DbOrTx } from '../db/client';
import { alerts, budgetLedger } from '../db/schema';
import type { LlmUsage } from '../providers/types';
import type { BudgetCategory } from '../types';
import { startOfIsoWeek } from '../util/time';

export class KillSwitchError extends Error {
  constructor() {
    super('Not-Aus ist aktiv – kostenpflichtige Aktionen sind gestoppt.');
    this.name = 'KillSwitchError';
  }
}

export class BudgetExceededError extends Error {
  constructor(
    public readonly category: BudgetCategory,
    public readonly spentCents: number,
    public readonly limitCents: number,
    public readonly requestedCents: number,
  ) {
    super(
      `Budget erreicht (${category}): ausgegeben ${(spentCents / 100).toFixed(2)} €, ` +
        `Limit ${(limitCents / 100).toFixed(2)} €, angefragt ${(requestedCents / 100).toFixed(2)} €`,
    );
    this.name = 'BudgetExceededError';
  }
}

/** Wirft, wenn der Not-Aus aktiv ist. Vor JEDER kostenpflichtigen Aktion aufrufen. */
export async function assertNotHalted(cfg?: AppConfig): Promise<void> {
  const c = cfg ?? (await getConfig({ fresh: true }));
  if (effectiveSwitches(c).killSwitch) throw new KillSwitchError();
}

export interface CostEntry {
  category: BudgetCategory;
  /** Ganze Cent */
  amountCents?: number;
  /** Alternativ: Betrag in Mikro-Cent (1e-6 Cent), z. B. für LLM */
  amountMicroCents?: number;
  leadId?: string | null;
  ref?: string;
  idempotencyKey?: string;
  meta?: Record<string, unknown>;
  estimated?: boolean;
}

/** Bucht Kosten idempotent (gleicher idempotencyKey ⇒ keine Doppelbuchung). */
export async function recordCost(db: DbOrTx, entry: CostEntry): Promise<void> {
  const totalMicro = Math.round((entry.amountCents ?? 0) * 1e6 + (entry.amountMicroCents ?? 0));
  const cents = Math.floor(totalMicro / 1e6);
  const micro = totalMicro - cents * 1e6;
  await db
    .insert(budgetLedger)
    .values({
      category: entry.category,
      amountCents: cents,
      amountMicroCents: micro,
      leadId: entry.leadId ?? null,
      ref: entry.ref,
      idempotencyKey: entry.idempotencyKey,
      meta: entry.meta ?? {},
      estimated: entry.estimated ?? false,
    })
    .onConflictDoNothing({ target: budgetLedger.idempotencyKey });
}

/** Ersetzt eine geschätzte Buchung durch die tatsächlichen Kosten. */
export async function settleCost(db: DbOrTx, idempotencyKey: string, actualCents: number, meta?: Record<string, unknown>): Promise<void> {
  await db
    .update(budgetLedger)
    .set({ amountCents: actualCents, amountMicroCents: 0, estimated: false, ...(meta ? { meta } : {}) })
    .where(eq(budgetLedger.idempotencyKey, idempotencyKey));
}

export async function releaseReservation(db: DbOrTx, idempotencyKey: string): Promise<void> {
  await db.delete(budgetLedger).where(and(eq(budgetLedger.idempotencyKey, idempotencyKey), eq(budgetLedger.estimated, true)));
}

/** Summe der Kosten (Cent, gerundet) seit `since` für die Kategorien. */
export async function spentSince(db: DbOrTx, since: Date, categories?: BudgetCategory[]): Promise<number> {
  const where = categories?.length
    ? and(gte(budgetLedger.createdAt, since), inArray(budgetLedger.category, categories))
    : gte(budgetLedger.createdAt, since);
  const rows = await db
    .select({
      cents: sql<string>`coalesce(sum(${budgetLedger.amountCents}), 0)`,
      micro: sql<string>`coalesce(sum(${budgetLedger.amountMicroCents}), 0)`,
    })
    .from(budgetLedger)
    .where(where);
  const r = rows[0];
  return Math.round(Number(r?.cents ?? 0) + Number(r?.micro ?? 0) / 1e6);
}

export function weeklyLimit(cfg: AppConfig, category: BudgetCategory): number | null {
  switch (category) {
    case 'letter':
      return cfg.budget.weeklyBudgetCents;
    case 'places_api':
      return cfg.budget.weeklyPlacesBudgetCents;
    case 'llm':
      return cfg.budget.weeklyLlmBudgetCents;
    default:
      return null; // Domain/Hosting werden pro Kunde aus dem Umsatz bezahlt
  }
}

export interface BudgetStatus {
  category: BudgetCategory;
  spentCents: number;
  limitCents: number | null;
  remainingCents: number | null;
  weekStart: Date;
}

export async function budgetStatus(category: BudgetCategory, db: DbOrTx = getDb(), now = new Date()): Promise<BudgetStatus> {
  const cfg = await getConfig({ db });
  const weekStart = startOfIsoWeek(now);
  const spent = await spentSince(db, weekStart, [category]);
  const limit = weeklyLimit(cfg, category);
  return {
    category,
    spentCents: spent,
    limitCents: limit,
    remainingCents: limit === null ? null : Math.max(0, limit - spent),
    weekStart,
  };
}

/**
 * Budget-Guard mit Reservierung: prüft unter einer Advisory-Lock-Sperre, ob die
 * geschätzten Kosten ins Wochenbudget passen, und reserviert sie (estimated=true).
 * Nach der Aktion: settleCost(…) mit den echten Kosten oder releaseReservation(…).
 */
export async function reserveBudget(
  db: Db,
  input: { category: BudgetCategory; estimateCents: number; idempotencyKey: string; leadId?: string; ref?: string },
  now = new Date(),
): Promise<BudgetStatus> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`budget:${input.category}`}))`);
    const cfg = await getConfig({ fresh: true, db: tx });
    if (effectiveSwitches(cfg).killSwitch) throw new KillSwitchError();
    const existing = await tx.query.budgetLedger.findFirst({ where: eq(budgetLedger.idempotencyKey, input.idempotencyKey) });
    const weekStart = startOfIsoWeek(now);
    const spent = await spentSince(tx, weekStart, [input.category]);
    const limit = weeklyLimit(cfg, input.category);
    if (!existing) {
      if (limit !== null && spent + input.estimateCents > limit) {
        await raiseAlert(tx, {
          level: 'warn',
          code: `budget_reached:${input.category}`,
          message: `Wochenbudget für ${input.category} erreicht – Aktionen gestoppt.`,
          context: { spentCents: spent, limitCents: limit, requestedCents: input.estimateCents },
        });
        throw new BudgetExceededError(input.category, spent, limit, input.estimateCents);
      }
      await recordCost(tx, {
        category: input.category,
        amountCents: input.estimateCents,
        idempotencyKey: input.idempotencyKey,
        leadId: input.leadId,
        ref: input.ref,
        estimated: true,
      });
    }
    const spentAfter = existing ? spent : spent + input.estimateCents;
    return {
      category: input.category,
      spentCents: spentAfter,
      limitCents: limit,
      remainingCents: limit === null ? null : Math.max(0, limit - spentAfter),
      weekStart,
    };
  });
}

/** Prüft ohne zu reservieren (z. B. für Places/LLM, deren Kosten erst danach feststehen). */
export async function assertBudgetAvailable(category: BudgetCategory, estimateCents: number, db: DbOrTx = getDb()): Promise<void> {
  const cfg = await getConfig({ db });
  if (effectiveSwitches(cfg).killSwitch) throw new KillSwitchError();
  const limit = weeklyLimit(cfg, category);
  if (limit === null) return;
  const spent = await spentSince(db, startOfIsoWeek(new Date()), [category]);
  if (spent + estimateCents > limit) {
    await raiseAlert(db, {
      level: 'warn',
      code: `budget_reached:${category}`,
      message: `Wochenbudget für ${category} erreicht – Aktionen gestoppt.`,
      context: { spentCents: spent, limitCents: limit },
    });
    throw new BudgetExceededError(category, spent, limit, estimateCents);
  }
}

/** LLM-Kosten in Mikro-Cent (EUR) aus den Token-Zahlen. */
export function llmCostMicroCents(cfg: AppConfig, usage: LlmUsage): number {
  const model = usage.model.replace(/^mock:/, '');
  if (usage.model.startsWith('mock:')) return 0;
  const price =
    cfg.costs.llm[model] ??
    Object.entries(cfg.costs.llm).find(([k]) => model.startsWith(k))?.[1] ??
    cfg.costs.llm['claude-opus-5-5'];
  if (!price) return 0;
  const usdMicro =
    usage.inputTokens * price.inputPerMTokCents +
    usage.outputTokens * price.outputPerMTokCents +
    usage.cacheReadTokens * price.cacheReadPerMTokCents +
    usage.cacheWriteTokens * price.cacheWritePerMTokCents;
  return Math.round(usdMicro * cfg.costs.usdToEur);
}

/** Dashboard-Meldung (dedupliziert offene Meldungen mit gleichem Code innerhalb von 6 h). */
export async function raiseAlert(
  db: DbOrTx,
  a: { level: 'info' | 'warn' | 'error'; code: string; message: string; context?: Record<string, unknown> },
): Promise<void> {
  const recent = await db.execute<{ id: string }>(
    sql`SELECT id FROM alerts WHERE code = ${a.code} AND acknowledged_at IS NULL AND created_at > now() - interval '6 hours' LIMIT 1`,
  );
  if (recent.rows.length > 0) return;
  await db.insert(alerts).values({ level: a.level, code: a.code, message: a.message, context: a.context ?? {} });
}
