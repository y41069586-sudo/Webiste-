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
  ensureVerifiedServiceInHero,
  tidyAuthoredDesign,
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
  /** Befunde des technischen Selbsttests, die nach der Nachbesserung noch offen sind (entscheidet dann die Demo-QA) */
  precheckOpen?: RuleViolation[];
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
    /**
     * Technischer Selbsttest des fertigen Entwurfs (Rendern, Kontrast, Überlauf), bevor er gespeichert wird.
     * Befunde führen zu genau einer Nachbesserung; danach entscheidet die normale Demo-QA.
     */
    precheck?: (content: SiteContent) => Promise<RuleViolation[]>;
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
  // Regelkonformer erster Entwurf mit offenen Selbsttest-Befunden: bleibt erhalten, falls die Nachbesserung scheitert
  let fallback: GeneratedContent | undefined;
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
        if (content.design) content = { ...content, design: tidyAuthoredDesign(content.design) };
        content = ensureVerifiedServiceInHero(content, facts);
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
        if (fallback) return fallback;
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
      if (violations.length === 0) {
        const open = opts.precheck ? await opts.precheck(content).catch(() => [] as RuleViolation[]) : [];
        opts.signal?.throwIfAborted();
        if (open.length === 0 || attempt === 2)
          return {
            content,
            source: 'llm',
            attempts: attempt,
            violations: [],
            studioPlan,
            ...(open.length ? { precheckOpen: open } : {}),
          };
        lastViolations = open;
        fallback = { content, source: 'llm', attempts: attempt, violations: [], studioPlan, precheckOpen: open };
        // 07.11.2026: Das Modell sieht seinen ersten Entwurf sonst nicht und lieferte nur Bruchstücke („behalte alles
        // Übrige bei“). Deshalb: vorherigen Entwurf mitgeben und ausdrücklich die vollständige Antwort verlangen.
        feedback = [
          'Dein vorheriger Entwurf wurde im Browser getestet (Desktop 1440 px, Handy 390 px und 320 px). Liefere den VOLLSTÄNDIGEN Entwurf erneut mit allen Pflichtfeldern (Texte, Leistungen, FAQ, design mit html, css, Farben und Schriften) und behebe dabei genau diese Befunde; alles Übrige darf gleich bleiben:',
          ...open.slice(0, 10).map((v) => `${v.field}: ${v.rule} – ${v.detail}`),
          `Vorheriger Entwurf (eigene frühere Ausgabe, zum Überarbeiten): ${JSON.stringify({
            hero_headline: content.hero_headline,
            hero_subline: content.hero_subline,
            design: content.design,
          }).slice(0, 60000)}`,
        ];
        logger.warn({ leadId, attempt, findings: open.length }, 'demo: technischer Selbsttest mit Befunden, Nachbesserung');
        continue;
      }
      if (fallback) return fallback;
      lastViolations = violations;
      feedback = violations.slice(0, 12).map((v) => `${v.field}: ${v.rule} – ${v.detail}`);
      logger.warn({ leadId, attempt, violations: violations.length }, 'demo: Inhaltsregeln verletzt');
    } catch (err) {
      if (fallback) {
        logger.warn({ leadId }, 'demo: Nachbesserung fehlgeschlagen, regelkonformer erster Entwurf bleibt');
        return fallback;
      }
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
