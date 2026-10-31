import { eq, like, sql } from 'drizzle-orm';
import type { SiteContent } from '@wbm/templates/types';
import { getDb, type DbOrTx } from '../db/client';
import { orders, settings, sites } from '../db/schema';
import { getProviders } from '../providers';
import { normalizeOnboarding, onboardingErrors, type OnboardingData } from '../sites/onboarding-data';
import { randomToken, sha256 } from '../util/crypto';
import { getCheckoutContext, startCheckout, type CheckoutInput } from './orders';
import { imageType, MAX_PHOTOS, onboardingDefaults } from './sites';
import { rateLimit } from './rate-limit';
import { findPublicDemo, type RequestMeta } from './tracking';

export const SETUP_TTL_SECONDS = 7 * 86400;
export const SETUP_UPLOAD_BYTES = 4 * 1024 * 1024;
export const setupCookieName = (slug: string) => `sw_setup_${slug}`;
const draftKey = (token: string) => `checkout-draft:${sha256(token)}`;
export const setupSnapshotKey = (orderId: string) => `checkout-setup:${orderId}`;
export interface CheckoutPreparation {
  data: OnboardingData;
  assetKeys: Record<string, string>;
  fingerprint: string;
}
export interface SetupSnapshot extends CheckoutPreparation {
  leadId: string;
  demoId: string;
  expiresAt: string;
}
export interface CheckoutDraft {
  slug: string;
  leadId: string;
  demoId: string;
  expiresAt: string;
  data: OnboardingData;
  assetKeys: Record<string, string>;
  /** Includes replaced uploads, retained until no pending order or site references them. */
  uploadKeys: string[];
  orderId?: string;
}
export function setupFingerprint(data: OnboardingData, assetKeys: Record<string, string>): string {
  return sha256(JSON.stringify({ data, assetKeys }));
}

export async function getCheckoutDraft(slug: string, token: string, db: DbOrTx = getDb()): Promise<CheckoutDraft | null> {
  if (!/^[A-Za-z0-9]{48}$/.test(token)) return null;
  const row = await db.query.settings.findFirst({ where: eq(settings.key, draftKey(token)) });
  const d = row?.value as CheckoutDraft | undefined;
  if (!d || d.slug !== slug || new Date(d.expiresAt).getTime() <= Date.now()) return null;
  const found = await findPublicDemo(slug, new Date(), db);
  return found.state === 'ok' && found.demo.id === d.demoId && found.lead.id === d.leadId ? d : null;
}

export async function beginCheckoutDraft(slug: string, token: string, meta: RequestMeta): Promise<string | null> {
  if (meta.isBot) return null;
  const ctx = await getCheckoutContext(slug);
  if (ctx.state !== 'ok') return null;
  if (await getCheckoutDraft(slug, token)) return token;
  if (!(await rateLimit(getDb(), `setup-create:${meta.ipHash}`, 12, 3600)).allowed) return null;
  const fresh = randomToken(48);
  const data = onboardingDefaults({
    customer: { company: ctx.prefill.company, contactName: '', phone: ctx.lead.phone, email: '', domain: ctx.prefill.domain },
    order: {
      billingAddressJson: {
        street: ctx.prefill.street,
        postalCode: ctx.prefill.postalCode,
        city: ctx.prefill.city,
        country: 'DE',
      },
      domainWish: ctx.prefill.domain,
    },
    lead: ctx.lead,
    content: ctx.demo.contentJson as unknown as SiteContent,
  });
  const draft: CheckoutDraft = {
    slug,
    leadId: ctx.lead.id,
    demoId: ctx.demo.id,
    data,
    assetKeys: {},
    uploadKeys: [],
    expiresAt: new Date(Date.now() + SETUP_TTL_SECONDS * 1000).toISOString(),
  };
  await getDb()
    .insert(settings)
    .values({ key: draftKey(fresh), value: draft });
  return fresh;
}

async function lockedDraft<T>(slug: string, token: string, fn: (d: CheckoutDraft, db: DbOrTx) => Promise<T>): Promise<T | null> {
  if (!/^[A-Za-z0-9]{48}$/.test(token)) return null;
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`SELECT key FROM settings WHERE key = ${draftKey(token)} FOR UPDATE`);
    const d = await getCheckoutDraft(slug, token, tx);
    return d ? fn(d, tx) : null;
  });
}
export async function saveCheckoutDraft(slug: string, token: string, raw: OnboardingData, submit: boolean) {
  return lockedDraft(slug, token, async (d, db) => {
    if (!(await rateLimit(db, `setup-save:${sha256(token)}`, 120, 3600)).allowed)
      return { error: 'Zu viele Versuche. Bitte später erneut versuchen.' };
    const data = normalizeOnboarding(raw, d.data);
    await db
      .update(settings)
      .set({ value: { ...d, data, orderId: undefined }, updatedAt: new Date() })
      .where(eq(settings.key, draftKey(token)));
    const fieldErrors = submit ? onboardingErrors(data) : null;
    return fieldErrors
      ? { error: 'Bitte prüfen Sie die markierten Angaben.', fieldErrors, values: data }
      : { saved: true, values: data };
  });
}

