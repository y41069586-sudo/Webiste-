import { eq } from 'drizzle-orm';
import { renderSite, renderSubpage, type BusinessFacts, type RenderInput, type SiteContent } from '@wbm/templates';
import { appUrl } from '../config/env';
import { effectiveSwitches, getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb } from '../db/client';
import { changeRequests, customers, events, leads, orders, sites } from '../db/schema';
import { liveHandoverEmail, previewReadyEmail } from '../emails/templates';
import { formatPhoneDe, phoneHref } from '../leads/normalize';
import { formatOpeningHours } from '../leads/opening-hours';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import { LlmNoToolCallError, LlmRefusalError } from '../providers/llm/anthropic';
import type { SiteFile } from '../providers/types';
import { enqueue, QUEUES } from '../queue';
import { audit } from '../services/audit';
import { assertNotHalted, raiseAlert, recordCost } from '../services/budget';
import { notifyAdmin, sendTransactionalEmail } from '../services/email';
import { transitionLead } from '../services/lead-state';
import { llmStructured } from '../services/llm';
import { imageType, onboardingDefaults, siteUploads, type Site } from '../services/sites';
import { impressumHtml, privacyHtml } from '../sites/legal';
import { hoursToOpeningHours, normalizeOnboarding, toImpressumData, type OnboardingData } from '../sites/onboarding-data';
import {
  buildRevisionPrompt,
  mergeCustomerTexts,
  REVISION_SCHEMA,
  REVISION_SYSTEM_PROMPT,
  REVISION_TOOL_NAME,
  validateRevision,
  type RevisionInput,
  type RevisionOutput,
} from '../sites/revision';
import { esc } from '../util/html';
import { addMonths, formatDateLongDe } from '../util/time';
import { sha256 } from '../util/crypto';
import { optimizeImage } from './images';
import { browserChecks, lighthouseCheck, validateHtml } from './qa';

type Ctx = {
  site: Site;
  customer: typeof customers.$inferSelect;
  order: typeof orders.$inferSelect;
  lead: typeof leads.$inferSelect | null;
  cfg: AppConfig;
  data: OnboardingData;
};

async function loadCtx(siteId: string): Promise<Ctx> {
  const db = getDb();
  const site = await db.query.sites.findFirst({ where: eq(sites.id, siteId) });
  if (!site) throw new Error('Seite nicht gefunden');
  const customer = (await db.query.customers.findFirst({ where: eq(customers.id, site.customerId) }))!;
  const order = (await db.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }))!;
  const lead = customer.leadId ? ((await db.query.leads.findFirst({ where: eq(leads.id, customer.leadId) })) ?? null) : null;
  const cfg = await getConfig({ fresh: true });
  const content = site.contentJson as unknown as SiteContent;
  const data = normalizeOnboarding((site.onboardingJson ?? {}) as Partial<Record<keyof OnboardingData, unknown>>, onboardingDefaults({ customer, order, lead, content }));
  return { site, customer, order, lead, cfg, data };
}

function currentContent(site: Site): SiteContent {
  const { _meta, ...rest } = (site.contentJson ?? {}) as Record<string, unknown> & { _meta?: unknown };
  void _meta;
  return rest as unknown as SiteContent;
}

