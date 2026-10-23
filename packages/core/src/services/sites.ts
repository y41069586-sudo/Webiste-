import { and, asc, eq } from 'drizzle-orm';
import type { SiteContent } from '@wbm/templates/types';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { changeRequests, customers, demos, events, leads, orders, sites } from '../db/schema';
import { renderEmail } from '../emails/templates';
import { formatPhoneDe } from '../leads/normalize';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import { enqueue, QUEUES } from '../queue';
import {
  normalizeOnboarding,
  onboardingErrors,
  openingHoursToDays,
  WEEK_DAYS,
  type OnboardingData,
} from '../sites/onboarding-data';
import { randomToken, sha256 } from '../util/crypto';
import { audit } from './audit';
import { checkDomain } from './domains';
import { notifyAdmin, sendTransactionalEmail } from './email';
import { transitionLead } from './lead-state';
import { rateLimit } from './rate-limit';
import type { RequestMeta } from './tracking';

export type Site = typeof sites.$inferSelect;
type Customer = typeof customers.$inferSelect;

const TOKEN_RE = /^[A-Za-z0-9]{32}$/;

function storedSiteContent(json: Record<string, unknown> | null | undefined): SiteContent | null {
  if (!json) return null;
  const { _meta, ...rest } = json as Record<string, unknown> & { _meta?: unknown };
  void _meta;
  return rest as unknown as SiteContent;
}

export async function customerByToken(token: string): Promise<Customer | null> {
  if (!TOKEN_RE.test(token)) return null;
  return (await getDb().query.customers.findFirst({ where: eq(customers.accessToken, token) })) ?? null;
}

/** Startwerte des Formulars aus Lead, Bestellung und Demo-Texten (nichts erfunden). */
export function onboardingDefaults(input: {
  customer: Customer;
  order: typeof orders.$inferSelect;
  lead: typeof leads.$inferSelect | null;
  content: SiteContent | null;
}): OnboardingData {
  const { customer, order, lead, content } = input;
  const a = order.billingAddressJson;
  const phone = formatPhoneDe(lead?.phone ?? customer.phone ?? '') ?? customer.phone ?? '';
  return {
    business: {
      name: lead && !lead.anonymizedAt ? lead.businessName : customer.company,
      phone,
      email: '',
      street: lead?.street ?? a.street.replace(/\s+\S+$/, ''),
      houseNumber: lead?.houseNumber ?? (/\s(\S+)$/.exec(a.street)?.[1] ?? ''),
      postalCode: lead?.postalCode ?? a.postalCode,
      city: lead?.city ?? a.city,
    },
    texts: {
      headline: content?.hero_headline ?? '',
      subline: content?.hero_subline ?? '',
      about: content?.about ?? '',
      services: (content?.services ?? []).map((s) => ({ title: s.title, text: s.text })),
      wishes: '',
    },
    hours: { mode: lead?.openingHours?.days?.length ? 'fixed' : 'appointment', days: openingHoursToDays(lead?.openingHours) },
    impressum: {
      company: customer.company,
      legalForm: '',
      owner: customer.contactName,
      street: a.street,
      postalCode: a.postalCode,
      city: a.city,
      phone: customer.phone ?? phone,
      email: customer.email,
      register: '',
      registerNumber: '',
      vatId: '',
      chamber: '',
      professionalTitle: '',
      supervisoryAuthority: '',
    },
    privacyText: '',
    formTargetEmail: customer.email,
    domain: customer.domain ?? order.domainWish ?? '',
    photoAlts: {},
    confirmed: false,
  };
}

