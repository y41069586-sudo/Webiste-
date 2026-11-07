import { resolveBusinessDesign } from './business-design';
import { leadResearch, researchLetterFacts, assertAcquisitionEligible } from '../services/lead-research';
import { researchContentHash, type LeadResearch } from '../leads/acquisition';
import {
  applyMobileHeroLayer,
  authoredTemplateId,
  isAuthoredTemplate,
  freeDesignBrief,
  checkAuthoredDesign,
  type ArtDirection,
} from '@wbm/templates';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { renderSite, stockPhotos, stockPhotoDataUri, type BusinessFacts, type SiteContent } from '@wbm/templates';
import { getConfig } from '../config/service';
import { type AppConfig } from '../config/settings';
import { getDb } from '../db/client';
import { demos, leads } from '../db/schema';
import { formatPhoneDe, phoneHref } from '../leads/normalize';
import { formatOpeningHours } from '../leads/opening-hours';
import { logger } from '../logger';
import { getProviders } from '../providers';
import { enqueue, QUEUES } from '../queue';
import { audit } from '../services/audit';
import { transitionLead } from '../services/lead-state';
import { randomToken, sha256 } from '../util/crypto';
import { optimizeImage } from '../render/images';
import { browserChecks } from '../render/browser-checks';
import type { ContentFacts, RuleViolation } from './content';
import { libraryContent } from './library';
import './mock-handlers';
import { STUDIO_VERSION } from './studio';
import { authorStudioContent, type GeneratedContent } from './studio-author';
import { clearOperatorWish, loadOperatorWish, operatorWishPrompt } from './operator-wish';
export type { GeneratedContent } from './studio-author';

type Lead = typeof leads.$inferSelect;

import { demoOptions, EXPIRES_PLACEHOLDER, senderInfo, whatsappUrl } from './offer-options';
export { demoOptions, EXPIRES_PLACEHOLDER, senderInfo, whatsappUrl };

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

/** Compatibility metadata only: the model authors each new composition and color system. */
export function chooseTemplate(
  lead: Pick<Lead, 'id' | 'branchGroup'> & Partial<Pick<Lead, 'branch'>>,
  previous: string[] = [],
  usage: Record<string, number> = {},
  direction?: ArtDirection,
  hours?: { value: string }[],
): { templateId: string; palette: string; reason?: string } {
  // New drafts are individually authored. Historical template IDs remain readable, never the new default.
  void previous;
  void usage;
  void direction;
  void hours;
  return {
    templateId: authoredTemplateId(lead.branchGroup),
    palette: 'custom',
    reason: 'KI entwirft HTML/CSS nach Kriterien; keine Branchenvorlage.',
  };
}

/** Stable, described image slots: layout/model decides whether and where to use them. */
export function demoPhotoSlots(
  leadId: string,
  facts: BusinessFacts,
  own: NonNullable<BusinessFacts['photos']> = [],
  recentFiles: string[] = [],
): NonNullable<BusinessFacts['photos']> {
  if (own.length) return own;
  return stockPhotos(facts.group, seedFromId(leadId), [facts.branchLabel, ...(facts.verifiedServices ?? [])].join(' '), {
    avoidFiles: recentFiles,
  })
    .slice(0, 3)
    .map((p) => ({ src: stockPhotoDataUri(p), alt: p.alt, origin: 'example' as const, rightsConfirmed: true, assetId: p.file }));
}

/**
 * Art direction first, then independent HTML/CSS implementation with the actual image material.
 * Each model call uses the existing budget ledger. No template fallback after failed authorship.
 */
export async function generateDemoContent(
  lead: Lead,
  cfg: AppConfig,
  direction?: ArtDirection,
  qaFeedback?: string[],
  photos: NonNullable<BusinessFacts['photos']> = [],
  recentConcepts: string[] = [],
  signal?: AbortSignal,
  operatorWish?: string,
  precheck?: (content: SiteContent) => Promise<RuleViolation[]>,
): Promise<GeneratedContent> {
  const research = await leadResearch(lead);
  const facts = {
    ...leadContentFacts(lead, cfg, research),
    requireFullPage: true,
    // A sector fallback is not the business identity and must not preselect the new design.
    designCharacter: direction?.source === 'business_evidence' ? direction.character : undefined,
    imageBrief: photos.map((p, i) => ({ slot: i + 1, alt: p.alt, example: p.origin === 'example' })),
  };
  return authorStudioContent(facts, {
    leadId: lead.id,
    seed: seedFromId(lead.id),
    feedback: qaFeedback,
    photos,
    recentConcepts,
    signal,
    operatorWish,
    precheck,
  });
}

