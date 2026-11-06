import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create: vi.fn(), count: vi.fn(), record: vi.fn(), budget: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    beta = { messages: { create: mocks.create, countTokens: mocks.count } };
  },
}));
vi.mock('../src/config/service', () => ({ getConfig: async () => ({}) }));
vi.mock('../src/services/budget', () => ({
  assertBudgetAvailable: mocks.budget,
  recordCost: mocks.record,
  llmCostMicroCents: () => 1,
}));
vi.mock('../src/db/client', () => ({ getDb: () => ({}) }));
// Compatibility accounting for providers that return accumulated usage (no physical-request hooks).
vi.mock('../src/providers', () => ({
  getProviders: () => ({ llm: Object.assign(new AnthropicLlm('fixture-key', false), { name: 'fixture' }) }),
}));
import { AnthropicLlm, LlmRefusalError, LlmOutputLimitError } from '../src/providers/llm/anthropic';
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
it('admits and settles exactly one physical studio call even when its output is truncated', async () => {
  mocks.count.mockResolvedValueOnce({ input_tokens: 100 });
  mocks.create.mockResolvedValueOnce({ ...response('fixture-a'), stop_reason: 'max_tokens' });
  const guard = {
    beforeRequest: vi.fn().mockResolvedValue('reservation-one'),
    afterResponse: vi.fn().mockResolvedValue(undefined),
  };
  await expect(
    new AnthropicLlm('fixture', true).generateStructured({ ...req, maxTokens: 8000, maxAttempts: 1, budgetGuard: guard }),
  ).rejects.toBeInstanceOf(LlmOutputLimitError);
  expect(guard.beforeRequest).toHaveBeenCalledExactlyOnceWith({
    model: 'fixture-a',
    inputTokens: 100,
    maxOutputTokens: 8000,
    maxSearches: 0,
  });
  expect(guard.afterResponse).toHaveBeenCalledTimes(1);
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it('does not silently repeat a studio call truncated before a tool and retains its charge', async () => {
  mocks.create.mockResolvedValueOnce({ ...response('fixture-a'), stop_reason: 'max_tokens' });
  await expect(llmStructured({ ...req, tier: 'creative', maxTokens: 8000, maxAttempts: 1 })).rejects.toBeInstanceOf(
    LlmOutputLimitError,
  );
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(mocks.record).toHaveBeenCalledTimes(1);
  expect(mocks.create.mock.calls[0]![0].max_tokens).toBe(8000);
});
it('rejects a truncated tool payload even when no second attempt is allowed', async () => {
  mocks.create.mockResolvedValueOnce({ ...response('fixture-a', true), stop_reason: 'max_tokens' });
  await expect(
    new AnthropicLlm('fixture', false).generateStructured({ ...req, maxTokens: 8000, maxAttempts: 1 }),
  ).rejects.toMatchObject({ code: 'LLM_OUTPUT_LIMIT', maxTokens: 8000, usages: [expect.any(Object)] });
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
it('does not retry an explicitly single-attempt response that omits the tool', async () => {
  mocks.create.mockResolvedValueOnce(response('fixture-a'));
  await expect(new AnthropicLlm('fixture', false).generateStructured({ ...req, maxAttempts: 1 })).rejects.toMatchObject({
    usages: [expect.any(Object)],
  });
  expect(mocks.create).toHaveBeenCalledTimes(1);
});
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
it('never uses a tool call cut off at max_tokens; retries with twice the room and books both', async () => {
  mocks.create
    .mockResolvedValueOnce({
      ...response('fixture-a'),
      stop_reason: 'max_tokens',
      content: [{ type: 'tool_use', name: 'answer', input: { ok: true } }],
    })
    .mockResolvedValueOnce(response('fixture-a', true));
  const result = await new AnthropicLlm('fixture', false).generateStructured({ ...req, maxTokens: 600 });
  expect(result.data).toEqual({ ok: true });
  expect(result.usages).toHaveLength(2);
  expect(mocks.create.mock.calls.map((c) => c[0].max_tokens)).toEqual([600, 1200]);
});
it('bounds token counting and generation with the same deadline before the job expires', async () => {
  const guard = { beforeRequest: vi.fn(), afterResponse: vi.fn() };
  mocks.count.mockImplementationOnce(
    (_params, options: { signal: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      }),
  );
  await expect(
    new AnthropicLlm('fixture', false).generateStructured({
      ...req,
      maxAttempts: 1,
      budgetGuard: guard,
      timeoutMs: 10,
    }),
  ).rejects.toThrow();
  expect(mocks.count).toHaveBeenCalledTimes(1);
  expect(mocks.create).not.toHaveBeenCalled();
  expect(guard.beforeRequest).not.toHaveBeenCalled();
});
it('does not start a physical provider call after the build or QA has already been aborted', async () => {
  const controller = new AbortController();
  controller.abort(Error('job deadline'));
  await expect(
    new AnthropicLlm('fixture', false).generateStructured({
      ...req,
      maxAttempts: 1,
      signal: controller.signal,
    }),
  ).rejects.toThrow('job deadline');
  expect(mocks.create).not.toHaveBeenCalled();
  expect(mocks.count).not.toHaveBeenCalled();
});
