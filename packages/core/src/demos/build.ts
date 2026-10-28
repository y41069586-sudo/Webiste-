import { resolveBusinessDesign } from './business-design';
import { leadResearch, researchLetterFacts, assertAcquisitionEligible } from '../services/lead-research';
import { researchContentHash, type LeadResearch } from '../leads/acquisition';
import { designTemplateRank, industryDirection, type ArtDirection } from '@wbm/templates';
import { v4Offer, V4_TIERS } from '../services/offers-v4';
import { eq, sql } from 'drizzle-orm';
import {
  renderSite,
  templatesForGroup,
  type BusinessFacts,
  type DemoOptions,
  type SiteContent,
  type SenderInfo,
} from '@wbm/templates';
import { appUrl, demoUrl } from '../config/env';
import { getConfig } from '../config/service';
import { DEFAULT_CONFIG, type AppConfig } from '../config/settings';
import { publicOperatorSettings } from '../config/operator';
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
import { optimizeImage } from '../render/images';
import { priceTaxSuffix } from '../invoices/build';
import {
  buildDemoPrompt,
  DEMO_CONTENT_SCHEMA,
  DEMO_SYSTEM_PROMPT,
  DEMO_TOOL_NAME,
  normalizeContent,
  validateDemoContent,
  verifiedServiceFallback,
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
    googleReviewsUrl: lead.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(lead.googlePlaceId)}`
      : null,
    group: lead.branchGroup,
    industry: lead.industry ?? undefined,
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

export function leadContentFacts(lead: Lead, cfg: AppConfig, research?: LeadResearch | null): ContentFacts {
  const branch = cfg.targeting.branches.find((b) => b.key === lead.branch);
  const details = researchLetterFacts(research ?? null);
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
    verifiedServices: research?.signals
      .filter((s) => s.kind === 'service' && details.some((f) => f.text === s.text))
      .slice(0, 6)
      .map((s) => s.text),
    verifiedDetails: details.map((f) => f.text),
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

/** wa.me-Link auf die Nummer des Betreibers mit vorausgefülltem Text (kein Bot, der Betrieb schreibt uns). */
export function whatsappUrl(cfg: AppConfig, slug: string): string | null {
  const n = cfg.sender.whatsappNumber.replace(/\D/g, '');
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(`Frage zu meinem Website-Entwurf ${slug}`)}`;
}