// ---------------------------------------------------------------------------
// Inhalte überarbeiten (Claude) und Vorschau bauen
// ---------------------------------------------------------------------------
async function reviseContent(ctx: Ctx, changeRequest?: string): Promise<{ content: SiteContent; notPossible: string[]; summary: string; source: 'llm' | 'fallback' }> {
  const branch = ctx.cfg.targeting.branches.find((b) => b.key === ctx.lead?.branch);
  const input: RevisionInput = {
    businessName: ctx.data.business.name,
    branchLabel: branch?.label ?? ctx.lead?.branch ?? '',
    city: ctx.data.business.city,
    current: currentContent(ctx.site),
    customer: changeRequest ? {} : { headline: ctx.data.texts.headline, subline: ctx.data.texts.subline, about: ctx.data.texts.about, services: ctx.data.texts.services, wishes: ctx.data.texts.wishes },
    ...(changeRequest ? { changeRequest } : {}),
  };
  // Alles, was der Inhaber selbst geschrieben hat, darf in den Texten vorkommen
  const customerText = [JSON.stringify(ctx.data.texts), ctx.data.impressum.professionalTitle, ctx.data.impressum.chamber, changeRequest ?? '', JSON.stringify(input.current)].join('\n');
  const known = [input.businessName, input.branchLabel, input.city, ctx.data.business.street];
  let feedback: string[] | undefined;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const out = await llmStructured<RevisionOutput>({
        tier: 'creative',
        system: REVISION_SYSTEM_PROMPT,
        prompt: buildRevisionPrompt(input, feedback),
        toolName: REVISION_TOOL_NAME,
        toolDescription: 'Gibt die überarbeiteten Website-Texte zurück.',
        inputSchema: REVISION_SCHEMA as unknown as Record<string, unknown>,
        maxTokens: 8000,
        effort: 'medium',
        purpose: changeRequest ? 'site_change' : 'site_revision',
        leadId: ctx.lead?.id,
      });
      const content = mergeCustomerTexts(out.content, {}); // normalisieren
      const violations = validateRevision(content, customerText, known);
      if (!violations.length) return { content, notPossible: out.not_possible ?? [], summary: out.summary ?? '', source: 'llm' };
      feedback = violations.slice(0, 12).map((v) => `${v.field}: ${v.rule} – ${v.detail}`);
      logger.warn({ siteId: ctx.site.id, attempt, violations: violations.length }, 'site: Überarbeitung verletzt Regeln');
    } catch (err) {
      if (err instanceof LlmRefusalError || err instanceof LlmNoToolCallError) break;
      throw err;
    }
  }
  if (changeRequest) throw new RevisionFailedError('Änderungswunsch konnte nicht automatisch umgesetzt werden');
  // Erstfassung: Angaben des Inhabers direkt übernehmen (seine eigenen Worte)
  return { content: mergeCustomerTexts(input.current, input.customer), notPossible: [], summary: 'Ihre Angaben wurden übernommen.', source: 'fallback' };
}

export class RevisionFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RevisionFailedError';
  }
}

interface PreparedAssets {
  logo: { path: string; data: Buffer; mime: string } | null;
  photos: { path: string; data: Buffer; mime: string; alt: string }[];
}

/** Logo/Fotos verkleinern, Metadaten entfernen; Ergebnis im Storage zwischenspeichern. */
async function prepareAssets(ctx: Ctx): Promise<PreparedAssets> {
  const storage = getProviders().storage;
  const up = siteUploads(ctx.site);
  const cached = async (key: string, maxWidth: number, format: 'jpeg' | 'png') => {
    const outKey = `sites/${ctx.site.id}/assets/${sha256(`${key}:${maxWidth}:${format}`).slice(0, 16)}.${format === 'jpeg' ? 'jpg' : 'png'}`;
    const hit = await storage.get(outKey);
    if (hit) return hit;
    const raw = await storage.get(key);
    if (!raw) return null;
    const t = imageType(raw);
    const out = await optimizeImage(raw, t === 'jpg' ? 'image/jpeg' : `image/${t ?? 'png'}`, { maxWidth, format });
    await storage.put(outKey, out, format === 'jpeg' ? 'image/jpeg' : 'image/png');
    return out;
  };
  let logo: PreparedAssets['logo'] = null;
  if (up.logo) {
    const data = await cached(up.logo.key, 480, 'png');
    if (data) logo = { path: 'assets/logo.png', data, mime: 'image/png' };
  }
  const photos: PreparedAssets['photos'] = [];
  let n = 1;
  for (const p of up.photos) {
    const data = await cached(p.key, 1400, 'jpeg');
    if (!data) continue;
    const alt = ctx.data.photoAlts[p.id]?.trim() || `Foto ${n} von ${ctx.data.business.name}`;
    photos.push({ path: `assets/foto-${n}.jpg`, data, mime: 'image/jpeg', alt });
    n++;
  }
  return { logo, photos };
}

