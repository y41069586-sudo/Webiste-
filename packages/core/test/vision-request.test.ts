import { expect, it, vi } from 'vitest';
import { AnthropicLlm } from '../src/providers/llm/anthropic';
it('passes base64 image blocks and the bounded schema through the existing SDK without network calls', async () => {
  const create = vi
    .fn()
    .mockResolvedValue({
      model: 'mock-sdk-model',
      usage: { input_tokens: 2, output_tokens: 1 },
      content: [{ type: 'tool_use', id: 'test', name: 'design', input: { character: 'warm' } }],
      stop_reason: 'tool_use',
    });
  const provider = new AnthropicLlm('test-placeholder-never-used', false);
  Object.defineProperty(provider, 'client', { value: { beta: { messages: { create } } } });
  const result = await provider.generateStructured({
    model: 'test-model',
    system: 'style only',
    prompt: 'test context',
    toolName: 'design',
    toolDescription: 'bounded style',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: { character: { type: 'string' } },
      required: ['character'],
    },
    purpose: 'test:vision',
    images: [{ mediaType: 'image/jpeg', data: 'test-base64' }],
  });
  expect(create).toHaveBeenCalledTimes(1);
  expect(create.mock.calls[0]![0].messages[0].content[0]).toEqual({
    type: 'image',
    source: { type: 'base64', media_type: 'image/jpeg', data: 'test-base64' },
  });
  expect(create.mock.calls[0]![0].messages[0].content[1].text).toContain('test context');
  expect(create.mock.calls[0]![0].tools).toHaveLength(1);
  expect(result.data).toEqual({ character: 'warm' });
});
