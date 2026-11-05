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
    feedback?: string[];
    photos?: NonNullable<BusinessFacts['photos']>;
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
  const studioPlan = parseStudioPlan(
    await llmStructured<unknown>({
      tier: 'creative',
      system: STUDIO_SYSTEM,
      prompt: studioPrompt(facts),
      images,
      toolName: STUDIO_TOOL,
      toolDescription: 'Zwei individuelle Gestaltungsrichtungen und die begründete Auswahl.',
      inputSchema: STUDIO_SCHEMA,
      maxTokens: 3000,
      effort: 'high',
      purpose: 'demo_art_direction',
      leadId,
    }),
  );
  // Befunde der KI-Prüfung eines früheren Entwurfs gleich im ersten Versuch mitgeben
  let feedback: string[] | undefined = qaFeedback?.length ? qaFeedback.slice(0, 12) : undefined;
  let lastViolations: RuleViolation[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await llmStructured<SiteContent>({
        tier: 'creative',
        system: DEMO_SYSTEM_PROMPT,
        prompt: buildDemoPrompt(facts, seed + attempt, feedback) + '\n\n' + studioImplementationBrief(studioPlan),
        images,
        toolName: DEMO_TOOL_NAME,
        toolDescription: 'Gibt individuelle Seitengestaltung (HTML/CSS) und geprüfte Texte zurück.',
        inputSchema: DEMO_CONTENT_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 10000,
        effort: 'high',
        purpose: 'demo_content',
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
        continue;
      }
      const violations = validateDemoContent(content, facts);
      if (!content.design)
        violations.push({
          field: 'design',
          rule: 'Individueller Entwurf fehlt',
          detail: 'Eigenes HTML/CSS im design-Objekt liefern; kein Kit-Fallback.',
        });
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
    `Freier Studio-Entwurf fehlgeschlagen; keine Ersatzvorlage. ${lastViolations.map((v) => `${v.field}: ${v.rule}`).join(' | ')}`,
  );
}