function factsFor(ctx: Ctx, assets: PreparedAssets, mode: 'preview' | 'live'): BusinessFacts {
  const b = ctx.data.business;
  const branch = ctx.cfg.targeting.branches.find((x) => x.key === ctx.lead?.branch);
  const phone = formatPhoneDe(b.phone) ?? (b.phone || null);
  const src = (a: { path: string; data: Buffer; mime: string }) => (mode === 'live' ? a.path : `data:${a.mime};base64,${a.data.toString('base64')}`);
  return {
    name: b.name,
    branchLabel: branch?.label ?? ctx.lead?.branch ?? '',
    group: ctx.lead?.branchGroup ?? (ctx.site.templateId.startsWith('beauty') ? 'beauty' : 'handwerk'),
    street: b.street,
    houseNumber: b.houseNumber,
    postalCode: b.postalCode,
    city: b.city,
    phone,
    phoneHref: phoneHref(phone),
    email: b.email || null,
    openingLines: formatOpeningHours(hoursToOpeningHours(ctx.data.hours)).map((l) => {
      const i = l.indexOf(': ');
      return { label: l.slice(0, i), value: l.slice(i + 2) };
    }),
    logoSrc: assets.logo ? src(assets.logo) : null,
    photos: assets.photos.map((p) => ({ src: src(p), alt: p.alt })),
  };
}

function renderInput(ctx: Ctx, content: SiteContent, facts: BusinessFacts, mode: 'preview' | 'live'): RenderInput {
  const domain = ctx.customer.domain;
  return {
    templateId: ctx.site.templateId,
    palette: ctx.site.palette,
    mode,
    content,
    facts,
    live: {
      formAction: appUrl(`/api/forms/${ctx.site.formKey}`),
      imprintPath: 'impressum.html',
      privacyPath: 'datenschutz.html',
      ...(domain ? { canonicalUrl: `https://${domain}/` } : {}),
    },
  };
}

function marker(site: Site, version: number): string {
  return sha256(`${site.id}:${version}`).slice(0, 16);
}

function withMarker(html: string, m: string): string {
  return html.replace('</head>', `<meta name="wbm-site" content="${m}">\n</head>`);
}

/** Alle Dateien der Live-Website. */
export function buildLiveFiles(ctx: Ctx, content: SiteContent, assets: PreparedAssets, version: number): SiteFile[] {
  const facts = factsFor(ctx, assets, 'live');
  const input = renderInput(ctx, content, facts, 'live');
  const m = marker(ctx.site, version);
  const html = (s: string) => withMarker(s, m);
  const domain = ctx.customer.domain;
  const base = domain ? `https://${domain}/` : '';
  const files: SiteFile[] = [
    { path: 'index.html', content: html(renderSite(input)), contentType: 'text/html; charset=utf-8' },
    { path: 'impressum.html', content: html(renderSubpage(input, { title: 'Impressum', bodyHtml: impressumHtml(toImpressumData(ctx.data.impressum)) })), contentType: 'text/html; charset=utf-8' },
    { path: 'datenschutz.html', content: html(renderSubpage(input, { title: 'Datenschutzerklärung', bodyHtml: privacyHtml(ctx.data.privacyText) })), contentType: 'text/html; charset=utf-8' },
    {
      path: 'danke.html',
      content: html(renderSubpage(input, { title: 'Vielen Dank für Ihre Nachricht', bodyHtml: `<p>Wir haben Ihre Nachricht erhalten und melden uns so bald wie möglich bei Ihnen.</p><p><a href="./">Zurück zur Startseite</a></p>` })),
      contentType: 'text/html; charset=utf-8',
    },
    {
      path: '404.html',
      content: html(renderSubpage(input, { title: 'Seite nicht gefunden', bodyHtml: `<p>Diese Seite gibt es nicht (mehr).</p><p><a href="/">Zur Startseite von ${esc(facts.name)}</a></p>`, homeHref: '/' })),
      contentType: 'text/html; charset=utf-8',
    },
    { path: 'robots.txt', content: `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}sitemap.xml\n` : ''}`, contentType: 'text/plain; charset=utf-8' },
  ];
  if (base) {
    const urls = ['', 'impressum.html', 'datenschutz.html'].map((p) => `<url><loc>${esc(base + p)}</loc></url>`).join('');
    files.push({ path: 'sitemap.xml', content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>\n`, contentType: 'application/xml' });
  }
  if (assets.logo) files.push({ path: assets.logo.path, content: assets.logo.data, contentType: assets.logo.mime });
  for (const p of assets.photos) files.push({ path: p.path, content: p.data, contentType: p.mime });
  return files;
}