/** Kundenseite aus der gekauften Demo anlegen (idempotent). */
export async function ensureSiteForCustomer(customerId: string, db: DbOrTx = getDb()): Promise<Site> {
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!customer) throw new Error('Kunde nicht gefunden');
  const existing = await db.query.sites.findFirst({ where: eq(sites.customerId, customerId) });
  if (existing) return existing;
  const order = (await db.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }))!;
  const demo = order.demoId ? await db.query.demos.findFirst({ where: eq(demos.id, order.demoId) }) : undefined;
  const lead = customer.leadId ? ((await db.query.leads.findFirst({ where: eq(leads.id, customer.leadId) })) ?? null) : null;
  const content = storedSiteContent(demo?.contentJson);
  const [site] = await db
    .insert(sites)
    .values({
      customerId,
      templateId: demo?.templateId ?? 'handwerk-klar',
      palette: demo?.palette ?? 'werkblau',
      contentJson: (content ?? {}) as unknown as Record<string, unknown>,
      formKey: randomToken(24),
      formTargetEmail: customer.email,
      onboardingJson: onboardingDefaults({ customer, order, lead, content }) as unknown as Record<string, unknown>,
      status: 'onboarding',
    })
    .onConflictDoNothing({ target: sites.customerId })
    .returning();
  const s = site ?? (await db.query.sites.findFirst({ where: eq(sites.customerId, customerId) }))!;
  await db.update(customers).set({ siteId: s.id, updatedAt: new Date() }).where(eq(customers.id, customerId));
  return s;
}

export interface UploadInfo {
  id: string;
  key: string;
  kind: 'logo' | 'photo';
}

export function siteUploads(site: Site): { logo: UploadInfo | null; photos: UploadInfo[] } {
  const entries = Object.entries(site.assetKeys ?? {});
  const logo = entries.find(([k]) => k === 'logo');
  return {
    logo: logo ? { id: 'logo', key: logo[1], kind: 'logo' } : null,
    photos: entries.filter(([k]) => k.startsWith('photo:')).map(([k, v]) => ({ id: k.slice(6), key: v, kind: 'photo' as const })),
  };
}

export type OnboardingContext =
  | { state: 'not_found' }
  | {
      state: 'form' | 'submitted';
      customer: Customer;
      site: Site;
      data: OnboardingData;
      uploads: ReturnType<typeof siteUploads>;
      businessName: string;
    };

export async function getOnboardingContext(token: string): Promise<OnboardingContext> {
  const customer = await customerByToken(token);
  if (!customer) return { state: 'not_found' };
  const site = await ensureSiteForCustomer(customer.id);
  const order = (await getDb().query.orders.findFirst({ where: eq(orders.id, customer.orderId) }))!;
  if (!['paid'].includes(order.status)) return { state: 'not_found' };
  const base = onboardingDefaults({ customer, order, lead: null, content: storedSiteContent(site.contentJson) });
  const data = normalizeOnboarding((site.onboardingJson ?? {}) as Partial<Record<keyof OnboardingData, unknown>>, base);
  return {
    state: site.status === 'onboarding' ? 'form' : 'submitted',
    customer,
    site,
    data,
    uploads: siteUploads(site),
    businessName: data.business.name || customer.company,
  };
}

export type SaveOnboardingResult = { ok: true; submitted: boolean } | { ok: false; error: string; fieldErrors?: Record<string, string>; alternatives?: string[] };