export function demoOptions(slug: string, cfg: AppConfig, photoDataUri: string | null = null): DemoOptions {
  cfg = publicOperatorSettings(cfg, DEFAULT_CONFIG.sender);
  const p = cfg.pricing;
  const tax = priceTaxSuffix(cfg);
  const care = `${formatEuroShort(p.subscriptionCents)}/Monat`;
  const take = (plan: 'one_time' | 'monthly') => demoUrl(`/d/${slug}/uebernehmen?plan=${plan}`);
  const offers: NonNullable<DemoOptions['offers']> = [
    {
      title: 'Einmalzahlung',
      price: formatEuroShort(p.packageCents),
      unit: tax ? `einmalig ${tax}` : 'einmalig',
      points: [
        `Eigene Domain und ${p.hostingMonthsIncluded} Monate Hosting inklusive`,
        `Danach optional ${care}, monatlich kündbar`,
      ],
      href: take('one_time'),
    },
  ];
  if (p.monthlyEnabled)
    offers.push({
      title: 'Monatlich',
      price: formatEuroShort(p.monthlyCents),
      unit: tax ? `pro Monat ${tax}` : 'pro Monat',
      points: [
        `${p.minTermMonths} Monate Mindestlaufzeit`,
        `Ab Monat ${p.minTermMonths + 1} nur noch ${care}, dann monatlich kündbar`,
        'Eigene Domain und Hosting inklusive',
      ],
      href: take('monthly'),
    });
  if (cfg.offers.activeVersion === 'v4') {
    offers.splice(
      0,
      offers.length,
      ...V4_TIERS.map((tier) => {
        const o = v4Offer(tier);
        return {
          title: tier === 'basis' ? 'SeitenWerk Basis' : 'SeitenWerk Care+',
          price: formatEuroShort(o.setupCents),
          monthly: formatEuroShort(o.monthlyCents),
          // Ohne geklärten Steuerstatus kein Steuerzusatz; die Bestellung ist dann ohnehin noch nicht freigeschaltet
          unit: tax ? `einmalig ${tax}` : 'einmalig',
          points: [
            `+ ${formatEuroShort(o.monthlyCents)}/Monat insgesamt ab Go-Live`,
            'Monatlich kündbar, keine zwölfmonatige Mindestbindung',
            tier === 'care_plus'
              ? 'Hosting inklusive; bis zu 60 Minuten kleine Inhaltsänderungen/Monat'
              : 'Hosting, SSL und Basis-Support bei Betriebsstörungen',
            'Standard-Domain im vereinbarten Kostenrahmen enthalten',
          ],
          href: demoUrl(`/d/${slug}/uebernehmen?plan=${tier}`),
        };
      }),
    );
  }
  return {
    offerVersion: cfg.offers.activeVersion,
    slug,
    priceLabel: formatEuroShort(cfg.offers.activeVersion === 'v4' ? v4Offer('basis').setupCents : p.packageCents),
    checkoutUrl: demoUrl(`/d/${slug}/uebernehmen`),
    questionUrl: demoUrl(`/d/${slug}/frage`),
    optOutUrl: demoUrl(`/d/${slug}/kein-interesse`),
    sender: senderInfo(cfg),
    expiresLabel: EXPIRES_PLACEHOLDER,
    offers,
    guaranteeNote:
      !cfg.tax.operatorConfirmed || !cfg.legal.termsMarkdown.trim()
        ? 'Die Online-Bestellung ist noch nicht freigeschaltet. Fragen zum Entwurf beantworte ich gern schon jetzt – per WhatsApp, E-Mail oder über das Formular unten.'
        : cfg.guarantee.enabled
          ? cfg.offers.activeVersion === 'v4'
            ? `${cfg.guarantee.days} Tage Einrichtungsgarantie ab Go-Live laut Vertragsbedingungen: Sind Sie nicht zufrieden, wird die Einrichtungsgebühr erstattet. Gesetzliche Rechte bleiben unberührt.`
            : `${cfg.guarantee.days} Tage Zufriedenheitsgarantie: Gefällt Ihnen die fertige Website nicht, bekommen Sie Ihr Geld zurück.`
          : null,
    // Über unsere Weiterleitung, damit der Klick gezählt wird (B6.1); Ziel bleibt der wa.me-Link
    whatsappUrl: whatsappUrl(cfg, slug) ? demoUrl(`/d/${slug}/whatsapp`) : null,
    trust: {
      name: cfg.sender.name,
      intro: cfg.sender.intro,
      photoDataUri,
      email: cfg.sender.email,
      phone: cfg.sender.phone,
      imprintUrl: appUrl('/impressum'),
    },
  };
}

const photoCache = new Map<string, string | null>();

/**
 * Foto für den Vertrauensblock: data:-URI direkt, https-URL einmalig laden und verkleinert einbetten
 * (die Demo-CSP erlaubt nur eingebettete Bilder). Fehler → ohne Foto.
 */
export async function senderPhotoDataUri(cfg: AppConfig): Promise<string | null> {
  const src = cfg.sender.photoUrl.trim();
  if (!src) return null;
  if (/^data:image\/(jpeg|png|webp);base64,/.test(src)) return src;
  if (!/^https:\/\//.test(src)) return null;
  if (photoCache.has(src)) return photoCache.get(src)!;
  let result: string | null = null;
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(10_000) });
    const type = res.headers.get('content-type') ?? '';
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok || !/^image\/(jpeg|png|webp)/.test(type) || buf.length > 3 * 1024 * 1024)
      throw new Error(`Foto nicht nutzbar (HTTP ${res.status}, ${type}, ${buf.length} Bytes)`);
    const small = await optimizeImage(buf, type.split(';')[0]!, { maxWidth: 192, format: 'jpeg', quality: 0.85 });
    result = `data:image/jpeg;base64,${small.toString('base64')}`;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'Absenderfoto konnte nicht geladen werden');
  }
  photoCache.set(src, result);
  return result;
}

