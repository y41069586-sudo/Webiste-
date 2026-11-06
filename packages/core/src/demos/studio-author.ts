import type { BusinessFacts, SiteContent } from '@wbm/templates';
import { LlmNoToolCallError, LlmRefusalError } from '../providers/llm/anthropic';
import { llmStructured } from '../services/llm';
import { logger } from '../logger';
import {
  buildDemoPrompt,
  DEMO_CONTENT_SCHEMA,
  DEMO_SYSTEM_PROMPT,
  DEMO_TOOL_NAME,
  normalizeContent,
  validateDemoContent,
  type ContentFacts,
  type RuleViolation,
} from './content';
import {
  STUDIO_SCHEMA,
  STUDIO_CALL_OPTIONS,
  STUDIO_SYSTEM,
  STUDIO_TOOL,
  parseStudioPlan,
  studioPrompt,
  studioImplementationBrief,
  type StudioPlan,
} from './studio';
import { studioImages } from './studio-images';
import './mock-handlers';

export interface GeneratedContent {
  content: SiteContent;
  source: 'llm' | 'fallback';
  attempts: number;
  violations: RuleViolation[];
  studioPlan?: StudioPlan;
}

/** Shared by normal lead generation and the isolated fictional preview. All paid calls retain budget admission. */
export async function authorStudioContent(
  input: ContentFacts,
  opts: {
    leadId?: string;
    seed?: number;
    recentConcepts?: string[];
    signal?: AbortSignal;
    feedback?: string[];
    /** Änderungswunsch des Betreibers (siehe operator-wish.ts) */
    operatorWish?: string;
    photos?: NonNullable<BusinessFacts['photos']>;
    onPlan?: (plan: StudioPlan) => Promise<void>;
    onAttempt?: (attempt: number, content: unknown, violations: RuleViolation[]) => Promise<void>;
  } = {},
): Promise<GeneratedContent> {
  const photos = opts.photos ?? [];
  const facts: ContentFacts = {
    ...input,
    requireFullPage: true,
    imageBrief: photos.map((p, i) => ({ slot: i + 1, alt: p.alt, example: p.origin === 'example' })),
  };
  const seed = opts.seed ?? 0;
  const leadId = opts.leadId;
  const qaFeedback = opts.feedback;
  const images = await studioImages(photos);
  opts.signal?.throwIfAborted();
  const studioPlan = parseStudioPlan(
    await llmStructured<unknown>({
      tier: 'creative',
      system: STUDIO_SYSTEM,
      prompt: studioPrompt(facts, { seed, recentConcepts: opts.recentConcepts, operatorWish: opts.operatorWish }),
      images,
      toolName: STUDIO_TOOL,
      toolDescription: 'Zwei individuelle Gestaltungsrichtungen und die begründete Auswahl.',
      inputSchema: STUDIO_SCHEMA,
      ...STUDIO_CALL_OPTIONS.concept,
      purpose: 'demo_art_direction',
      signal: opts.signal,
      leadId,
    }),
  );
  await opts.onPlan?.(studioPlan);
  // Befunde der KI-Prüfung eines früheren Entwurfs gleich im ersten Versuch mitgeben
  const startFeedback = [...(opts.operatorWish ? [opts.operatorWish] : []), ...(qaFeedback ?? [])];
  let feedback: string[] | undefined = startFeedback.length ? startFeedback.slice(0, 12) : undefined;
  let lastViolations: RuleViolation[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    opts.signal?.throwIfAborted();
    try {
      const raw = await llmStructured<SiteContent>({
        tier: 'creative',
        system: DEMO_SYSTEM_PROMPT,
        prompt: buildDemoPrompt(facts, seed + attempt, feedback) + '\n\n' + studioImplementationBrief(studioPlan),
        images,
        toolName: DEMO_TOOL_NAME,
        toolDescription: 'Gibt individuelle Seitengestaltung (HTML/CSS) und geprüfte Texte zurück.',
        inputSchema: DEMO_CONTENT_SCHEMA as unknown as Record<string, unknown>,
        ...STUDIO_CALL_OPTIONS.author,
        purpose: 'demo_content',
        signal: opts.signal,
        leadId,
      });
      let content: SiteContent;
      try {
        content = normalizeContent(raw);
      } catch {
        lastViolations = [
          {
            field: 'response',
            rule: 'Ungültige Inhaltsstruktur',
            detail: 'Pflichtfelder fehlen oder haben einen falschen Datentyp.',
          },
        ];
        feedback = ['Alle Pflichtfelder gemäß Tool-Schema mit vollständigen Texten und Listen liefern.'];
        await opts.onAttempt?.(attempt, raw, lastViolations);
        continue;
      }
      const violations = validateDemoContent(content, facts);
      if (!content.design)
        violations.push({
          field: 'design',
          rule: 'Individueller Entwurf fehlt',
          detail: 'Eigenes HTML/CSS im design-Objekt liefern; kein Kit-Fallback.',
        });
      await opts.onAttempt?.(attempt, raw, violations);
      if (violations.length === 0) return { content, source: 'llm', attempts: attempt, violations: [], studioPlan };
      lastViolations = violations;
      feedback = violations.slice(0, 12).map((v) => `${v.field}: ${v.rule} – ${v.detail}`);
      logger.warn({ leadId, attempt, violations: violations.length }, 'demo: Inhaltsregeln verletzt');
    } catch (err) {
      if (err instanceof LlmRefusalError || err instanceof LlmNoToolCallError) {
        logger.warn({ leadId, err: err.message }, 'demo: KI-Antwort unbrauchbar, Entwurf blockiert');
        break;
      }
      throw err;
    }
  }
  throw new Error(
    `Freier Studio-Entwurf fehlgeschlagen; keine Ersatzvorlage. ${lastViolations
      .slice(0, 6)
      .map((v) => `${v.field}: ${v.rule} – ${v.detail}`)
      .join(' | ')}`,
  );
}