/**
 * Qualitätsprüfung der Kundenseite (HTML-Validierung, Barrierefreiheit, Layout, optional Lighthouse).
 * Blockiert nicht – Auffälligkeiten erscheinen als Meldung im Dashboard.
 */
async function siteQa(ctx: Ctx, content: SiteContent, assets: PreparedAssets, previewHtml: string, version: number): Promise<{ passed: boolean; checks: { name: string; passed: boolean; details?: string }[] }> {
  try {
    const files = buildLiveFiles(ctx, content, assets, version);
    const liveIndex = String(files[0]!.content);
    const checks = [await validateHtml(liveIndex), ...(await browserChecks({ html: previewHtml }))];
    if (ctx.cfg.review.qaLighthouse) checks.push(await lighthouseCheck(liveIndex, 0.9, files.slice(1)));
    const passed = checks.every((c) => c.passed);
    if (!passed) {
      await raiseAlert(getDb(), {
        level: 'warn',
        code: `site_qa_${ctx.site.id}`,
        message: `QA-Hinweise für ${ctx.data.business.name}: ${checks.filter((c) => !c.passed).map((c) => c.name).join(', ')}`,
        context: { siteId: ctx.site.id },
      });
    }
    return { passed, checks: checks.map((c) => ({ name: c.name, passed: c.passed, ...(c.details ? { details: String(c.details).slice(0, 500) } : {}) })) };
  } catch (err) {
    logger.warn({ siteId: ctx.site.id, ...errInfo(err) }, 'site: QA fehlgeschlagen');
    return { passed: false, checks: [{ name: 'qa', passed: false, details: errInfo(err).message }] };
  }
}

export function previewKey(siteId: string, version: number): string {
  return `sites/${siteId}/preview-v${version}.html`;
}

/**
 * Vorschau bauen: Angaben übernehmen (bzw. Änderungswunsch umsetzen), Bilder optimieren,
 * Vorschau-HTML speichern, Kunden benachrichtigen.
 */
