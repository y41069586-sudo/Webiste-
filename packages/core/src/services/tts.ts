import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { getProviders } from '../providers';
import { assertBudgetAvailable, recordCost } from './budget';

const INSTRUCTIONS =
  'Sprich natürliches, akzentfreies Deutsch. Ruhig, freundlich und selbstbewusst wie ein persönlicher Assistent namens Jarvis. Normales Tempo, kurze Pausen an Satzenden.';

/** Ist eine natürliche Stimme eingerichtet? Sonst nutzt Jarvis die Stimme des Browsers. */
export function ttsAvailable(): boolean {
  return getProviders().tts !== null;
}

/** Text für Jarvis vertonen; Kosten (Schätzung je Zeichen) im KI-Budget. */
export async function synthesizeSpeech(text: string): Promise<{ audio: Uint8Array; contentType: string }> {
  const tts = getProviders().tts;
  if (!tts) throw new Error('Keine Sprachausgabe eingerichtet');
  const input = text.replace(/\s+/g, ' ').trim().slice(0, 800);
  if (!input) throw new Error('Kein Text');
  await assertBudgetAvailable('llm', 1);
  const cfg = await getConfig();
  const result = await tts.synthesize({ text: input, voice: cfg.assistant.ttsVoice || 'cedar', instructions: INSTRUCTIONS });
  const micro = Math.round(input.length * cfg.costs.ttsPer1000CharsUsdCents * 1000 * cfg.costs.usdToEur);
  await recordCost(getDb(), {
    category: 'llm',
    amountMicroCents: micro,
    ref: 'jarvis_tts',
    meta: { provider: tts.name, chars: input.length, estimate: true },
  });
  return result;
}
