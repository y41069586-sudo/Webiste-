import { and, desc, eq, gt, gte, inArray, isNotNull, sql } from 'drizzle-orm';
import { demoUrl } from '../config/env';
import { getDb, type DbOrTx } from '../db/client';
import { demos, events, leads, letters, supportMessages } from '../db/schema';
import { enqueue, QUEUES } from '../queue';
import type { EventType, LeadStatus } from '../types';
import { audit } from './audit';
import { currentDemoForLead } from './demo-review';
import { transitionLead } from './lead-state';
import { rateLimit } from './rate-limit';
import { applyLetterStatus } from './sending';
import { optOutLead } from './suppression';
import { SHORT_CODE_RE } from '../util/crypto';

export interface RequestMeta {
  /** gekürzter User-Agent (Gerät/Browser-Familie) */
  ua: string;
  /** IP-Hash mit täglich rotierendem Salt – nie die IP selbst */
  ipHash: string;
  isBot: boolean;
}

const EVENT_STATUS: Partial<Record<EventType, LeadStatus>> = {
  scan: 'scanned',
  cta_click: 'cta_clicked',
  checkout_started: 'checkout_started',
};

/**
 * Event speichern (keine vollständige IP, keine Cookies). Bei scan/demo_view werden
 * Wiederholungen desselben Tages vom gleichen (gehashten) Client nicht doppelt gezählt.
 */
export async function recordEvent(
  db: DbOrTx,
  input: { leadId: string; type: EventType; meta?: Record<string, unknown>; req?: RequestMeta; dedupeDaily?: boolean },
): Promise<boolean> {
  if (input.req?.isBot) return false;
  if (input.dedupeDaily && input.req) {
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const dup = await db
      .select({ id: events.id })
      .from(events)
      .where(
        and(
          eq(events.leadId, input.leadId),
          eq(events.type, input.type),
          gte(events.createdAt, since),
          sql`${events.metaJson}->>'ipHash' = ${input.req.ipHash}`,
        ),
      )
      .limit(1);
    if (dup.length) return false;
  }
  const target = EVENT_STATUS[input.type];
  // Zuerst die Lead-Zeile sperren, dann das Event schreiben: sonst Deadlock bei gleichzeitigen
  // Scans (Fremdschlüssel-Sperre des Events gegen die Zeilensperre des Statuswechsels)
  if (target) await db.execute(sql`SELECT id FROM leads WHERE id = ${input.leadId} FOR UPDATE`);
  await db.insert(events).values({
    leadId: input.leadId,
    type: input.type,
    metaJson: { ...(input.meta ?? {}), ...(input.req ? { ua: input.req.ua, ipHash: input.req.ipHash } : {}) },
  });
  if (target) {
    await transitionLead(db, input.leadId, target, { actor: `public:${input.type}`, onlyForward: true });
  }
  return true;
}

export type DemoLookup =
  { state: 'ok'; demo: typeof demos.$inferSelect; lead: typeof leads.$inferSelect } | { state: 'gone' } | { state: 'not_found' };

/** Veröffentlichte, nicht abgelaufene Demo per Slug. */
export async function findPublicDemo(slug: string, now = new Date()): Promise<DemoLookup> {
  if (!/^[A-Za-z0-9]{20,64}$/.test(slug)) return { state: 'not_found' };
  const db = getDb();
  const demo = await db.query.demos.findFirst({ where: eq(demos.slug, slug) });
  if (!demo) return { state: 'not_found' };
  if (demo.status !== 'published' || demo.deletedAt || (demo.expiresAt && demo.expiresAt < now)) return { state: 'gone' };
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, demo.leadId) });
  if (!lead || lead.status === 'suppressed') return { state: 'gone' };
  return { state: 'ok', demo, lead };
}

/**
 * Ein Scan beweist, dass der Brief angekommen ist: liegt die geschätzte Zustellung noch in der Zukunft,
 * wird sie auf den Scan-Zeitpunkt korrigiert und der Brief als zugestellt markiert (B5.2). Die
 * korrigierten Briefe liefern die beobachtete Laufzeit (observedTransit).
 */
export async function correctDeliveryEstimate(db: DbOrTx, leadId: string, at: Date): Promise<boolean> {
  const rows = await db
    .select()
    .from(letters)
    .where(
      and(
        eq(letters.leadId, leadId),
        eq(letters.isTest, false),
        inArray(letters.status, ['queued', 'sent']),
        isNotNull(letters.providerLetterId),
        gt(letters.estimatedDeliveredAt, at),
      ),
    )
    .orderBy(desc(letters.sequence))
    .limit(1);
  const l = rows[0];
  if (!l) return false;
  await db
    .update(letters)
    .set({ estimatedDeliveredAt: at, deliveryCorrectedAt: at, sentAt: l.sentAt ?? at })
    .where(eq(letters.id, l.id));
  await applyLetterStatus(db, l.providerLetterId!, 'delivered', at, 'public:scan');
  return true;
}