export async function buildSite(siteId: string, changeRequestId?: string): Promise<{ version: number; source: string } | { skipped: string }> {
  const db = getDb();
  const ctx = await loadCtx(siteId);
  if (!['generating', 'changes_requested'].includes(ctx.site.status)) return { skipped: `Status ${ctx.site.status}` };
  const cr = changeRequestId ? await db.query.changeRequests.findFirst({ where: eq(changeRequests.id, changeRequestId) }) : undefined;
  if (changeRequestId && (!cr || cr.status !== 'open')) return { skipped: 'Änderungswunsch nicht offen' };

  let revised: Awaited<ReturnType<typeof reviseContent>>;
  try {
    revised = await reviseContent(ctx, cr?.text);
  } catch (err) {
    if (err instanceof RevisionFailedError && cr) {
      await db.update(changeRequests).set({ status: 'needs_admin', resultNote: err.message }).where(eq(changeRequests.id, cr.id));
      await db.update(sites).set({ status: 'preview', updatedAt: new Date() }).where(eq(sites.id, siteId));
      await notifyAdmin({ key: `change-failed:${cr.id}`, title: 'Änderungswunsch braucht dich', lines: [`Kunde: ${ctx.customer.company}`, `Wunsch: ${cr.text.slice(0, 500)}`], link: appUrl(`/admin/customers/${ctx.customer.id}`) });
      return { skipped: 'an Admin übergeben' };
    }
    throw err;
  }

  const version = ctx.site.version + 1;
  const assets = await prepareAssets(ctx);
  const facts = factsFor(ctx, assets, 'preview');
  const html = renderSite(renderInput(ctx, revised.content, facts, 'preview'));
  await getProviders().storage.put(previewKey(siteId, version), html, 'text/html; charset=utf-8');
  const qa = await siteQa(ctx, revised.content, assets, html, version);
  const impressum = toImpressumData(ctx.data.impressum);
  await db
    .update(sites)
    .set({
      contentJson: { ...revised.content, _meta: { source: revised.source, summary: revised.summary, version, qa } } as unknown as Record<string, unknown>,
      impressumJson: impressum,
      privacyText: ctx.data.privacyText,
      previewHtmlKey: previewKey(siteId, version),
      version,
      status: 'preview',
      statusReason: null,
      updatedAt: new Date(),
    })
    .where(eq(sites.id, siteId));
  if (cr) {
    const needsAdmin = revised.notPossible.length > 0;
    await db
      .update(changeRequests)
      .set({ status: 'applied', appliedAt: new Date(), resultNote: [revised.summary, ...(needsAdmin ? [`Nicht automatisch umsetzbar: ${revised.notPossible.join('; ')}`] : [])].join(' ') })
      .where(eq(changeRequests.id, cr.id));
    if (needsAdmin) {
      await notifyAdmin({ key: `change-partial:${cr.id}`, title: 'Teil eines Änderungswunsches nicht automatisch umsetzbar', lines: [`Kunde: ${ctx.customer.company}`, ...revised.notPossible], link: appUrl(`/admin/customers/${ctx.customer.id}`) });
    }
  }
  await audit(db, { entity: 'site', entityId: siteId, action: 'preview_built', actor: 'job:build-site', context: { version, source: revised.source, changeRequestId: cr?.id } });

  const roundsLeft = Math.max(0, ctx.cfg.onboarding.includedChangeRounds - ctx.customer.changeRoundsUsed);
  const summary = cr ? [revised.summary, revised.notPossible.length ? `Folgendes geht nicht über eine Textänderung, wir melden uns dazu: ${revised.notPossible.join('; ')}` : ''].filter(Boolean).join(' ') : null;
  const mail = previewReadyEmail(ctx.cfg, { name: ctx.customer.contactName, previewUrl: appUrl(`/preview/${ctx.customer.accessToken}`), summary, roundsLeft, firstVersion: !cr });
  await sendTransactionalEmail({ ...mail, kind: 'preview_ready', idempotencyKey: `preview:${siteId}:${version}`, to: ctx.customer.email, customerId: ctx.customer.id, leadId: ctx.customer.leadId });
  return { version, source: revised.source };
}

// ---------------------------------------------------------------------------
// Veröffentlichen: Domain registrieren, Dateien hochladen, Live-Check
// ---------------------------------------------------------------------------
export type DeployResult = 'deployed' | 'awaiting_domain_approval' | 'skipped' | 'domain_unavailable';