/** Zwischenspeichern oder Absenden des Onboarding-Formulars. */
export async function saveOnboarding(token: string, raw: Partial<Record<keyof OnboardingData, unknown>>, opts: { submit: boolean }): Promise<SaveOnboardingResult> {
  const ctx = await getOnboardingContext(token);
  if (ctx.state === 'not_found') return { ok: false, error: 'Link ungültig.' };
  if (ctx.state === 'submitted') return { ok: false, error: 'Ihre Angaben wurden bereits abgeschickt. Änderungen bitte über die Vorschau.' };
  const db = getDb();
  const data = normalizeOnboarding(raw, ctx.data);
  await db.update(sites).set({ onboardingJson: data as unknown as Record<string, unknown>, updatedAt: new Date() }).where(eq(sites.id, ctx.site.id));
  if (!opts.submit) return { ok: true, submitted: false };

  const errors = onboardingErrors(data);
  if (errors) return { ok: false, error: 'Bitte prüfen Sie die markierten Angaben.', fieldErrors: errors };

  // Domain: nur prüfen, wenn sie geändert wurde und noch nicht registriert ist
  let domain = ctx.customer.domain ?? '';
  if (data.domain.trim().toLowerCase() !== domain) {
    if (ctx.customer.domainStatus === 'registered') return { ok: false, error: 'Die Domain ist bereits registriert und kann nicht mehr geändert werden.', fieldErrors: { domain: 'Bereits registriert.' } };
    const lead = ctx.customer.leadId ? await db.query.leads.findFirst({ where: eq(leads.id, ctx.customer.leadId) }) : undefined;
    const check = await checkDomain(data.domain, lead ? { businessName: lead.businessName, city: lead.city, branch: lead.branch } : undefined);
    if (!check.available || !check.domain) return { ok: false, error: check.message, fieldErrors: { domain: check.message }, alternatives: check.alternatives };
    domain = check.domain;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(sites)
      .set({
        onboardingJson: { ...data, domain } as unknown as Record<string, unknown>,
        onboardingSubmittedAt: new Date(),
        formTargetEmail: data.formTargetEmail,
        status: 'generating',
        updatedAt: new Date(),
      })
      .where(eq(sites.id, ctx.site.id));
    await tx.update(customers).set({ domain, updatedAt: new Date() }).where(eq(customers.id, ctx.customer.id));
    if (ctx.customer.leadId) {
      await tx.insert(events).values({ leadId: ctx.customer.leadId, type: 'onboarding_submitted', metaJson: { siteId: ctx.site.id } });
      await transitionLead(tx, ctx.customer.leadId, 'onboarding', { actor: 'public:onboarding', soft: true });
    }
    await audit(tx, { entity: 'site', entityId: ctx.site.id, action: 'onboarding_submitted', actor: 'public:onboarding' });
  });
  await enqueue(QUEUES.buildSite, { siteId: ctx.site.id }, { singletonKey: `build-${ctx.site.id}` });
  return { ok: true, submitted: true };
}

// ---------------------------------------------------------------------------
// Uploads (Logo, Fotos)
// ---------------------------------------------------------------------------
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS = 6;

/** Bildtyp anhand der Magic Bytes (nur PNG, JPEG, WebP – kein SVG wegen eingebettetem Skript). */
export function imageType(buf: Buffer): 'png' | 'jpg' | 'webp' | null {
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return null;
}

export type UploadResult = { ok: true; id: string } | { ok: false; error: string };

export async function saveUpload(token: string, kind: 'logo' | 'photo', data: Buffer): Promise<UploadResult> {
  const ctx = await getOnboardingContext(token);
  if (ctx.state !== 'form') return { ok: false, error: 'Uploads sind nur vor dem Absenden möglich.' };
  if (data.length === 0) return { ok: false, error: 'Leere Datei.' };
  if (data.length > MAX_UPLOAD_BYTES) return { ok: false, error: 'Die Datei ist größer als 8 MB.' };
  const type = imageType(data);
  if (!type) return { ok: false, error: 'Bitte nur Bilder im Format JPG, PNG oder WebP hochladen.' };
  const db = getDb();
  const rl = await rateLimit(db, `upload:${ctx.customer.id}`, 60, 3600);
  if (!rl.allowed) return { ok: false, error: 'Zu viele Uploads. Bitte später erneut versuchen.' };
  const keys = { ...(ctx.site.assetKeys ?? {}) };
  const storage = getProviders().storage;
  const id = kind === 'logo' ? 'logo' : randomToken(10);
  if (kind === 'photo' && siteUploads(ctx.site).photos.length >= MAX_PHOTOS) return { ok: false, error: `Höchstens ${MAX_PHOTOS} Fotos.` };
  if (kind === 'logo' && keys.logo) await storage.delete(keys.logo);
  const key = `uploads/${ctx.customer.id}/${kind === 'logo' ? 'logo' : `foto-${id}`}-${sha256(data.toString('base64')).slice(0, 8)}.${type}`;
  await storage.put(key, data, type === 'jpg' ? 'image/jpeg' : `image/${type}`);
  keys[kind === 'logo' ? 'logo' : `photo:${id}`] = key;
  await db.update(sites).set({ assetKeys: keys, updatedAt: new Date() }).where(eq(sites.id, ctx.site.id));
  return { ok: true, id };
}

