import { beforeEach, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ create: vi.fn(), count: vi.fn(), model: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    beta = { messages: { create: sdk.create, countTokens: sdk.count } };
    models = { retrieve: sdk.model };
  },
}));
import { getDb } from '../src/db/client';
import { budgetLedger } from '../src/db/schema';
import { updateConfig } from '../src/config/service';
import { resetDb } from './helpers';
import { setProviders } from '../src/providers';
import { AnthropicLlm } from '../src/providers/llm/anthropic';
import { llmText, llmStructured, llmResearchText } from '../src/services/llm';
import { budgetStatus, recordCost, reserveBudget } from '../src/services/budget';
import { eq } from 'drizzle-orm';
const req = { tier: 'creative' as const, system: 'source facts', prompt: 'test', purpose: 'budget-test', maxTokens: 1000 };
const response = (stop = 'end_turn', tool = false) => ({
  model: 'claude-opus-5-5',
  stop_reason: stop,
  usage: { input_tokens: 100, output_tokens: 10 },
  content: tool ? [{ type: 'tool_use', name: 'answer', input: { ok: true } }] : [{ type: 'text', text: 'ok' }],
});
beforeEach(async () => {
  await resetDb();
  await updateConfig({ budget: { weeklyLlmBudgetCents: 25 } }, 'test');
  setProviders({ llm: new AnthropicLlm('never-used-test-key', true) });
  vi.clearAllMocks();
  sdk.count.mockResolvedValue({ input_tokens: 1000 });
  sdk.model.mockResolvedValue({ max_input_tokens: 200000 });
});
it('concurrent unknown outcomes cannot reserve the same remaining money; no SDK retries or fallback', async () => {
  sdk.create.mockRejectedValue(new Error('unknown transport outcome'));
  await Promise.allSettled(Array.from({ length: 12 }, () => llmText(req)));
  expect(sdk.create).toHaveBeenCalledTimes(6); // six independent four-cent reservations, one euro is not reused
  expect((await budgetStatus('llm')).spentCents).toBe(24);
  const rows = await getDb().select().from(budgetLedger);
  expect(rows).toHaveLength(6);
  expect(rows.every((r) => r.estimated)).toBe(true);
  for (const [payload, options] of sdk.create.mock.calls) {
    expect(payload.fallbacks).toBeUndefined();
    expect(options.maxRetries).toBe(0);
  }
});
it('settles every physical response exactly once and uses a new reservation for repeated business keys', async () => {
  sdk.create.mockResolvedValue(response());
  await llmText({ ...req, idempotencyKey: 'same-business-event' });
  await llmText({ ...req, idempotencyKey: 'same-business-event' });
  const rows = await getDb().select().from(budgetLedger);
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => !r.estimated)).toBe(true);
  expect(new Set(rows.map((r) => r.idempotencyKey)).size).toBe(2);
  expect(rows.reduce((s, r) => s + r.amountCents * 1e6 + r.amountMicroCents, 0)).toBe(108000);
});
it('budgets tool retries separately, including doubled output limits', async () => {
  sdk.create.mockResolvedValueOnce(response('max_tokens', true)).mockResolvedValueOnce(response('end_turn', true));
  await expect(
    llmStructured({ ...req, toolName: 'answer', toolDescription: 'answer', inputSchema: { type: 'object' } }),
  ).resolves.toEqual({ ok: true });
  const rows = await getDb().select().from(budgetLedger);
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.meta.reservedCents)).toEqual([4, 6]);
});
it('rejects a search before generation when maximum search-context cost does not fit', async () => {
  await expect(llmResearchText({ ...req, webSearch: { maxUses: 8 } })).rejects.toThrow('Budget');
  expect(sdk.model).toHaveBeenCalledTimes(1);
  expect(sdk.create).not.toHaveBeenCalled();
});
it('keeps old unresolved requests in the new week budget', async () => {
  await recordCost(getDb(), { category: 'llm', amountCents: 24, idempotencyKey: 'old', estimated: true });
  await getDb()
    .update(budgetLedger)
    .set({ createdAt: new Date('2020-01-01') })
    .where(eq(budgetLedger.idempotencyKey, 'old'));
  await expect(llmText(req)).rejects.toThrow('Budget');
  expect(sdk.create).not.toHaveBeenCalled();
  expect((await budgetStatus('llm')).spentCents).toBe(24);
});
it('does not round fractional cents down when admitting another request', async () => {
  await recordCost(getDb(), { category: 'llm', amountCents: 21, amountMicroCents: 100000 });
  await expect(reserveBudget(getDb(), { category: 'llm', estimateCents: 4, idempotencyKey: 'fractional' })).rejects.toThrow(
    'Budget',
  );
  expect(sdk.create).not.toHaveBeenCalled();
});
it('does not generate if token counting fails', async () => {
  sdk.count.mockRejectedValue(new Error('count unavailable'));
  await expect(llmText(req)).rejects.toThrow('count unavailable');
  expect(sdk.create).not.toHaveBeenCalled();
  expect(await getDb().select().from(budgetLedger)).toHaveLength(0);
});
it('records a price overrun and blocks the next request for reconciliation', async () => {
  sdk.create.mockResolvedValue({ ...response(), usage: { input_tokens: 50000, output_tokens: 5000 } });
  await expect(llmText(req)).rejects.toThrow('Kostenabweichung');
  expect((await getDb().select().from(budgetLedger))[0]!.meta.budgetOverrun).toBe(true);
  await expect(llmText(req)).rejects.toThrow();
  expect(sdk.create).toHaveBeenCalledTimes(1);
});
