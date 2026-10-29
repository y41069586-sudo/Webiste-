import type { TtsProvider, TtsRequest, TtsResult } from '../types';

/**
 * Sprachausgabe über OpenAI (`POST /v1/audio/speech`, Modell gpt-4o-mini-tts, Stand docs/integrations.md).
 * Hinweis laut OpenAI: Das Modell wird am 06.01.2027 abgeschaltet – vorher ersetzen.
 */
export class OpenAiTts implements TtsProvider {
  readonly name = 'openai';
  constructor(
    private readonly apiKey: string,
    private readonly model = 'gpt-4o-mini-tts',
  ) {}

  async synthesize(req: TtsRequest): Promise<TtsResult> {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        voice: req.voice,
        input: req.text.slice(0, 4000),
        ...(req.instructions ? { instructions: req.instructions } : {}),
        response_format: 'mp3',
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) throw new Error(`OpenAI-Sprachausgabe fehlgeschlagen (HTTP ${res.status})`);
    return { audio: new Uint8Array(await res.arrayBuffer()), contentType: 'audio/mpeg' };
  }
}