export async function deploySite(siteId: string, actor = 'job:deploy-site'): Promise<DeployResult> {
  const db = getDb();
  const ctx = await loadCtx(siteId);
  if (!['approved', 'deploying', 'live'].includes(ctx.site.status)) return 'skipped';
  const { hosting, registrar } = getProviders();
  const sw = effectiveSwitches(ctx.cfg);
  const domain = ctx.customer.domain;

  // 1) Domain (Kauf nur mit Freigabe; DRY_RUN registriert nie echt)
  const simulated = registrar.name === 'mock';
  let registerNow = false;
  if (domain && ctx.customer.domainStatus !== 'registered') {
    if (!simulated && sw.dryRun) {
      await db.update(sites).set({ statusReason: 'DRY_RUN: Domain wird nicht registriert', updatedAt: new Date() }).where(eq(sites.id, siteId));
    } else if (!simulated && !sw.autoRegisterDomains && !ctx.customer.domainApprovedAt) {
      await db.update(sites).set({ status: 'deploying', statusReason: 'Domainkauf wartet auf Freigabe', updatedAt: new Date() }).where(eq(sites.id, siteId));
      await raiseAlert(db, { level: 'warn', code: `domain_approval_${ctx.customer.id}`, message: `Domain ${domain} wartet auf Freigabe (${ctx.customer.company})`, context: { customerId: ctx.customer.id } });
      await notifyAdmin({ key: `domain-approval:${ctx.customer.id}`, title: `Domainkauf freigeben: ${domain}`, lines: [`Kunde: ${ctx.customer.company}`, 'Die Vorschau ist freigegeben. Bitte den Domainkauf im Dashboard bestätigen.'], link: appUrl(`/admin/customers/${ctx.customer.id}`) });
      return 'awaiting_domain_approval';
    } else {
      registerNow = true;
    }
  }
  if (registerNow) await assertNotHalted(ctx.cfg);

  await db.update(sites).set({ status: 'deploying', statusReason: null, updatedAt: new Date() }).where(eq(sites.id, siteId));

  // 2) Dateien hochladen
  const project = ctx.site.hostingProjectId && ctx.site.hostingProvider === hosting.name
    ? { projectId: ctx.site.hostingProjectId }
    : await hosting.ensureProject(`wbm-${ctx.site.formKey.slice(0, 12).toLowerCase()}`);
  const assets = await prepareAssets(ctx);
  const content = currentContent(ctx.site);
  const files = buildLiveFiles(ctx, content, assets, ctx.site.version);
  const dep = await hosting.deploy(project.projectId, files);
  const liveKey = `sites/${siteId}/live-v${ctx.site.version}.html`;
  await getProviders().storage.put(liveKey, files[0]!.content, 'text/html; charset=utf-8');
  await db
    .update(sites)
    .set({ hostingProvider: hosting.name, hostingProjectId: project.projectId, hostingUrl: dep.url || null, liveHtmlKey: liveKey, lastDeployedAt: new Date(), updatedAt: new Date() })
    .where(eq(sites.id, siteId));

  // 3) Domain an das Hosting binden und registrieren (auf den Kunden)
  if (registerNow && domain) {
    const avail = await registrar.checkAvailability([domain]);
    if (!avail[0]?.available) {
      const own = await registrar.getDomainStatus(domain).catch(() => ({ status: 'unknown' }));
      if (own.status === 'unknown') {
        await db.update(customers).set({ domainStatus: 'failed', updatedAt: new Date() }).where(eq(customers.id, ctx.customer.id));
        await db.update(sites).set({ statusReason: `Domain ${domain} nicht mehr verfügbar`, updatedAt: new Date() }).where(eq(sites.id, siteId));
        await raiseAlert(db, { level: 'error', code: `domain_taken_${ctx.customer.id}`, message: `Domain ${domain} ist nicht mehr frei – bitte mit dem Kunden eine Alternative abstimmen`, context: { customerId: ctx.customer.id } });
        await notifyAdmin({ key: `domain-taken:${ctx.customer.id}`, title: `Domain ${domain} nicht mehr frei`, lines: [`Kunde: ${ctx.customer.company}`], link: appUrl(`/admin/customers/${ctx.customer.id}`) });
        return 'domain_unavailable';
      }
    }
    const plan = await hosting.attachDomain(project.projectId, domain);
    const imp = ctx.data.impressum;
    await db.update(customers).set({ domainStatus: 'registering', updatedAt: new Date() }).where(eq(customers.id, ctx.customer.id));
    const reg = await registrar.registerDomain({
      domain,
      owner: { company: imp.company, name: imp.owner, street: imp.street, postalCode: imp.postalCode, city: imp.city, country: 'DE', email: imp.email, phone: imp.phone },
      nameservers: plan.nameservers,
      idempotencyKey: `domain-${ctx.customer.id}`,
    });
    if (plan.records?.length) await registrar.setDnsRecords(domain, plan.records);
    await recordCost(db, {
      category: 'domain',
      amountCents: reg.costCents ?? ctx.cfg.costs.domainPerYearCents,
      estimated: reg.costCents === undefined,
      ref: domain,
      leadId: ctx.customer.leadId,
      idempotencyKey: `domain:${ctx.customer.id}:${domain}`,
      meta: { registrar: registrar.name },
    });
    await db
      .update(customers)
      .set({
        domainStatus: reg.status === 'failed' ? 'failed' : 'registered',
        registrarDomainId: reg.registrarDomainId,
        registrarHandle: reg.ownerHandle,
        domainRegisteredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, ctx.customer.id));
    await audit(db, { entity: 'customer', entityId: ctx.customer.id, action: 'domain_registered', actor, context: { domain, registrar: registrar.name, status: reg.status } });
  }
  await audit(db, { entity: 'site', entityId: siteId, action: 'deployed', actor, context: { provider: hosting.name, deploymentId: dep.deploymentId, version: ctx.site.version } });
  await enqueue(QUEUES.liveCheck, { siteId, attempt: 0 }, { singletonKey: `live-${siteId}-${ctx.site.version}` });
  return 'deployed';
}