/** Beobachtete Laufzeit aus korrigierten Briefen (Werktage zwischen Versand und erstem Scan). */
export async function observedTransit(db: DbOrTx = getDb()): Promise<{ samples: number; medianBusinessDays: number | null }> {
  const rows = await db.execute<{ days: number }>(sql`
    SELECT (SELECT count(*) FROM generate_series(sent_at::date + 1, delivery_corrected_at::date, interval '1 day') d
            WHERE extract(isodow FROM d) < 6)::int AS days
    FROM letters WHERE delivery_corrected_at IS NOT NULL AND sent_at IS NOT NULL AND delivery_corrected_at >= sent_at`);
  const days = rows.rows.map((r) => Number(r.days)).sort((a, b) => a - b);
  if (!days.length) return { samples: 0, medianBusinessDays: null };
  const mid = Math.floor(days.length / 2);
  return { samples: days.length, medianBusinessDays: days.length % 2 ? days[mid]! : (days[mid - 1]! + days[mid]!) / 2 };
}

/** QR-Scan: Event + Weiterleitung zur aktuellen Demo. */
export async function handleScan(
  token: string,
  req: RequestMeta,
  /** Kanal: QR-Code oder abgetippte Kurz-URL (B6.1) */
  via: 'qr' | 'kurz' = 'qr',
): Promise<{ redirect: string } | { gone: true } | { notFound: true }> {
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { notFound: true };
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(leads.trackToken, token) });
  if (!lead) return { notFound: true };
  const demo = await currentDemoForLead(db, lead.id);
  if (!demo || (demo.expiresAt && demo.expiresAt < new Date()) || lead.status === 'suppressed') return { gone: true };
  await db.transaction(async (tx) => {
    if (await recordEvent(tx, { leadId: lead.id, type: 'scan', meta: { via }, req, dedupeDaily: true })) {
      await correctDeliveryEstimate(tx, lead.id, new Date());
    }
  });
  return { redirect: demoUrl(`/d/${demo.slug}`) };
}

export async function handleOptOut(slug: string, req: RequestMeta): Promise<boolean> {
  const db = getDb();
  const demo = await db.query.demos.findFirst({ where: eq(demos.slug, slug) });
  if (!demo) return false;
  await db.transaction(async (tx) => {
    await tx.insert(events).values({ leadId: demo.leadId, type: 'opt_out', metaJson: { ua: req.ua } });
    await optOutLead(tx, demo.leadId, 'public:kein-interesse', 'kein_interesse_demo');
  });
  return true;
}

export interface QuestionInput {
  name: string;
  email: string;
  phone?: string;
  message: string;
  consent: boolean;
  honeypot: string;
  ts: number;
}

export type QuestionResult = { ok: true } | { ok: false; reason: 'invalid' | 'spam' | 'rate_limited' };

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Formular-Spamschutz ohne Tracking: Honeypot, Zeitfalle, Ratenbegrenzung. */
export function looksLikeSpam(input: { honeypot: string; ts: number; message: string }, now = Date.now()): boolean {
  if (input.honeypot.trim()) return true;
  const age = now - input.ts;
  if (!Number.isFinite(age) || age < 3_000 || age > 14 * 24 * 3600 * 1000) return true;
  const links = (input.message.match(/https?:\/\//g) ?? []).length;
  return links > 2;
}

/** „Frage zu diesem Entwurf“: geht an uns (Support-Queue), nicht an den Betrieb. */
export async function handleDemoQuestion(slug: string, input: QuestionInput, req: RequestMeta): Promise<QuestionResult> {
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return { ok: false, reason: 'invalid' };
  if (looksLikeSpam(input)) return { ok: false, reason: 'spam' };
  if (!input.consent || !EMAIL_RE.test(input.email.trim()) || input.message.trim().length < 5 || input.name.trim().length < 2) {
    return { ok: false, reason: 'invalid' };
  }
  const db = getDb();
  const rl = await rateLimit(db, `question:${req.ipHash}`, 5, 3600);
  if (!rl.allowed) return { ok: false, reason: 'rate_limited' };
  const leadId = found.lead.id;
  const [msg] = await db
    .insert(supportMessages)
    .values({
      leadId,
      direction: 'in',
      channel: 'form',
      fromEmail: input.email.trim().toLowerCase().slice(0, 200),
      subject: `Frage zum Entwurf von ${found.lead.businessName}`.slice(0, 200),
      body: [
        `Name: ${input.name.trim().slice(0, 120)}`,
        input.phone ? `Telefon: ${input.phone.trim().slice(0, 40)}` : '',
        '',
        input.message.trim().slice(0, 4000),
      ]
        .filter((l, i) => l || i > 1)
        .join('\n'),
      status: 'new',
    })
    .returning({ id: supportMessages.id });
  await recordEvent(db, { leadId, type: 'question_sent', req: { ...req, isBot: false } });
  await audit(db, {
    entity: 'support_message',
    entityId: msg!.id,
    action: 'received',
    actor: 'public:demo-form',
    context: { leadId },
  });
  await enqueue(QUEUES.supportInbound, { messageId: msg!.id });
  return { ok: true };
}

/**
 * Kurz-URL aus dem Brief ({TRACK_DOMAIN}/{kurzcode}): QR-Token zum Kurzcode. Fehlversuche je Client
 * sind begrenzt (kein Durchprobieren von Codes).
 */
export async function trackTokenForShortCode(code: string, meta: RequestMeta): Promise<string | null | 'rate_limited'> {
  const c = code.toLowerCase();
  if (!SHORT_CODE_RE.test(c)) return null;
  const db = getDb();
  const lead = await db.query.leads.findFirst({ where: eq(leads.shortCode, c), columns: { trackToken: true } });
  if (lead) return lead.trackToken;
  const rl = await rateLimit(db, `shortcode-miss:${meta.ipHash}`, 30, 600);
  return rl.allowed ? null : 'rate_limited';
}
