import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { budgetLedger } from '../src/db/schema';
import { resetProviders, setProviders } from '../src/providers';
import { synthesizeSpeech, ttsAvailable } from '../src/services/tts';
import { resetDb } from './helpers';

describe('Jarvis-Stimme', () => {
  const calls: { text: string; voice: string }[] = [];
  beforeAll(async () => {
    await resetDb();
    setProviders({
      tts: {
        name: 'fake',
        synthesize: async (req) => {
          calls.push({ text: req.text, voice: req.voice });
          return { audio: new Uint8Array([1, 2, 3]), contentType: 'audio/mpeg' };
        },
      },
    });
  });
  afterAll(() => resetProviders());

  it('vertont gekürzten Text mit der eingestellten Stimme und bucht die Kosten', async () => {
    expect(ttsAvailable()).toBe(true);
    const r = await synthesizeSpeech(`Sers!   ${'a'.repeat(1000)}`);
    expect(r.contentType).toBe('audio/mpeg');
    expect(calls[0]?.voice).toBe('cedar');
    expect(calls[0]?.text.length).toBe(800);
    const rows = await getDb().select().from(budgetLedger).where(eq(budgetLedger.ref, 'jarvis_tts'));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.category).toBe('llm');
    expect(rows[0]!.amountMicroCents).toBeGreaterThan(0);
  });
  it('ohne Anbieter keine Stimme', async () => {
    setProviders({ tts: null });
    expect(ttsAvailable()).toBe(false);
    await expect(synthesizeSpeech('Hallo')).rejects.toThrow(/Keine Sprachausgabe/);
  });
});
