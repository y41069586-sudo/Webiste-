import { eq, sql } from 'drizzle-orm';
import { renderSite, templatesForGroup, type BusinessFacts, type DemoOptions, type SiteContent, type SenderInfo } from '@wbm/templates';
import { appUrl, demoUrl } from '../config/env';
import { getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb } from '../db/client';
import { demos, leads } from '../db/schema';
import { formatPhoneDe, phoneHref } from '../leads/normalize';
import { formatOpeningHours } from '../leads/opening-hours';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { LlmNoToolCallError, LlmRefusalError } from '../providers/llm/anthropic';
import { enqueue, QUEUES } from '../queue';
import { audit } from '../services/audit';
import { transitionLead } from '../services/lead-state';
import { llmStructured } from '../services/llm';
import { randomToken, sha256 } from '../util/crypto';
import { formatEuroShort } from '../util/time';
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
import { libraryContent } from './library';
import './mock-handlers';

type Lead = typeof leads.$inferSelect;

/** Platzhalter für das Ablaufdatum im gespeicherten HTML (wird beim Ausliefern ersetzt). */
export const EXPIRES_PLACEHOLDER = '__WBM_EXPIRES_LABEL__';

export function seedFromId(id: string): number {
  return parseInt(sha256(id).slice(0, 8), 16);
}

export function leadToFacts(lead: Lead, cfg: AppConfig): BusinessFacts {
  const branch = cfg.targeting.branches.find((b) => b.key === lead.branch);
  const phone = formatPhoneDe(lead.phone);
  return {
    name: lead.businessName,
    branchLabel: branch?.label ?? lead.branch,
    group: lead.branchGroup,
    street: lead.street ?? '',
    houseNumber: lead.houseNumber ?? '',
    postalCode: lead.postalCode ?? '',
    city: lead.city,
    phone,
    phoneHref: phoneHref(phone),
    openingLines: formatOpeningHours(lead.openingHours).map((l) => {
      const i = l.indexOf(': ');
      return { label: l.slice(0, i), value: l.slice(i + 2) };
    }),
  };
}

export function leadContentFacts(lead: Lead, cfg: AppConfig): ContentFacts {
  const branch = cfg.targeting.branches.find((b) => b.key === lead.branch);
  return {
    name: lead.businessName,
    branchLabel: branch?.label ?? lead.branch,
    branchKey: lead.branch,
    group: lead.branchGroup,
    city: lead.city,
    postalCode: lead.postalCode ?? '',
    street: lead.street ?? '',
    houseNumber: lead.houseNumber ?? '',
    phone: lead.phone,
    hasOpeningHours: Boolean(lead.openingHours?.days.length),
    socialOnly: lead.socialOnly,
  };
}

export function senderInfo(cfg: AppConfig): SenderInfo {
  return {
    name: cfg.sender.name,
    company: cfg.sender.company,
    street: cfg.sender.street,
    postalCode: cfg.sender.postalCode,
    city: cfg.sender.city,
    email: cfg.sender.email,
    phone: cfg.sender.phone,
    imprintUrl: appUrl('/impressum'),
    privacyUrl: appUrl('/datenschutz'),
  };
}

export function demoOptions(slug: string, cfg: AppConfig): DemoOptions {
  return {
    slug,
    priceLabel: formatEuroShort(cfg.pricing.packageCents),
    checkoutUrl: demoUrl(`/d/${slug}/uebernehmen`),
    questionUrl: demoUrl(`/d/${slug}/frage`),
    optOutUrl: demoUrl(`/d/${slug}/kein-interesse`),
    sender: senderInfo(cfg),
    expiresLabel: EXPIRES_PLACEHOLDER,
  };
}

/**
 * Template + Palette: gleichmäßige Rotation (am seltensten genutzte Kombination zuerst,
 * bei Gleichstand deterministisch je Lead). Bei Neugenerierung ein anderes Template.
 */
export function chooseTemplate(
  lead: Pick<Lead, 'id' | 'branchGroup'>,
  previous: string[] = [],
  usage: Record<string, number> = {},
): { templateId: string; palette: string } {
  const options = templatesForGroup(lead.branchGroup);
  const seed = seedFromId(lead.id);
  const fresh = options.filter((t) => !previous.includes(t.id));
  const pool = fresh.length ? fresh : options;
  const tplUse = (id: string) => Object.entries(usage).filter(([k]) => k.startsWith(`${id}/`)).reduce((s, [, n]) => s + n, 0);
  const tpl = [...pool].sort((a, b) => tplUse(a.id) - tplUse(b.id) || ((seed + a.id.length) % 7) - ((seed + b.id.length) % 7))[0]!;
  const palette = [...tpl.palettes].sort(
    (a, b) => (usage[`${tpl.id}/${a}`] ?? 0) - (usage[`${tpl.id}/${b}`] ?? 0) || tpl.palettes.indexOf(a) - tpl.palettes.indexOf(b),
  )[0]!;
  return { templateId: tpl.id, palette };
}

async function templateUsage(): Promise<Record<string, number>> {
  const rows = await getDb().execute<{ k: string; n: number }>(
    sql`SELECT template_id || '/' || palette AS k, count(*)::int AS n FROM demos GROUP BY 1`,
  );
  return Object.fromEntries(rows.rows.map((r) => [r.k, Number(r.n)]));
}

export interface GeneratedContent {
  content: SiteContent;
  source: 'llm' | 'fallback';
  attempts: number;
  violations: RuleViolation[];
}