/** Wartezeit bis zum nächsten Live-Check: 2, 4, 8, 16, 32, dann 60 Minuten (insgesamt ca. 48 h). */
export function liveCheckDelayMinutes(attempt: number): number {
  return Math.min(60, 2 * 2 ** attempt);
}
export const LIVE_CHECK_MAX_ATTEMPTS = 50;

export interface LiveCheckResult {
  ok: boolean;
  url: string;
  checks: Record<string, boolean | string>;
}

async function probe(url: string, expectedMarker: string): Promise<LiveCheckResult> {
  const checks: Record<string, boolean | string> = {};
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20_000), headers: { 'user-agent': 'WebsiteBriefMaschine-LiveCheck/1.0' } });
    const html = await res.text();
    checks.status = res.status === 200;
    checks.marker = html.includes(`content="${expectedMarker}"`);
    checks.indexable = !/<meta name="robots" content="noindex/i.test(html) && !/noindex/i.test(res.headers.get('x-robots-tag') ?? '');
    checks.noBanner = !html.includes('Hinweis zum Entwurf') && !html.includes('aria-label="Vorschau"');
    const imp = await fetch(new URL('impressum.html', url), { signal: AbortSignal.timeout(20_000) });
    checks.impressum = imp.status === 200;
    const priv = await fetch(new URL('datenschutz.html', url), { signal: AbortSignal.timeout(20_000) });
    checks.datenschutz = priv.status === 200;
  } catch (err) {
    checks.error = err instanceof Error ? err.message.slice(0, 200) : String(err);
  }
  const ok = ['status', 'marker', 'indexable', 'noBanner', 'impressum', 'datenschutz'].every((k) => checks[k] === true);
  return { ok, url, checks };
}

