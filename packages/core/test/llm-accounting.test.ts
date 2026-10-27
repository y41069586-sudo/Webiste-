import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), record: vi.fn(), budget: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    beta = { messages: { create: mocks.create } };
  },
}));
vi.mock('../src/config/service', () => ({ getConfig: async () => ({}) }));
vi.mock('../src/services/budget', () => ({
  assertBudgetAvailable: mocks.budget,
  recordCost: mocks.record,
  llmCostMicroCents: () => 1,
}));
vi.mock('../src/db/client', () => ({ getDb: () => ({}) }));
vi.mock('../src/providers', () => ({ getProviders: () => ({ llm: new AnthropicLlm('fixture-key', false) }) }));
import { AnthropicLlm, LlmRefusalError } from '../src/providers/llm/anthropic';
import { LlmUsageError } from '../src/providers/types';
import { llmStructured, llmText } from '../src/services/llm';
const req = {
  model: 'fixture-a',
  system: 'test',
  prompt: 'test',
  toolName: 'answer',
  toolDescription: 'test',
  inputSchema: {},
  purpose: 'test',
};
const response = (model: string, tool = false) => ({
  model,
  stop_reason: 'end_turn',
  usage: { input_tokens: 100, output_tokens: 10 },
  content: tool ? [{ type: 'tool_use', name: 'answer', input: { ok: true } }] : [{ type: 'text', text: 'No tool yet' }],
});
beforeEach(() => vi.clearAllMocks());
it('accounts for every response at its actual model price when tool use needs a retry', async () => {
  mocks.create.mockResolvedValueOnce(response('fixture-a')).mockResolvedValueOnce(response('fixture-b', true));
  const result = await llmStructured({ ...req, tier: 'creative', idempotencyKey: 'fixture-request' });
  expect(result).toEqual({ ok: true });
  expect(mocks.record).toHaveBeenCalledTimes(2);
  expect(mocks.record.mock.calls.map((c) => c[1].meta.model)).toEqual(['fixture-a', 'fixture-b']);
  expect(mocks.record.mock.calls.map((c) => c[1].idempotencyKey)).toEqual(['fixture-request:attempt:0', 'fixture-request']);
});
it('retains and books known charges when a later attempt fails in transport', async () => {
  mocks.create.mockResolvedValueOnce(response('fixture-a')).mockRejectedValueOnce(Error('transport'));
  await expect(llmStructured({ ...req, tier: 'bulk' })).rejects.toBeInstanceOf(LlmUsageError);
  expect(mocks.record).toHaveBeenCalledTimes(1);
});
it('books refusal responses without retrying a refused text request', async () => {
  mocks.create.mockResolvedValueOnce({ ...response('fixture-a'), stop_reason: 'refusal', stop_details: { category: 'test' } });
  await expect(llmText({ tier: 'bulk', system: 'test', prompt: 'test', purpose: 'test' })).rejects.toBeInstanceOf(
    LlmRefusalError,
  );
  expect(mocks.record).toHaveBeenCalledTimes(1);
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it('preserves both billed responses when neither produces the required tool', async () => {
  mocks.create.mockResolvedValue(response('fixture-a'));
  await expect(new AnthropicLlm('fixture', false).generateStructured(req)).rejects.toMatchObject({
    usages: [expect.any(Object), expect.any(Object)],
  });
  expect(mocks.create).toHaveBeenCalledTimes(2);
});