/**
 * Inhalte per Claude (MODEL_CREATIVE) mit Regelprüfung. Bis zu zwei Versuche
 * (der zweite mit konkretem Feedback), danach geprüfte Fallback-Texte.
 */
export async function generateDemoContent(lead: Lead, cfg: AppConfig): Promise<GeneratedContent> {
  const facts = leadContentFacts(lead, cfg);
  const seed = seedFromId(lead.id);
  let feedback: string[] | undefined;
  let lastViolations: RuleViolation[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const raw = await llmStructured<SiteContent>({
        tier: 'creative',
        system: DEMO_SYSTEM_PROMPT,
        prompt: buildDemoPrompt(facts, seed + attempt, feedback),
        toolName: DEMO_TOOL_NAME,
        toolDescription: 'Gibt die Texte für den Website-Entwurf zurück.',
        inputSchema: DEMO_CONTENT_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 6000,
        effort: 'medium',
        purpose: 'demo_content',
        leadId: lead.id,
      });
      const content = normalizeContent(raw);
      const violations = validateDemoContent(content, facts);
      if (violations.length === 0) return { content, source: 'llm', attempts: attempt, violations: [] };
      lastViolations = violations;
      feedback = violations.slice(0, 12).map((v) => `${v.field}: ${v.rule} – ${v.detail}`);
      logger.warn({ leadId: lead.id, attempt, violations: violations.length }, 'demo: Inhaltsregeln verletzt');
    } catch (err) {
      if (err instanceof LlmRefusalError || err instanceof LlmNoToolCallError) {
        logger.warn({ leadId: lead.id, err: err.message }, 'demo: KI-Antwort unbrauchbar, nutze Fallback');
        break;
      }
      throw err;
    }
  }
  const branch = cfg.targeting.branches.find((b) => b.key === lead.branch);
  const content = libraryContent(lead.branch, lead.branchGroup, { name: lead.businessName, stadt: lead.city, branche: branch?.label ?? lead.branch }, seed);
  return { content, source: 'fallback', attempts: 2, violations: lastViolations };
}

export function renderDemoHtml(input: {
  templateId: string;
  palette: string;
  content: SiteContent;
  facts: BusinessFacts;
  slug: string;
  cfg: AppConfig;
  mode?: 'demo' | 'screenshot';
}): string {
  return renderSite({
    templateId: input.templateId,
    palette: input.palette,
    mode: input.mode ?? 'demo',
    content: input.content,
    facts: input.facts,
    demo: demoOptions(input.slug, input.cfg),
  });
}

export function demoHtmlKey(demoId: string): string {
  return `demos/${demoId}/index.html`;
}

/**
 * Demo für einen qualifizierten Lead erzeugen: Inhalte, Rendern, Speichern.
 * Danach QA (Job qa-demo). Idempotent: existiert schon eine offene Demo, wird sie
 * zurückgegeben (außer bei regenerate).
 */
export async function buildDemo(leadId: string, opts: { regenerate?: boolean; actor: string }): Promise<string> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) throw new Error('Lead nicht gefunden');
  if (lead.anonymizedAt || ['suppressed', 'rejected', 'expired'].includes(lead.status)) {
    throw new Error(`Lead im Status ${lead.status} – keine Demo`);
  }
  const existing = await db.select().from(demos).where(eq(demos.leadId, leadId));
  const open = existing.find((d) => ['building', 'pending_review', 'approved', 'published'].includes(d.status));
  if (open && !opts.regenerate) return open.id;
  if (!['qualified', 'demo_built', 'failed'].includes(lead.status) && !opts.regenerate) {
    throw new Error(`Lead im Status ${lead.status} – Demo nicht vorgesehen`);
  }

  const { templateId, palette } = chooseTemplate(lead, existing.map((d) => d.templateId), await templateUsage());
  const generated = await generateDemoContent(lead, cfg);
  const facts = leadToFacts(lead, cfg);
  const slug = randomToken(24);
  const html = renderDemoHtml({ templateId, palette, content: generated.content, facts, slug, cfg });

  const [demo] = await db
    .insert(demos)
    .values({
      leadId,
      slug,
      templateId,
      palette,
      status: 'building',
      contentJson: { ...generated.content, _meta: { source: generated.source, attempts: generated.attempts, violations: generated.violations } } as unknown as Record<
        string,
        unknown
      >,
    })
    .returning({ id: demos.id });
  const demoId = demo!.id;
  await getProviders().storage.put(demoHtmlKey(demoId), html, 'text/html; charset=utf-8');
  await db.update(demos).set({ htmlStorageKey: demoHtmlKey(demoId) }).where(eq(demos.id, demoId));
  await db.transaction(async (tx) => {
    await transitionLead(tx, leadId, 'demo_built', { actor: opts.actor, soft: true });
    await audit(tx, {
      entity: 'demo',
      entityId: demoId,
      action: 'build',
      actor: opts.actor,
      context: { templateId, palette, source: generated.source, attempts: generated.attempts },
    });
  });
  await enqueue(QUEUES.qaDemo, { demoId }, { singletonKey: `qa:${demoId}` });
  return demoId;
}

/** Gespeicherten Inhalt (ohne Meta) lesen. */
export function storedContent(json: Record<string, unknown> | null | undefined): SiteContent | null {
  if (!json) return null;
  const { _meta, ...rest } = json as Record<string, unknown> & { _meta?: unknown };
  void _meta;
  return rest as unknown as SiteContent;
}