export async function deleteUpload(token: string, id: string): Promise<boolean> {
  const ctx = await getOnboardingContext(token);
  if (ctx.state !== 'form') return false;
  const keys = { ...(ctx.site.assetKeys ?? {}) };
  const k = id === 'logo' ? 'logo' : `photo:${id}`;
  if (!keys[k]) return false;
  await getProviders().storage.delete(keys[k]);
  delete keys[k];
  await getDb().update(sites).set({ assetKeys: keys, updatedAt: new Date() }).where(eq(sites.id, ctx.site.id));
  return true;
}

/** Hochgeladenes Bild des Kunden (für Vorschaubilder im Formular). */
export async function readUpload(token: string, id: string): Promise<{ data: Buffer; type: string } | null> {
  const customer = await customerByToken(token);
  if (!customer?.siteId) return null;
  const site = await getDb().query.sites.findFirst({ where: eq(sites.id, customer.siteId) });
  const key = site?.assetKeys?.[id === 'logo' ? 'logo' : `photo:${id}`];
  if (!key) return null;
  const data = await getProviders().storage.get(key);
  if (!data) return null;
  const t = imageType(data);
  return { data, type: t === 'jpg' ? 'image/jpeg' : `image/${t ?? 'png'}` };
}

// ---------------------------------------------------------------------------
// Vorschau, Freigabe, Änderungsrunden
// ---------------------------------------------------------------------------
export type PreviewContext =
  | { state: 'not_found' }
  | {
      state: 'onboarding' | 'generating' | 'preview' | 'approved' | 'live' | 'other';
      customer: Customer;
      site: Site;
      roundsIncluded: number;
      roundsLeft: number;
      openRequest: typeof changeRequests.$inferSelect | null;
      lastSummary: string | null;
      history: (typeof changeRequests.$inferSelect)[];
    };

export async function getPreviewContext(token: string): Promise<PreviewContext> {
  const customer = await customerByToken(token);
  if (!customer?.siteId) return { state: 'not_found' };
  const db = getDb();
  const site = await db.query.sites.findFirst({ where: eq(sites.id, customer.siteId) });
  if (!site) return { state: 'not_found' };
  const cfg = await getConfig();
  const history = await db.select().from(changeRequests).where(eq(changeRequests.siteId, site.id)).orderBy(asc(changeRequests.createdAt));
  const map: Record<string, PreviewContext extends { state: infer S } ? S : never> = {
    onboarding: 'onboarding',
    generating: 'generating',
    changes_requested: 'generating',
    preview: 'preview',
    approved: 'approved',
    deploying: 'approved',
    live: 'live',
  };
  return {
    state: (map[site.status] ?? 'other') as 'preview',
    customer,
    site,
    roundsIncluded: cfg.onboarding.includedChangeRounds,
    roundsLeft: Math.max(0, cfg.onboarding.includedChangeRounds - customer.changeRoundsUsed),
    openRequest: history.find((h) => h.status === 'open' || h.status === 'needs_admin') ?? null,
    lastSummary: [...history].reverse().find((h) => h.status === 'applied')?.resultNote ?? null,
    history,
  };
}

