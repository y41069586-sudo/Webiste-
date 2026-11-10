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
import { BudgetExceededError, KillSwitchError } from './budget';
import { LetterCheckUnavailableError } from '../letters/state';

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
 * (nur wenn die Regeln bestanden sind – spart Kosten). Ohne `passed` kein Versand. Technische Ausfälle (Quellenseite,
 * KI) werfen `LetterCheckUnavailableError` und sind kein inhaltlicher Befund.
 */
export async function runTruthCheck(input: TruthCheckInput, opts: RunTruthCheckOptions): Promise<TruthCheckResult> {
  const result = checkLetterTruth(input);
  // Inhaltliche Befunde zuerst: sie gelten unabhängig davon, ob Quellenseite oder KI erreichbar sind.
  if (result.violations.length) {
    result.sourcesPage = 'skipped';
    result.passed = false;
    result.llm = { skipped: 'Regelprüfung nicht bestanden' };
    return result;
  }
  if (result.claims.length === 0) result.sourcesPage = 'skipped';
  else if (!opts.checkSourcesPage) result.sourcesPage = 'skipped';
  else if (await sourcesPageReachable()) result.sourcesPage = 'ok';
  // Technischer Ausfall ist kein Urteil über den Text: nicht „nicht bestanden“, sondern später wiederholen.
  else throw new LetterCheckUnavailableError('sources_page', `Quellenseite ${trackUrl('/quellen')} nicht erreichbar`);
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
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
        idempotencyKey: opts.idempotencyKey ? `${opts.idempotencyKey}:${attempt}` : undefined,
      });
      if (typeof answer?.unbacked_effect_claim !== 'boolean') throw Error('Prüfergebnis unvollständig');
      const statements = Array.isArray(answer.statements) ? answer.statements.filter((s) => typeof s === 'string') : [];
      result.llm = { unbackedEffectClaim: answer.unbacked_effect_claim, statements };
      if (answer.unbacked_effect_claim) {
        result.violations.push({
          rule: 'llm',
          detail: `Unbelegte Wirkungsaussage: ${statements.map((s) => `„${s}“`).join(', ') || '(ohne Zitat)'}`,
        });
      }
      result.passed = result.violations.length === 0;
      return result;
    } catch (err) {
      // Budget und Not-Aus sind bewusste Sperren und werden unverändert weitergereicht
      if (err instanceof BudgetExceededError || err instanceof KillSwitchError) throw err;
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  // Zwei technische Fehlversuche (API, Zeitüberschreitung, ungültige Antwort): der Brief gilt weder als bestanden
  // noch als durchgefallen. Der Auftrag wird mit Wartezeit wiederholt.
  throw new LetterCheckUnavailableError('truth_llm', `KI-Wahrheitsprüfung technisch nicht verfügbar: ${lastError.slice(0, 200)}`);
}
