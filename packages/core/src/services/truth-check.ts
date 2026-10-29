import { trackUrl } from '../config/env';
import {
  checkLetterTruth,
  markedBody,
  TRUTH_SYSTEM_PROMPT,
  TRUTH_TOOL_NAME,
  TRUTH_TOOL_SCHEMA,
  type TruthCheckInput,
  type TruthCheckResult,
  type TruthLlmAnswer,
} from '../letters/truth-check';
import { llmStructured } from './llm';

export interface RunTruthCheckOptions {
  leadId?: string;
  /** Erreichbarkeit der Quellenseite per HTTP prüfen (nur bei echtem Versand; sonst „skipped“) */
  checkSourcesPage: boolean;
  idempotencyKey?: string;
}

/** Quellenseite erreichbar? (B5.4 Punkt 4) */
export async function sourcesPageReachable(timeoutMs = 5000): Promise<boolean> {
  try {
    const res = await fetch(trackUrl('/quellen'), { method: 'GET', signal: AbortSignal.timeout(timeoutMs) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Vollständiger Wahrheits-Check: deterministische Regeln, Quellenseite, danach die LLM-Prüfung
 * (nur wenn die Regeln bestanden sind – spart Kosten). Ohne `passed` kein Versand.
 */
export async function runTruthCheck(input: TruthCheckInput, opts: RunTruthCheckOptions): Promise<TruthCheckResult> {
  const result = checkLetterTruth(input);
  if (result.claims.length === 0) result.sourcesPage = 'skipped';
  else if (!opts.checkSourcesPage) result.sourcesPage = 'skipped';
  else if (await sourcesPageReachable()) result.sourcesPage = 'ok';
  else {
    result.sourcesPage = 'unreachable';
    result.violations.push({ rule: 'sources_page', detail: `Quellenseite ${trackUrl('/quellen')} nicht erreichbar` });
  }
  if (result.violations.length) {
    result.passed = false;
    result.llm = { skipped: 'Regelprüfung nicht bestanden' };
    return result;
  }
  try {
    const answer = await llmStructured<TruthLlmAnswer>({
      tier: 'bulk',
      system: TRUTH_SYSTEM_PROMPT,
      prompt: markedBody(input),
      toolName: TRUTH_TOOL_NAME,
      toolDescription: 'Ergebnis der Prüfung auf unbelegte Wirkungsaussagen',
      inputSchema: TRUTH_TOOL_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 2000,
      effort: 'low',
      purpose: 'truth_check',
      leadId: opts.leadId,
      idempotencyKey: opts.idempotencyKey,
    });
    // Antwort defensiv lesen: ohne eindeutiges Ergebnis bleibt der Brief gesperrt (catch unten)
    if (typeof answer?.unbacked_effect_claim !== 'boolean') throw Error('Prüfergebnis unvollständig');
    const statements = Array.isArray(answer.statements) ? answer.statements.filter((s) => typeof s === 'string') : [];
    result.llm = { unbackedEffectClaim: answer.unbacked_effect_claim, statements };
    if (answer.unbacked_effect_claim) {
      result.violations.push({
        rule: 'llm',
        detail: `Unbelegte Wirkungsaussage: ${statements.map((s) => `„${s}“`).join(', ') || '(ohne Zitat)'}`,
      });
    }
  } catch (err) {
    result.llm = { error: err instanceof Error ? err.message : String(err) };
    result.violations.push({ rule: 'llm', detail: 'LLM-Prüfung fehlgeschlagen – Brief bleibt gesperrt' });
  }
  result.passed = result.violations.length === 0;
  return result;
}