/**
 * Template + Palette: gleichmäßige Rotation (am seltensten genutzte Kombination zuerst,
 * bei Gleichstand deterministisch je Lead). Bei Neugenerierung ein anderes Template.
 */
export function chooseTemplate(
  lead: Pick<Lead, 'id' | 'branchGroup'> & Partial<Pick<Lead, 'branch'>>,
  previous: string[] = [],
  usage: Record<string, number> = {},
  direction?: ArtDirection,
): { templateId: string; palette: string } {
  const resolvedDirection = direction ?? (lead.branch ? industryDirection(lead.branchGroup, lead.branch) : null);
  const rank = (id: string) => (resolvedDirection ? designTemplateRank(id, resolvedDirection) : 0);
  const options = templatesForGroup(lead.branchGroup);
  const fresh = options.filter((t) => !previous.includes(t.id));
  const pool = fresh.length ? fresh : options;
  const tplUse = (id: string) =>
    Object.entries(usage)
      .filter(([k]) => k.startsWith(`${id}/`))
      .reduce((s, [, n]) => s + n, 0);
  const tpl = [...pool].sort(
    (a, b) =>
      rank(a.id) - rank(b.id) ||
      tplUse(a.id) - tplUse(b.id) ||
      seedFromId(`${lead.id}:${a.id}`) - seedFromId(`${lead.id}:${b.id}`),
  )[0]!;
  const natural = /garten|landschaft|gärtner|gaertner/i.test(lead.branch ?? '');
  const preference = (palette: string) => (natural && palette === 'waldgruen' ? -1 : 0);
  const palette = [...tpl.palettes].sort(
    (a, b) =>
      (usage[`${tpl.id}/${a}`] ?? 0) - (usage[`${tpl.id}/${b}`] ?? 0) ||
      preference(a) - preference(b) ||
      tpl.palettes.indexOf(a) - tpl.palettes.indexOf(b),
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
export async function generateDemoContent(lead: Lead, cfg: AppConfig, direction?: ArtDirection): Promise<GeneratedContent> {
  const research = await leadResearch(lead);
  const facts = {
    ...leadContentFacts(lead, cfg, research),
    designCharacter: direction?.character,
  };
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
  const content = libraryContent(
    lead.branch,
    lead.branchGroup,
    { name: lead.businessName, stadt: lead.city, branche: branch?.label ?? lead.branch },
    seed,
  );
  return { content: verifiedServiceFallback(content, facts), source: 'fallback', attempts: 2, violations: lastViolations };
}

export function renderDemoHtml(input: {
  templateId: string;
  palette: string;
  content: SiteContent;
  facts: BusinessFacts;
  slug: string;
  cfg: AppConfig;
  mode?: 'demo' | 'screenshot';
  photoDataUri?: string | null;
  artDirection?: ArtDirection;
}): string {
  return renderSite({
    templateId: input.templateId,
    artDirection: input.artDirection,
    palette: input.palette,
    mode: input.mode ?? 'demo',
    content: input.content,
    facts: input.facts,
    demo: demoOptions(input.slug, input.cfg, input.photoDataUri ?? null),
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
export async function buildDemo(
  leadId: string,
  opts: {
    regenerate?: boolean;
    actor: string;
    /** erzwingt die manuelle Prüfung (z. B. Überarbeitung für Brief 3) */
    reviewNote?: string;
    /** festes Template (z. B. bestes der Branche laut Lernsystem) */
    templateId?: string;
  },
): Promise<string> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) throw new Error('Lead nicht gefunden');
  if (lead.anonymizedAt || ['suppressed', 'rejected', 'expired'].includes(lead.status)) {
    throw new Error(`Lead im Status ${lead.status} – keine Demo`);
  }
  await assertAcquisitionEligible(lead);
  const research = await leadResearch(lead);
  const researchHash = researchContentHash(research);
  const existing = await db.select().from(demos).where(eq(demos.leadId, leadId));
  const open = existing.find((d) => ['building', 'pending_review', 'approved', 'published'].includes(d.status));
  if (open && !opts.regenerate) return open.id;
  if (!['qualified', 'demo_built', 'failed'].includes(lead.status) && !opts.regenerate) {
    throw new Error(`Lead im Status ${lead.status} – Demo nicht vorgesehen`);
  }

  const design = await resolveBusinessDesign(lead);
  const rotated = chooseTemplate(
    lead,
    existing.map((d) => d.templateId),
    await templateUsage(),
    design.direction,
  );
  const fixed = opts.templateId ? templatesForGroup(lead.branchGroup).find((t) => t.id === opts.templateId) : undefined;
  const templateId = fixed?.id ?? rotated.templateId;
  const palette = fixed ? (fixed.palettes.includes(rotated.palette) ? rotated.palette : fixed.palettes[0]!) : rotated.palette;
  const generated = await generateDemoContent(lead, cfg, design.direction);
  const facts = {
    ...leadToFacts(lead, cfg),
    verifiedServices: leadContentFacts(lead, cfg, research).verifiedServices,
    photos: design.photos,
  };
  const slug = randomToken(24);
  const html = renderDemoHtml({
    templateId,
    palette,
    artDirection: design.direction,
    content: generated.content,
    facts,
    slug,
    cfg,
    photoDataUri: await senderPhotoDataUri(cfg),
  });

  let createdId: string | undefined;
  let demoId: string;
  try {
    demoId = await db.transaction(async (tx) => {
      // Do not hold a DB connection during LLM work. Lock only the final persistence stage.
      // Opt-out/anonymization take the same lock and cannot be followed by newly restored demo files.
      await tx.execute(sql`SELECT id FROM leads WHERE id=${leadId} FOR UPDATE`);
      const current = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
      if (!current || current.anonymizedAt || ['suppressed', 'rejected', 'expired'].includes(current.status))
        throw Error('Betrieb inzwischen gesperrt; keine Demo gespeichert.');
      if (researchContentHash(await leadResearch(current, tx)) !== researchHash)
        throw Error('Recherche während der Demo-Erstellung geändert; neu prüfen.');
      const [demo] = await tx
        .insert(demos)
        .values({
          leadId,
          slug,
          templateId,
          palette,
          status: 'building',
          reviewNote: opts.reviewNote ?? null,
          contentJson: {
            ...generated.content,
            _meta: {
              source: generated.source,
              attempts: generated.attempts,
              violations: generated.violations,
              artDirection: design.direction,
              designSourceRef: design.sourceRef,
              designRequiresReview: design.requiresReview,
              researchHash,
            },
          } as unknown as Record<string, unknown>,
        })
        .returning({ id: demos.id });
      const demoId = demo!.id;
      createdId = demoId;
      await getProviders().storage.put(demoHtmlKey(demoId), html, 'text/html; charset=utf-8');
      await tx
        .update(demos)
        .set({ htmlStorageKey: demoHtmlKey(demoId) })
        .where(eq(demos.id, demoId));
      await transitionLead(tx, leadId, 'demo_built', { actor: opts.actor, soft: true });
      await audit(tx, {
        entity: 'demo',
        entityId: demoId,
        action: 'build',
        actor: opts.actor,
        context: { templateId, palette, source: generated.source, attempts: generated.attempts },
      });
      return demoId;
    });
  } catch (err) {
    if (createdId) await getProviders().storage.delete(demoHtmlKey(createdId));
    throw err;
  }
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