export async function uploadCheckoutDraft(slug: string, token: string, kind: 'logo' | 'photo', bytes: Buffer) {
  if (!bytes.length || bytes.length > SETUP_UPLOAD_BYTES || !imageType(bytes))
    return { error: 'Bitte JPG, PNG oder WebP bis 4 MB wählen.' };
  return lockedDraft(slug, token, async (d, db) => {
    if (!(await rateLimit(db, `setup-upload:${sha256(token)}`, 30, 3600)).allowed)
      return { error: 'Zu viele Uploads. Bitte später erneut versuchen.' };
    if (kind === 'photo' && Object.keys(d.assetKeys).filter((k) => k.startsWith('photo:')).length >= MAX_PHOTOS)
      return { error: `Höchstens ${MAX_PHOTOS} Fotos.` };
    const id = kind === 'logo' ? 'logo' : `photo:${randomToken(10)}`;
    const type = imageType(bytes)!;
    const key = `checkout-uploads/${sha256(token)}/${randomToken(20)}.${type}`;
    await getProviders().storage.put(key, bytes, type === 'jpg' ? 'image/jpeg' : `image/${type}`);
    const assetKeys = { ...d.assetKeys, [id]: key };
    await db
      .update(settings)
      .set({ value: { ...d, assetKeys, uploadKeys: [...d.uploadKeys, key], orderId: undefined }, updatedAt: new Date() })
      .where(eq(settings.key, draftKey(token)));
    return { id, ids: Object.keys(assetKeys) };
  });
}
export async function removeCheckoutUpload(slug: string, token: string, id: string) {
  return lockedDraft(slug, token, async (d, db) => {
    const assetKeys = { ...d.assetKeys };
    delete assetKeys[id];
    await db
      .update(settings)
      .set({ value: { ...d, assetKeys, orderId: undefined }, updatedAt: new Date() })
      .where(eq(settings.key, draftKey(token)));
    return { ids: Object.keys(assetKeys) };
  });
}
export async function readCheckoutUpload(slug: string, token: string, id: string) {
  const d = await getCheckoutDraft(slug, token);
  const key = d && Object.hasOwn(d.assetKeys, id) ? d.assetKeys[id] : undefined;
  if (!key) return null;
  const data = await getProviders().storage.get(key);
  return data ? { data, type: imageType(data) === 'jpg' ? 'image/jpeg' : `image/${imageType(data) ?? 'png'}` } : null;
}

/** Only the final explicit action can create a payment session. Never accepts prices or order IDs from the browser. */
export async function checkoutPreparedDraft(
  slug: string,
  token: string,
  plan: string,
  consent: { terms: boolean; b2b: boolean; subscription: boolean },
  expectedFingerprint: string,
  meta: RequestMeta,
) {
  return lockedDraft(slug, token, async (d, db) => {
    await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`setup-checkout:${d.leadId}`}))`);
    const errors = onboardingErrors(d.data);
    if (errors) return { ok: false as const, error: 'Bitte vervollständigen Sie zuerst Ihre Angaben.' };
    const fingerprint = setupFingerprint(d.data, d.assetKeys);
    if (fingerprint !== expectedFingerprint)
      return { ok: false as const, error: 'Die Angaben wurden geändert. Bitte laden Sie die Zusammenfassung erneut.' };
    const i = d.data.impressum;
    const result = await startCheckout(
      slug,
      {
        company: i.company,
        contactName: i.owner,
        email: i.email,
        phone: i.phone,
        street: i.street,
        postalCode: i.postalCode,
        city: i.city,
        domain: d.data.domain,
        plan,
        ...consent,
      } as CheckoutInput,
      meta,
      { data: d.data, assetKeys: d.assetKeys, fingerprint },
    );
    if (result.ok)
      await db
        .update(settings)
        .set({ value: { ...d, orderId: result.orderId }, updatedAt: new Date() })
        .where(eq(settings.key, draftKey(token)));
    return result;
  });
}

/** Nightly expiry; referenced assets survive for immutable pending orders and paid sites. */
export async function cleanupCheckoutDrafts(now = new Date()): Promise<number> {
  const db = getDb();
  const snapshots = await db.select().from(settings).where(like(settings.key, 'checkout-setup:%'));
  for (const row of snapshots) {
    const orderId = row.key.slice('checkout-setup:'.length);
    const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
    const snapshot = row.value as SetupSnapshot;
    const transferred = order && (await db.query.customers.findFirst({ where: (c, { eq }) => eq(c.orderId, orderId) }));
    const transferredSite = transferred && (await db.query.sites.findFirst({ where: eq(sites.customerId, transferred.id) }));
    if (
      ((!order || !['paid', 'processing'].includes(order.status)) && new Date(snapshot.expiresAt) < now) ||
      transferredSite?.onboardingSubmittedAt
    )
      await db.delete(settings).where(eq(settings.key, row.key));
  }
  const remaining = await db.select().from(settings).where(like(settings.key, 'checkout-setup:%'));
  const pendingRefs = new Set(remaining.flatMap((r) => Object.values((r.value as SetupSnapshot).assetKeys)));
  const refs = new Set(pendingRefs);
  for (const s of await db.select({ keys: sites.assetKeys }).from(sites))
    for (const key of Object.values(s.keys ?? {})) refs.add(key);
  const drafts = await db.select().from(settings).where(like(settings.key, 'checkout-draft:%'));
  let removed = 0;
  for (const row of drafts) {
    const d = row.value as CheckoutDraft;
    if (new Date(d.expiresAt) > now || d.uploadKeys.some((key) => pendingRefs.has(key))) continue;
    // Lock against upload/payment writes before deleting draft state and unreferenced objects.
    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT key FROM settings WHERE key = ${row.key} FOR UPDATE`);
      for (const key of d.uploadKeys) if (!refs.has(key)) await getProviders().storage.delete(key);
      await tx.delete(settings).where(eq(settings.key, row.key));
    });
    removed++;
  }
  return removed;
}
