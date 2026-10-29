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
      server_tool_use?: { web_search_requests?: number | null } | null;
    },
  ): LlmUsage {
    return {
      model,
      inputTokens: u.input_tokens,
      outputTokens: u.output_tokens,
      cacheReadTokens: u.cache_read_input_tokens ?? 0,
      cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
      ...(u.server_tool_use?.web_search_requests ? { webSearchRequests: u.server_tool_use.web_search_requests } : {}),
    };
  }

  async generateStructured<T>(req: LlmStructuredRequest): Promise<LlmResult<T>> {
    let lastErr: unknown;
    const usages: LlmUsage[] = [];
    let maxTokens = req.maxTokens ?? 8000;
    for (let attempt = 0; attempt < 2; attempt++) {
      const instruction =
        attempt === 0
          ? `\n\nGib dein Ergebnis ausschließlich über einen Aufruf des Tools "${req.toolName}" zurück.`
          : `\n\nWICHTIG: Rufe jetzt das Tool "${req.toolName}" auf. Keine andere Antwort ist zulässig.`;
      const res = await this.client.beta.messages
        .create({
          model: req.model,
          max_tokens: maxTokens,
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
      // Abgeschnittene Antwort (max_tokens): Tool-Eingabe ist unvollständig – nie verwenden, mit mehr Platz wiederholen
      if (block && res.stop_reason !== 'max_tokens') {
        // Eingaben immer als Objekt behandeln (SDK liefert geparstes JSON)
        return { data: block.input as T, usage, usages };
      }
      if (res.stop_reason === 'max_tokens') maxTokens = Math.min(maxTokens * 2, 32000);
      logger.warn(
        { purpose: req.purpose, stopReason: res.stop_reason, attempt },
        'llm: kein vollständiger Tool-Aufruf, wiederhole',
      );
      lastErr = new LlmNoToolCallError(req.toolName, [...usages]);
    }
    throw lastErr;
  }

  async generateText(req: LlmTextRequest): Promise<LlmResult<string>> {
    const tools: Anthropic.Beta.BetaToolUnion[] | undefined = req.webSearch
      ? [
          {
            type: 'web_search_20260209',
            name: 'web_search',
            max_uses: req.webSearch.maxUses,
            user_location: { type: 'approximate', country: 'DE', ...(req.webSearch.city ? { city: req.webSearch.city } : {}) },
            ...(req.webSearch.blockedDomains?.length ? { blocked_domains: req.webSearch.blockedDomains } : {}),
          },
        ]
      : undefined;
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: req.prompt }];
    const usages: LlmUsage[] = [];
    const content: Anthropic.Beta.BetaContentBlock[] = [];
    // Lange Websuchen pausiert die API (pause_turn): Antwort unverändert zurückschicken, höchstens 4-mal
    for (let turn = 0; turn < 5; turn++) {
      const res = await this.client.beta.messages
        .create({
          model: req.model,
          max_tokens: req.maxTokens ?? 4000,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          output_config: { effort: req.effort ?? 'medium' },
          messages,
          ...(tools ? { tools } : {}),
          ...(this.useServerFallback ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
        })
        .catch((cause: unknown) => {
          if (usages.length)
            throw new LlmUsageError('LLM-Aufruf nach berechneter Antwort fehlgeschlagen', [...usages], { cause });
          throw cause;
        });
      usages.push(this.usageOf(res.model, res.usage));
      if (res.stop_reason === 'refusal') throw new LlmRefusalError(res.stop_details?.category ?? null, [...usages]);
      content.push(...res.content);
      if (res.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: res.content });
    }
    const text = content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    const sources = new Set<string>();
    for (const b of content) {
      if (b.type === 'web_search_tool_result' && Array.isArray(b.content))
        for (const r of b.content) if (r.type === 'web_search_result' && r.url.startsWith('https://')) sources.add(r.url);
      if (b.type === 'text')
        for (const c of b.citations ?? [])
          if (c.type === 'web_search_result_location' && c.url.startsWith('https://')) sources.add(c.url);
    }
    return { data: text, usage: usages[usages.length - 1]!, usages, ...(req.webSearch ? { sources: [...sources] } : {}) };
  }
}
