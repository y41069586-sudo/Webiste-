import { getConfig } from '../config/service';
import { getEnv } from '../config/env';
import { getDb } from '../db/client';
import { logger } from '../logger';
import { getProviders } from '../providers';
import type { LlmStructuredRequest, LlmTextRequest, LlmUsage } from '../providers/types';
import { LlmUsageError } from '../providers/types';
import { assertBudgetAvailable, llmCostMicroCents, recordCost } from './budget';

export type ModelTier = 'creative' | 'bulk' | 'assistant';

export function modelFor(tier: ModelTier): string {
  const env = getEnv();
  return tier === 'creative' ? env.MODEL_CREATIVE : tier === 'assistant' ? env.MODEL_ASSISTANT : env.MODEL_BULK;
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
): Promise<T> {
  let res;
  try {
    res = await run();
  } catch (error) {
    if (error instanceof LlmUsageError) await bookAttempts(error.usages, purpose, leadId, key);
    throw error;
  }
  await bookAttempts(res.usages ?? [res.usage], purpose, leadId, key);
  return res.data;
}

export async function llmStructured<T>(
  req: Omit<LlmStructuredRequest, 'model'> & { tier: ModelTier; idempotencyKey?: string },
): Promise<T> {
  await assertBudgetAvailable('llm', 10);
  const { tier, idempotencyKey, ...rest } = req;
  return withUsageAccounting(
    () => getProviders().llm.generateStructured<T>({ ...rest, model: modelFor(tier) }),
    req.purpose,
    req.leadId,
    idempotencyKey,
  );
}

export async function llmText(
  req: Omit<LlmTextRequest, 'model'> & { tier: ModelTier; idempotencyKey?: string },
): Promise<string> {
  await assertBudgetAvailable('llm', 5);
  const { tier, idempotencyKey, ...rest } = req;
  return withUsageAccounting(
    () => getProviders().llm.generateText({ ...rest, model: modelFor(tier) }),
    req.purpose,
    req.leadId,
    idempotencyKey,
  );
}