export async function approvePreview(token: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getPreviewContext(token);
  if (ctx.state !== 'preview') return { ok: false, error: 'Die Vorschau kann gerade nicht freigegeben werden.' };
  const db = getDb();
  const res = await db
    .update(sites)
    .set({ status: 'approved', previewApprovedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(sites.id, ctx.site.id), eq(sites.status, 'preview')))
    .returning({ id: sites.id });
  if (!res.length) return { ok: false, error: 'Bereits freigegeben.' };
  if (ctx.customer.leadId) {
    await db.insert(events).values({ leadId: ctx.customer.leadId, type: 'preview_approved', metaJson: { siteId: ctx.site.id, version: ctx.site.version } });
    await transitionLead(db, ctx.customer.leadId, 'preview_approved', { actor: 'public:preview', soft: true });
  }
  await audit(db, { entity: 'site', entityId: ctx.site.id, action: 'preview_approved', actor: 'public:preview', context: { version: ctx.site.version } });
  await enqueue(QUEUES.deploySite, { siteId: ctx.site.id }, { singletonKey: `deploy-${ctx.site.id}` });
  return { ok: true };
}

export type ChangeResult = { ok: true; mode: 'round' | 'admin' } | { ok: false; error: string };

/** Änderungswunsch zur Vorschau. Innerhalb der inklusiven Runden automatisch, danach an den Betreiber. */
export async function requestChanges(token: string, text: string): Promise<ChangeResult> {
  const t = text.trim();
  if (t.length < 5) return { ok: false, error: 'Bitte beschreiben Sie kurz, was geändert werden soll.' };
  if (t.length > 4000) return { ok: false, error: 'Bitte fassen Sie sich etwas kürzer (max. 4000 Zeichen).' };
  const ctx = await getPreviewContext(token);
  if (ctx.state !== 'preview') return { ok: false, error: 'Änderungen sind gerade nicht möglich.' };
  if (ctx.openRequest) return { ok: false, error: 'Ihr letzter Änderungswunsch wird noch bearbeitet.' };
  const db = getDb();
  const withinRounds = ctx.roundsLeft > 0;
  const [cr] = await db
    .insert(changeRequests)
    .values({ siteId: ctx.site.id, source: 'preview', text: t, status: withinRounds ? 'open' : 'needs_admin', countsAsRound: withinRounds })
    .returning();
  await audit(db, { entity: 'site', entityId: ctx.site.id, action: 'change_requested', actor: 'public:preview', context: { changeRequestId: cr!.id, withinRounds } });
  if (withinRounds) {
    await db.update(customers).set({ changeRoundsUsed: ctx.customer.changeRoundsUsed + 1, updatedAt: new Date() }).where(eq(customers.id, ctx.customer.id));
    await db.update(sites).set({ status: 'changes_requested', updatedAt: new Date() }).where(eq(sites.id, ctx.site.id));
    await enqueue(QUEUES.buildSite, { siteId: ctx.site.id, changeRequestId: cr!.id }, { singletonKey: `build-${ctx.site.id}-${cr!.id}` });
    return { ok: true, mode: 'round' };
  }
  await notifyAdmin({
    key: `change-admin:${cr!.id}`,
    title: 'Änderungswunsch außerhalb der inklusiven Runden',
    lines: [`Kunde: ${ctx.customer.company}`, `Wunsch: ${t.slice(0, 500)}`],
    link: appUrl(`/admin/customers/${ctx.customer.id}`),
  });
  return { ok: true, mode: 'admin' };
}

// ---------------------------------------------------------------------------
// Kontaktformular der Kundenseiten (wir leiten nur weiter, speichern keine Inhalte)
// ---------------------------------------------------------------------------
export interface SiteFormInput {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  honeypot: string;
}

export type SiteFormResult = { ok: true; redirect: string } | { ok: false; reason: 'not_found' | 'invalid' | 'rate_limited'; back: string | null };

const MAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function handleSiteForm(formKey: string, input: SiteFormInput, meta: RequestMeta): Promise<SiteFormResult> {
  if (!/^[A-Za-z0-9]{24}$/.test(formKey)) return { ok: false, reason: 'not_found', back: null };
  const db = getDb();
  const site = await db.query.sites.findFirst({ where: eq(sites.formKey, formKey) });
  if (!site || !site.formTargetEmail || site.status === 'suspended') return { ok: false, reason: 'not_found', back: null };
  const base = site.productionUrl ?? null;
  const thanks = base ? new URL('danke.html', base).toString() : appUrl('/');
  // Honeypot / Link-Spam: gleiche Antwort wie Erfolg, aber nichts senden
  const links = (input.message.match(/https?:\/\//g) ?? []).length;
  if (input.honeypot.trim() || links > 2) return { ok: true, redirect: thanks };
  if (!input.consent || input.name.trim().length < 2 || !MAIL_RE.test(input.email.trim()) || input.message.trim().length < 5 || input.message.length > 4000) {
    return { ok: false, reason: 'invalid', back: base };
  }
  const r1 = await rateLimit(db, `siteform:${site.id}:${meta.ipHash}`, 5, 3600);
  const r2 = await rateLimit(db, `siteform:${site.id}`, 100, 86400);
  if (!r1.allowed || !r2.allowed) return { ok: false, reason: 'rate_limited', back: base };
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, site.customerId) });
  const name = input.name.trim().slice(0, 120);
  const text = [
    `Neue Nachricht über das Kontaktformular Ihrer Website${customer?.domain ? ` ${customer.domain}` : ''}:`,
    '',
    `Name: ${name}`,
    `E-Mail: ${input.email.trim()}`,
    ...(input.phone.trim() ? [`Telefon: ${input.phone.trim().slice(0, 40)}`] : []),
    '',
    input.message.trim(),
    '',
    '—',
    'Antworten Sie direkt auf diese E-Mail, um der Person zu antworten. Die Nachricht wird von uns nicht gespeichert.',
  ].join('\n');
  try {
    await sendTransactionalEmail({
      kind: 'site_form',
      idempotencyKey: `siteform:${site.id}:${sha256(`${input.email}|${input.message}`).slice(0, 24)}`,
      to: site.formTargetEmail,
      replyTo: input.email.trim(),
      subject: `Kontaktanfrage von ${name}`,
      text,
      html: '',
      customerId: site.customerId,
    });
  } catch (err) {
    logger.error({ siteId: site.id, ...errInfo(err) }, 'Kontaktformular: Weiterleitung fehlgeschlagen');
    throw err;
  }
  return { ok: true, redirect: thanks };
}

/** Kunden, die das Onboarding nach einigen Tagen nicht abgeschickt haben, einmal erinnern. */
export async function sendOnboardingReminders(now = new Date()): Promise<number> {
  const db = getDb();
  const cfg = await getConfig();
  const rows = await db
    .select({ c: customers, s: sites })
    .from(customers)
    .innerJoin(sites, eq(sites.customerId, customers.id))
    .where(eq(sites.status, 'onboarding'));
  let sent = 0;
  for (const { c } of rows) {
    if (c.onboardingRemindedAt || now.getTime() - c.createdAt.getTime() < 4 * 86400_000) continue;
    const mail = renderEmail(cfg, {
      subject: 'Erinnerung: Ihre Angaben für die Website',
      name: c.contactName,
      blocks: [
        'Ihre Website ist fast fertig – es fehlen nur noch Ihre Angaben (Impressum, Leistungen, Öffnungszeiten). Das dauert etwa 10 Minuten, Sie können jederzeit zwischenspeichern.',
        { button: { href: appUrl(`/onboarding/${c.accessToken}`), label: 'Angaben eintragen' } },
        'Brauchen Sie Hilfe? Antworten Sie einfach auf diese E-Mail.',
      ],
    });
    await sendTransactionalEmail({ ...mail, kind: 'onboarding_reminder', idempotencyKey: `onboarding-reminder:${c.id}`, to: c.email, customerId: c.id });
    await db.update(customers).set({ onboardingRemindedAt: now }).where(eq(customers.id, c.id));
    sent++;
  }
  return sent;
}

export { WEEK_DAYS };