/** Live-Check der veröffentlichten Seite; bei Erfolg: live, Hosting-Zeitraum, Übergabe-Mail. */
export async function liveCheck(siteId: string, attempt = 0): Promise<LiveCheckResult | { skipped: string }> {
  const db = getDb();
  const ctx = await loadCtx(siteId);
  if (ctx.site.status !== 'deploying' && ctx.site.status !== 'live') return { skipped: `Status ${ctx.site.status}` };
  const { hosting } = getProviders();
  const domain = ctx.customer.domain;
  const useDomain = Boolean(domain && ctx.customer.domainStatus === 'registered' && hosting.name !== 'mock');
  let url: string;
  if (useDomain) {
    const st = await hosting.getDomainStatus(ctx.site.hostingProjectId!, domain!).catch((err) => ({ active: false, details: errInfo(err).message }));
    url = `https://${domain}/`;
    if (!st.active) return scheduleNext(ctx, attempt, { ok: false, url, checks: { hosting: (st as { details?: string }).details ?? 'nicht aktiv' } });
  } else {
    url = ctx.site.hostingUrl ?? '';
    if (!url) return scheduleNext(ctx, attempt, { ok: false, url: '', checks: { error: 'keine Standard-URL beim Hosting' } });
  }
  const result = await probe(url, marker(ctx.site, ctx.site.version));
  await db.update(sites).set({ liveCheckJson: { ...result, attempt, at: new Date().toISOString() }, updatedAt: new Date() }).where(eq(sites.id, siteId));
  if (!result.ok) return scheduleNext(ctx, attempt, result);

  if (ctx.site.status === 'live') return result; // Re-Deploy einer bereits live geschalteten Seite
  const now = new Date();
  const hostingUntil = ctx.customer.hostingUntil ?? addMonths(now, ctx.cfg.pricing.hostingMonthsIncluded);
  let domainExpires: Date | undefined;
  if (useDomain) domainExpires = (await getProviders().registrar.getDomainStatus(domain!).catch(() => ({ expiresAt: undefined }))).expiresAt;
  await db.transaction(async (tx) => {
    await tx.update(sites).set({ status: 'live', liveAt: now, productionUrl: url, statusReason: null, updatedAt: now }).where(eq(sites.id, siteId));
    await tx
      .update(customers)
      .set({ hostingUntil, ...(domainExpires ? { domainExpiresAt: domainExpires } : {}), updatedAt: now })
      .where(eq(customers.id, ctx.customer.id));
    if (ctx.customer.leadId) {
      await tx.insert(events).values({ leadId: ctx.customer.leadId, type: 'live', metaJson: { siteId, url } });
      await transitionLead(tx, ctx.customer.leadId, 'live', { actor: 'job:live-check', soft: true });
    }
    await audit(tx, { entity: 'site', entityId: siteId, action: 'live', actor: 'job:live-check', context: { url, simulated: !useDomain } });
  });
  const mail = liveHandoverEmail(ctx.cfg, { name: ctx.customer.contactName, url, domain: useDomain ? domain : null, hostingUntil: formatDateLongDe(hostingUntil), formTarget: ctx.site.formTargetEmail ?? ctx.customer.email });
  await sendTransactionalEmail({ ...mail, kind: 'live_handover', idempotencyKey: `live:${siteId}`, to: ctx.customer.email, customerId: ctx.customer.id, leadId: ctx.customer.leadId });
  await notifyAdmin({ key: `live:${siteId}`, title: `Website live: ${ctx.customer.company}`, lines: [url], link: appUrl(`/admin/customers/${ctx.customer.id}`) });
  return result;
}

async function scheduleNext(ctx: Ctx, attempt: number, result: LiveCheckResult): Promise<LiveCheckResult> {
  const db = getDb();
  await db.update(sites).set({ liveCheckJson: { ...result, attempt, at: new Date().toISOString() } }).where(eq(sites.id, ctx.site.id));
  if (attempt + 1 >= LIVE_CHECK_MAX_ATTEMPTS) {
    await db.update(sites).set({ status: 'failed', statusReason: 'Live-Check nach 48 h nicht erfolgreich', updatedAt: new Date() }).where(eq(sites.id, ctx.site.id));
    await raiseAlert(db, { level: 'error', code: `live_check_${ctx.site.id}`, message: `Live-Check für ${ctx.customer.domain ?? ctx.site.id} gescheitert`, context: { siteId: ctx.site.id, checks: result.checks } });
    return result;
  }
  await enqueue(QUEUES.liveCheck, { siteId: ctx.site.id, attempt: attempt + 1 }, { startAfter: liveCheckDelayMinutes(attempt) * 60, singletonKey: `live-${ctx.site.id}-${ctx.site.version}-${attempt + 1}` });
  return result;
}
