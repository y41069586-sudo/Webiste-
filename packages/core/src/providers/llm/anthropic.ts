import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../logger';
import type { LlmProvider, LlmResult, LlmStructuredRequest, LlmTextRequest, LlmUsage } from '../types';
import { LlmUsageError } from '../types';

export class LlmRefusalError extends LlmUsageError {
  constructor(
    public readonly category: string | null,
    usages: LlmUsage[] = [],
  ) {
    super(`Modell hat die Anfrage abgelehnt (Kategorie: ${category ?? 'unbekannt'})`, usages);
    this.name = 'LlmRefusalError';
  }
}

export class LlmNoToolCallError extends LlmUsageError {
  constructor(toolName: string, usages: LlmUsage[] = []) {
    super(`Modell hat das Tool ${toolName} nicht aufgerufen`, usages);
    this.name = 'LlmNoToolCallError';
  }
}

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * Claude über das offizielle Anthropic-SDK.
 * - Strukturierte Ausgabe per Tool-Use mit striktem JSON-Schema (`strict: true`).
 *   Erzwungenes `tool_choice` ist bei Claude Opus 5.5 / Sonnet 5.5 nicht erlaubt,
 *   daher `auto` + klare Anweisung + Prüfung, ob das Tool aufgerufen wurde.
 * - Prompt-Caching auf dem (statischen) System-Prompt.
 * - Serverseitige Fallbacks bei Ablehnungen (`fallbacks: "default"`), abschaltbar.
 */
export class AnthropicLlm implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(
    apiKey: string,
    private readonly useServerFallback = true,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 3, timeout: 180_000 });
  }

  private usageOf(
    model: string,
    u: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number | null;
      cache_creation_input_tokens?: number | null;
    },
  ): LlmUsage {
    return {
      model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
    };
  }

  async generateStructured<T>(req: LlmStructuredRequest): Promise<LlmResult<T>> {
    let lastErr: unknown;
    const usages: LlmUsage[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const instruction =
        attempt === 0
          ? `\n\nGib dein Ergebnis ausschließlich über einen Aufruf des Tools "${req.toolName}" zurück.`
          : `\n\nWICHTIG: Rufe jetzt das Tool "${req.toolName}" auf. Keine andere Antwort ist zulässig.`;
      const res = await this.client.beta.messages
        .create({
          model: req.model,
          max_tokens: req.maxTokens ?? 8000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          tools: [
            {
              name: req.toolName,
              description: req.toolDescription,
              input_schema: req.inputSchema as Anthropic.Beta.BetaTool.InputSchema,
              strict: true,
            },
          ],
          tool_choice: { type: 'auto' },
          output_config: { effort: req.effort ?? 'medium' },
          messages: [
            {
              role: 'user',
              content: req.images?.length
                ? [
                    ...req.images.slice(0, 3).map((image) => ({
                      type: 'image' as const,
                      source: { type: 'base64' as const, media_type: image.mediaType, data: image.data },
                    })),
                    { type: 'text' as const, text: req.prompt + instruction },
                  ]
                : req.prompt + instruction,
            },
          ],
          ...(this.useServerFallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
        })
        .catch((cause: unknown) => {
          if (usages.length)
            throw new LlmUsageError('LLM-Aufruf nach berechneter Antwort fehlgeschlagen', [...usages], { cause });
          throw cause;
        });

      const usage = this.usageOf(res.model, res.usage);
      usages.push(usage);
      if (res.stop_reason === 'refusal') {
        throw new LlmRefusalError(res.stop_details?.category ?? null, [...usages]);
      }
      const block = res.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use' && b.name === req.toolName,
      );
      if (block) {
        // Eingaben immer als Objekt behandeln (SDK liefert geparstes JSON)
        return { data: block.input as T, usage, usages };
      }
      logger.warn({ purpose: req.purpose, stopReason: res.stop_reason, attempt }, 'llm: kein Tool-Aufruf, wiederhole');
      lastErr = new LlmNoToolCallError(req.toolName, [...usages]);
    }
    throw lastErr;
  }

  async generateText(req: LlmTextRequest): Promise<LlmResult<string>> {
    const res = await this.client.beta.messages.create({
      model: req.model,
      max_tokens: req.maxTokens ?? 4000,
      system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: req.effort ?? 'medium' },
      messages: [{ role: 'user', content: req.prompt }],
      ...(this.useServerFallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
    });
    if (res.stop_reason === 'refusal')
      throw new LlmRefusalError(res.stop_details?.category ?? null, [this.usageOf(res.model, res.usage)]);
    const text = res.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    return { data: text, usage: this.usageOf(res.model, res.usage) };
  }
}