// ---------------------------------------------------------------------------
// Admin-Aktionen
// ---------------------------------------------------------------------------
/** Domainkauf freigeben und Veröffentlichung (erneut) anstoßen. */
export async function approveDomainPurchase(customerId: string, actor: string): Promise<void> {
  const db = getDb();
  const c = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!c?.siteId || !c.domain) throw new Error('Kunde ohne Seite oder Domain');
  await db.update(customers).set({ domainApprovedAt: new Date(), domainApprovedBy: actor, updatedAt: new Date() }).where(eq(customers.id, customerId));
  await audit(db, { entity: 'customer', entityId: customerId, action: 'domain_approved', actor, context: { domain: c.domain } });
  await enqueue(QUEUES.deploySite, { siteId: c.siteId }, { singletonKey: `deploy-${c.siteId}-approved` });
}

/** Vorschau neu erzeugen (z. B. nach manueller Korrektur der Angaben). */
export async function rebuildPreview(siteId: string, actor: string): Promise<void> {
  const db = getDb();
  await db.update(sites).set({ status: 'generating', updatedAt: new Date() }).where(eq(sites.id, siteId));
  await audit(db, { entity: 'site', entityId: siteId, action: 'rebuild_requested', actor });
  await enqueue(QUEUES.buildSite, { siteId }, { singletonKey: `build-${siteId}-${Date.now()}` });
}

export async function redeploySite(siteId: string, actor: string): Promise<void> {
  await audit(getDb(), { entity: 'site', entityId: siteId, action: 'redeploy_requested', actor });
  await enqueue(QUEUES.deploySite, { siteId }, { singletonKey: `deploy-${siteId}-${Date.now()}` });
}

/** Eigene Änderungsanweisung des Betreibers (zählt nicht als Kundenrunde). */
export async function adminChangeRequest(siteId: string, text: string, actor: string, resolvesId?: string): Promise<void> {
  const db = getDb();
  if (text.trim().length < 5) throw new Error('Bitte eine Anweisung eingeben.');
  if (resolvesId) await db.update(changeRequests).set({ status: 'applied', resultNote: 'Vom Betreiber übernommen', appliedAt: new Date() }).where(eq(changeRequests.id, resolvesId));
  const [cr] = await db.insert(changeRequests).values({ siteId, source: 'admin', text: text.trim(), status: 'open', countsAsRound: false }).returning();
  await db.update(sites).set({ status: 'changes_requested', updatedAt: new Date() }).where(eq(sites.id, siteId));
  await audit(db, { entity: 'site', entityId: siteId, action: 'admin_change', actor, context: { changeRequestId: cr!.id } });
  await enqueue(QUEUES.buildSite, { siteId, changeRequestId: cr!.id }, { singletonKey: `build-${siteId}-${cr!.id}` });
}

export async function resolveChangeRequest(id: string, actor: string, note: string): Promise<void> {
  const db = getDb();
  const [cr] = await db.update(changeRequests).set({ status: 'rejected', resultNote: note || 'Vom Betreiber erledigt', appliedAt: new Date() }).where(eq(changeRequests.id, id)).returning();
  if (cr) await audit(db, { entity: 'site', entityId: cr.siteId, action: 'change_resolved', actor, context: { changeRequestId: id } });
}

/** Seite sperren (z. B. nach Erstattung oder Hosting-Ende); Formular-Endpunkt nimmt nichts mehr an. */
export async function setSiteSuspended(siteId: string, suspended: boolean, actor: string): Promise<void> {
  const db = getDb();
  const site = await db.query.sites.findFirst({ where: eq(sites.id, siteId) });
  if (!site) throw new Error('Seite nicht gefunden');
  await db
    .update(sites)
    .set({ status: suspended ? 'suspended' : site.liveAt ? 'live' : 'preview', statusReason: suspended ? 'gesperrt durch Betreiber' : null, updatedAt: new Date() })
    .where(eq(sites.id, siteId));
  await audit(db, { entity: 'site', entityId: siteId, action: suspended ? 'suspended' : 'unsuspended', actor });
}
