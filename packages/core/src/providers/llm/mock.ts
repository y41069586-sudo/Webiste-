import type { LlmProvider, LlmResult, LlmStructuredRequest, LlmTextRequest } from '../types';

type StructuredHandler = (req: LlmStructuredRequest) => unknown;
type TextHandler = (req: LlmTextRequest) => string;

const structuredHandlers = new Map<string, StructuredHandler>();
const textHandlers = new Map<string, TextHandler>();

/**
 * Services registrieren deterministische Ersatzantworten für ihre Tools.
 * So läuft die gesamte Pipeline ohne API-Key (Entwicklung, Tests, DRY_RUN).
 */
export function registerMockStructured(toolName: string, handler: StructuredHandler): void {
  structuredHandlers.set(toolName, handler);
}
export function registerMockText(purpose: string, handler: TextHandler): void {
  textHandlers.set(purpose, handler);
}

export class MockLlm implements LlmProvider {
  readonly name = 'mock';

  async generateStructured<T>(req: LlmStructuredRequest): Promise<LlmResult<T>> {
    const h = structuredHandlers.get(req.toolName);
    if (!h) throw new Error(`Kein Mock-Handler für Tool ${req.toolName}`);
    return {
      data: h(req) as T,
      usage: { model: `mock:${req.model}`, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  }

  async generateText(req: LlmTextRequest): Promise<LlmResult<string>> {
    const h = textHandlers.get(req.purpose);
    return {
      data: h ? h(req) : `[Mock-Antwort für ${req.purpose}]`,
      usage: { model: `mock:${req.model}`, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
    };
  }
}
