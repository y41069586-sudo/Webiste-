import { getConfig } from '../config/service';
import { getEnv } from '../config/env';
import { getDb } from '../db/client';
import { logger } from '../logger';
import { getProviders } from '../providers';
import type { LlmStructuredRequest, LlmTextRequest, LlmUsage } from '../providers/types';
import { assertBudgetAvailable, llmCostMicroCents, recordCost } from './budget';

export type ModelTier = 'creative' | 'bulk';

export function modelFor(tier: ModelTier): string {
  const env = getEnv();
  return tier === 'creative' ? env.MODEL_CREATIVE : env.MODEL_BULK;
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
export async function llmStructured<T>(
  req: Omit<LlmStructuredRequest, 'model'> & { tier: ModelTier; idempotencyKey?: string },
): Promise<T> {
  await assertBudgetAvailable('llm', 10);
  const { tier, idempotencyKey, ...rest } = req;
  const res = await getProviders().llm.generateStructured<T>({ ...rest, model: modelFor(tier) });
  await book(res.usage, req.purpose, req.leadId, idempotencyKey);
  return res.data;
}

export async function llmText(
  req: Omit<LlmTextRequest, 'model'> & { tier: ModelTier; idempotencyKey?: string },
): Promise<string> {
  await assertBudgetAvailable('llm', 5);
  const { tier, idempotencyKey, ...rest } = req;
  const res = await getProviders().llm.generateText({ ...rest, model: modelFor(tier) });
  await book(res.usage, req.purpose, req.leadId, idempotencyKey);
  return res.data;
}
