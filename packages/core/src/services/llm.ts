import { getConfig } from '../config/service';
import { getEnv } from '../config/env';
import { getDb } from '../db/client';
import { logger } from '../logger';
import { getProviders } from '../providers';
import type { LlmStructuredRequest, LlmTextRequest, LlmUsage } from '../providers/types';
import { LlmUsageError } from '../providers/types';
import { randomUUID } from 'node:crypto';
import {
  assertBudgetAvailable,
  assertLlmCostsReconciled,
  llmCostMicroCents,
  llmReservationCents,
  recordCost,
  reserveBudget,
  settleLlmReservation,
} from './budget';
import type { LlmBudgetGuard } from '../providers/types';

export type ModelTier = 'creative' | 'bulk' | 'assistant';

export function modelFor(tier: ModelTier): string {
  const env = getEnv();
  return tier === 'creative' ? env.MODEL_CREATIVE : tier === 'assistant' ? env.MODEL_ASSISTANT : env.MODEL_BULK;
}

function budgetGuard(purpose: string, leadId?: string): LlmBudgetGuard | undefined {
  if (getProviders().llm.name !== 'anthropic') return undefined;
  return {
    async beforeRequest(input) {
      const cfg = await getConfig({ fresh: true });
      const key = `llm-request:${randomUUID()}`;
      await reserveBudget(getDb(), {
        category: 'llm',
        estimateCents: llmReservationCents(cfg, input),
        idempotencyKey: key,
        leadId,
        ref: purpose,
      });
      return key;
    },
    async afterResponse(key, usage) {
      await settleLlmReservation(getDb(), key, usage);
      await assertLlmCostsReconciled();
      logger.info({ purpose, leadId, model: usage.model }, 'llm call (reserved and settled)');
    },
  };
}

async function book(usage: LlmUsage, purpose: string, leadId: string | undefined, idempotencyKey?: string): Promise<void> {
  const cfg = await getConfig();
  const micro = llmCostMicroCents(cfg, usage);
  await recordCost(getDb(), {
    category: 'llm',
    amountMicroCents: micro,
    leadId: leadId ?? null,
    ref: purpose,
    idempotencyKey,
    meta: {
      model: usage.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens,
      ...(usage.webSearchRequests ? { webSearchRequests: usage.webSearchRequests } : {}),
    },
  });
  logger.info(
    {
      purpose,
      leadId,
      model: usage.model,
      in: usage.inputTokens,
      out: usage.outputTokens,
      cacheRead: usage.cacheReadTokens,
      costMicroCents: micro,
    },
    'llm call',
  );
}

/** Strukturierte LLM-Ausgabe mit Budget-Prüfung und Kostenbuchung. */
async function bookAttempts(usages: LlmUsage[], purpose: string, leadId: string | undefined, key?: string) {
  for (const [index, usage] of usages.entries())
    await book(usage, purpose, leadId, key && index < usages.length - 1 ? `${key}:attempt:${index}` : key);
}

async function withUsageAccounting<T>(
  run: () => Promise<{ data: T; usage: LlmUsage; usages?: LlmUsage[] }>,
  purpose: string,
  leadId?: string,
  key?: string,
  accountedByProvider = false,
): Promise<T> {
  let res;
  try {
    res = await run();
  } catch (error) {
    if (!accountedByProvider && error instanceof LlmUsageError) await bookAttempts(error.usages, purpose, leadId, key);
    throw error;
  }
  if (!accountedByProvider) await bookAttempts(res.usages ?? [res.usage], purpose, leadId, key);
  return res.data;
}

export async function llmStructured<T>(
  req: Omit<LlmStructuredRequest, 'model'> & { tier: ModelTier; idempotencyKey?: string },
): Promise<T> {
  await assertBudgetAvailable('llm', 10);
  const { tier, idempotencyKey, ...rest } = req;
  const guard = budgetGuard(req.purpose, req.leadId);
  return withUsageAccounting(
    () => getProviders().llm.generateStructured<T>({ ...rest, model: modelFor(tier), budgetGuard: guard }),
    req.purpose,
    req.leadId,
    idempotencyKey,
    Boolean(guard),
  );
}

export async function llmText(
  req: Omit<LlmTextRequest, 'model'> & { tier: ModelTier; idempotencyKey?: string },
): Promise<string> {
  await assertBudgetAvailable('llm', 5);
  const { tier, idempotencyKey, ...rest } = req;
  const guard = budgetGuard(req.purpose, req.leadId);
  return withUsageAccounting(
    () => getProviders().llm.generateText({ ...rest, model: modelFor(tier), budgetGuard: guard }),
    req.purpose,
    req.leadId,
    idempotencyKey,
    Boolean(guard),
  );
}

/** Text mit Websuche: Bericht plus die tatsächlich gefundenen Quellen (Suchkosten im Ledger). */
export async function llmResearchText(
  req: Omit<LlmTextRequest, 'model'> & {
    tier: ModelTier;
    idempotencyKey?: string;
    webSearch: NonNullable<LlmTextRequest['webSearch']>;
  },
): Promise<{ text: string; sources: string[] }> {
  await assertBudgetAvailable('llm', 20);
  const { tier, idempotencyKey, ...rest } = req;
  const guard = budgetGuard(req.purpose, req.leadId);
  return withUsageAccounting(
    async () => {
      const res = await getProviders().llm.generateText({ ...rest, model: modelFor(tier), budgetGuard: guard });
      return { ...res, data: { text: res.data, sources: res.sources ?? [] } };
    },
    req.purpose,
    req.leadId,
    idempotencyKey,
    Boolean(guard),
  );
}