/** Ablauf-/Platzhalterkarten der Bibliothek sind keine Leistungen */
const NOT_A_SERVICE =
  /anfrag|abstimm|^(?:angebot|standort|ihr vorhaben|terminwünsche|zugang und umfang|besuch planen|vorab reservieren|vorbestellung)$/i;

/**
 * Typische Leistungen der Branche als getrennt gekennzeichnete Beispiele neben belegten Leistungen
 * (Entwurf; die Leistungsliste selbst bleibt bei den belegten Titeln).
 */
export function exampleServicesFor(lead: Lead, cfg: AppConfig, verified: string[]) {
  const branch = cfg.targeting.branches.find((b) => b.key === lead.branch);
  const lib = libraryContent(
    lead.branch,
    lead.branchGroup,
    { name: lead.businessName, stadt: lead.city, branche: branch?.label ?? lead.branch },
    5,
  );
  const known = verified.map((v) => v.toLocaleLowerCase('de'));
  return lib.services
    .filter((s) => !NOT_A_SERVICE.test(s.title) && !known.includes(s.title.toLocaleLowerCase('de')))
    .slice(0, 4)
    .map((s) => ({ title: s.title, icon: s.icon }));
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
    /** Historischer Aufruferparameter; neue Entwürfe verwenden ausschließlich freie Gestaltung. */
    templateId?: string;
    /** Befunde der KI-Prüfung des vorigen Entwurfs (automatischer Neubau, höchstens einmal) */
    qaFeedback?: string[];
    /** Controlled CLI runs QA themselves; default keeps the existing queue automation. */
    enqueueQa?: boolean;
    /** Technischer Selbsttest im Browser vor dem Speichern (Worker: an), mit einer Nachbesserung bei Befunden */
    selfTest?: boolean;
    signal?: AbortSignal;
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
  if (open && !opts.regenerate) {
    if (open.status === 'building' && opts.enqueueQa !== false)
      await enqueue(QUEUES.qaDemo, { demoId: open.id }, { singletonKey: `qa:${open.id}` });
    return open.id;
  }
  if (!['qualified', 'demo_built', 'failed'].includes(lead.status) && !opts.regenerate) {
    throw new Error(`Lead im Status ${lead.status} – Demo nicht vorgesehen`);
  }

  const design = await resolveBusinessDesign(lead);
  const { templateId, palette } = chooseTemplate(lead);
  const verifiedServices = leadContentFacts(lead, cfg, research).verifiedServices;
  const recent = await db
    .select({ content: demos.contentJson })
    .from(demos)
    .innerJoin(leads, eq(demos.leadId, leads.id))
    .where(eq(leads.branch, lead.branch))
    .orderBy(desc(demos.createdAt))
    .limit(5);
  const recentConcepts = recent
    .map((r) => (r.content?.design as SiteContent['design'])?.concept)
    .filter((s): s is string => Boolean(s))
    .map((s) => s.slice(0, 350));
  const recentFiles = recent.flatMap((r) => (r.content?._meta as { photoAssets?: string[] } | undefined)?.photoAssets ?? []);
  const photoSlots = demoPhotoSlots(lead.id, { ...leadToFacts(lead, cfg), verifiedServices }, design.photos, recentFiles);
  opts.signal?.throwIfAborted();
  const wish = await loadOperatorWish(lead.id);
  const facts = {
    ...leadToFacts(lead, cfg),
    verifiedServices,
    exampleServices: verifiedServices?.length ? exampleServicesFor(lead, cfg, verifiedServices) : undefined,
    photos: photoSlots,
  };
  const senderPhoto = await senderPhotoDataUri(cfg);
  // 07.11.2026: Entwurf vor dem Speichern so testen, wie die Demo-QA ihn sieht (gerendert, mit Handy-Einstieg), damit
  // Kontrast-, Überlauf- und Strukturfehler schon beim Bau nachgebessert werden statt erst in der Endprüfung aufzufallen
  const precheck = opts.selfTest
    ? async (content: SiteContent): Promise<RuleViolation[]> => {
        if (isAuthoredTemplate(templateId)) {
          const issues = content.design ? checkAuthoredDesign(content.design) : ['Individueller Entwurf fehlt'];
          if (issues.length)
            return issues.slice(0, 8).map((detail) => ({ field: 'design', rule: 'Gestaltungsregel verletzt', detail }));
        }
        const page = applyMobileHeroLayer(
          renderDemoHtml({
            templateId,
            palette,
            artDirection: design.direction,
            content,
            facts,
            slug: 'selbsttest',
            cfg,
            photoDataUri: senderPhoto,
          }),
        ).replaceAll(EXPIRES_PLACEHOLDER, 'nach Ablauf der Frist');
        const checks = await browserChecks({ html: page, expectedFacts: { name: facts.name, city: facts.city } });
        return checks
          .filter((c) => !c.passed)
          .map((c) => ({
            field: `browser.${c.name}`,
            rule: 'Technische Prüfung nicht bestanden',
            detail: (c.details ?? 'ohne Detail').slice(0, 400),
          }));
      }
    : undefined;
  const generated = await generateDemoContent(
    lead,
    cfg,
    design.direction,
    opts.qaFeedback,
    photoSlots,
    recentConcepts,
    opts.signal,
    wish ? operatorWishPrompt(wish) : undefined,
    precheck,
  );
  opts.signal?.throwIfAborted();
  if (isAuthoredTemplate(templateId) && (!generated.content.design || checkAuthoredDesign(generated.content.design).length))
    throw Error('Kein gültiger individueller Gestaltungsentwurf. Zur Prüfung liegen lassen; keine Standardvorlage als Ersatz.');
  const brief = freeDesignBrief(facts, generated.content);
  const slug = randomToken(24);
  const html = renderDemoHtml({
    templateId,
    palette,
    artDirection: design.direction,
    content: generated.content,
    facts,
    slug,
    cfg,
    photoDataUri: senderPhoto,
  });

  let createdId: string | undefined;
  let demoId: string;
  try {
    demoId = await db.transaction(async (tx) => {
      opts.signal?.throwIfAborted();
      // Do not hold a DB connection during LLM work. Lock only the final persistence stage.
      // Opt-out/anonymization take the same lock and cannot be followed by newly restored demo files.
      await tx.execute(sql`SELECT id FROM leads WHERE id=${leadId} FOR UPDATE`);
      const current = await tx.query.leads.findFirst({ where: eq(leads.id, leadId) });
      if (!current || current.anonymizedAt || ['suppressed', 'rejected', 'expired'].includes(current.status))
        throw Error('Betrieb inzwischen gesperrt; keine Demo gespeichert.');
      if (researchContentHash(await leadResearch(current, tx)) !== researchHash)
        throw Error('Recherche während der Demo-Erstellung geändert; neu prüfen.');
      if (!opts.regenerate) {
        const winner = await tx.query.demos.findFirst({
          where: and(eq(demos.leadId, leadId), inArray(demos.status, ['building', 'pending_review', 'approved', 'published'])),
          columns: { id: true },
        });
        if (winner) return winner.id;
      }
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
              photoAssets: photoSlots.map((p) => p.assetId).filter(Boolean),
              studio: { version: STUDIO_VERSION, plan: generated.studioPlan },
              ...(brief ? { designBrief: brief } : {}),
              ...(opts.qaFeedback?.length ? { qaRetry: 1 } : {}),
              ...(generated.precheckOpen?.length ? { precheckOpen: generated.precheckOpen.map((v) => v.field) } : {}),
              ...(wish ? { operatorWish: { note: wish.note, fromDemo: wish.demoId } } : {}),
            },
          } as unknown as Record<string, unknown>,
        })
        .returning({ id: demos.id });
      const demoId = demo!.id;
      createdId = demoId;
      await getProviders().storage.put(demoHtmlKey(demoId), html, 'text/html; charset=utf-8');
      opts.signal?.throwIfAborted();
      await tx
        .update(demos)
        .set({ htmlStorageKey: demoHtmlKey(demoId) })
        .where(eq(demos.id, demoId));
      await transitionLead(tx, leadId, 'demo_built', { actor: opts.actor, soft: true });
      // Wunsch ist mit diesem Neubau umgesetzt; ein weiterer Neubau braucht einen neuen Wunsch
      if (wish) await clearOperatorWish(leadId, tx);
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
  if (opts.enqueueQa !== false) await enqueue(QUEUES.qaDemo, { demoId }, { singletonKey: `qa:${demoId}` });
  return demoId;
}

/** Gespeicherten Inhalt (ohne Meta) lesen. */
export function storedContent(json: Record<string, unknown> | null | undefined): SiteContent | null {
  if (!json) return null;
  const { _meta, ...rest } = json as Record<string, unknown> & { _meta?: unknown };
  void _meta;
  return rest as unknown as SiteContent;
}
