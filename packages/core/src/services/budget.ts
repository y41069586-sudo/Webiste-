import { and, eq, gte, inArray, or, sql } from 'drizzle-orm';
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
  customerId?: string | null;
  incurredAt?: Date;
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
      customerId: entry.customerId ?? null,
      incurredAt: entry.incurredAt,
      ref: entry.ref,
      idempotencyKey: entry.idempotencyKey,
      meta: entry.meta ?? {},
      estimated: entry.estimated ?? false,
    })
    .onConflictDoNothing({ target: budgetLedger.idempotencyKey });
}

/** Ersetzt eine geschätzte Buchung durch die tatsächlichen Kosten. */
export async function settleCost(
  db: DbOrTx,
  idempotencyKey: string,
  actualCents: number,
  meta?: Record<string, unknown>,
): Promise<void> {
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
  const spent = category === 'llm' ? await reservedLlmSpend(db, weekStart) : await spentSince(db, weekStart, [category]);
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
    if (input.category === 'llm') await assertLlmCostsReconciled(tx);
    const existing = await tx.query.budgetLedger.findFirst({ where: eq(budgetLedger.idempotencyKey, input.idempotencyKey) });
    const weekStart = startOfIsoWeek(now);
    const spent =
      input.category === 'llm' ? await reservedLlmSpend(tx, weekStart) : await spentSince(tx, weekStart, [input.category]);
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

/** Unresolved requests remain charged across week boundaries; never expire an uncertain bill. */
async function reservedLlmSpend(db: DbOrTx, since: Date): Promise<number> {
  const r = await db
    .select({
      micro: sql<string>`coalesce(sum(${budgetLedger.amountCents}::bigint * 1000000 + ${budgetLedger.amountMicroCents}),0)`,
    })
    .from(budgetLedger)
    .where(and(eq(budgetLedger.category, 'llm'), or(gte(budgetLedger.createdAt, since), eq(budgetLedger.estimated, true))));
  return Math.ceil(Number(r[0]?.micro ?? 0) / 1e6);
}

export function llmReservationCents(
  cfg: AppConfig,
  input: { model: string; inputTokens: number; maxOutputTokens: number; maxSearches: number },
): number {
  const key = Object.keys(cfg.costs.llm)
    .sort((a, b) => b.length - a.length)
    .find((k) => input.model === k || input.model.startsWith(`${k}-`));
  const p = key ? cfg.costs.llm[key] : undefined;
  if (
    !p ||
    [p.inputPerMTokCents, p.outputPerMTokCents, p.cacheReadPerMTokCents, p.cacheWritePerMTokCents].some(
      (n) => !Number.isFinite(n) || n < 0,
    ) ||
    p.inputPerMTokCents <= 0 ||
    p.outputPerMTokCents <= 0 ||
    [input.inputTokens, input.maxOutputTokens, input.maxSearches].some((n) => !Number.isSafeInteger(n) || n < 0)
  )
    throw new Error('LLM-Kosten nicht verlässlich konfiguriert; kein kostenpflichtiger Aufruf.');
  // Count endpoint is an estimate: reserve extra input overhead and the full output, no cache discount.
  // Web tools pass the model's entire advertised input limit rather than guessed search-result sizes.
  const tokens = Math.ceil(input.inputTokens * 1.1) + 1024;
  const micro =
    (tokens * Math.max(p.inputPerMTokCents, p.cacheWritePerMTokCents, p.cacheReadPerMTokCents) +
      input.maxOutputTokens * p.outputPerMTokCents +
      input.maxSearches * cfg.costs.webSearchPer1000UsdCents * 1000) *
    Math.max(1, cfg.costs.usdToEur) *
    1.1;
  return Math.max(1, Math.ceil(micro / 1e6));
}

/** Convert one reservation into one known bill. Keep uncertain/failed responses reserved. */
export async function settleLlmReservation(db: Db, key: string, usage: LlmUsage): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('budget:llm'))`);
    const row = await tx.query.budgetLedger.findFirst({ where: eq(budgetLedger.idempotencyKey, key) });
    if (!row || row.category !== 'llm' || !row.estimated)
      throw new Error('LLM-Kostenreservierung fehlt oder wurde bereits abgeschlossen.');
    const cfg = await getConfig({ fresh: true, db: tx });
    if ([usage.cacheReadTokens, usage.cacheWriteTokens].some((n) => !Number.isSafeInteger(n) || n < 0))
      throw new Error('Ungültige LLM-Nutzungswerte; Reservierung bleibt bis zur Klärung bestehen.');
    // Revalidate the actual response model too; never silently price a fallback as another model.
    llmReservationCents(cfg, {
      model: usage.model,
      inputTokens: usage.inputTokens,
      maxOutputTokens: usage.outputTokens,
      maxSearches: usage.webSearchRequests ?? 0,
    });
    const micro = llmCostMicroCents(cfg, usage);
    const reserved = row.amountCents * 1e6 + row.amountMicroCents;
    const overrun = micro > reserved;
    await tx
      .update(budgetLedger)
      .set({
        amountCents: Math.floor(micro / 1e6),
        amountMicroCents: micro % 1e6,
        estimated: false,
        meta: {
          model: usage.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cacheReadTokens: usage.cacheReadTokens,
          cacheWriteTokens: usage.cacheWriteTokens,
          webSearchRequests: usage.webSearchRequests ?? 0,
          reservedCents: reserved / 1e6,
          ...(overrun ? { budgetOverrun: true } : {}),
        },
      })
      .where(eq(budgetLedger.idempotencyKey, key));
    if (overrun)
      await raiseAlert(tx, {
        level: 'error',
        code: 'llm_budget_overrun',
        message: 'LLM-Abrechnung überschreitet die Reservierung; KI bis zur Kostenprüfung gesperrt.',
      });
  });
}

export async function assertLlmCostsReconciled(db: DbOrTx = getDb()): Promise<void> {
  const result = await db.execute(
    sql`SELECT 1 FROM budget_ledger WHERE category='llm' AND meta->>'budgetOverrun'='true' LIMIT 1`,
  );
  if (result.rows.length) throw new Error('LLM-Kostenabweichung muss vor weiteren KI-Aufrufen geklärt werden.');
}

/** Prüft ohne zu reservieren (z. B. für Places/LLM, deren Kosten erst danach feststehen). */
export async function assertBudgetAvailable(
  category: BudgetCategory,
  estimateCents: number,
  db: DbOrTx = getDb(),
): Promise<void> {
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
    usage.cacheWriteTokens * price.cacheWritePerMTokCents +
    // Websuche: Preis je 1.000 Suchen in US-Cent → Mikro-Cent je Suche
    (usage.webSearchRequests ?? 0) * (cfg.costs.webSearchPer1000UsdCents ?? 1000) * 1000;
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
