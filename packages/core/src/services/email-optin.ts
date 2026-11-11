import { and, eq, gt, inArray, isNull, like, notExists, sql } from 'drizzle-orm';
import { appUrl, demoUrl, getEnv } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { auditLog, demos, leads, orders, outboundEmails, supportMessages } from '../db/schema';
import { optinFollowupEmail, optinLinkEmail } from '../emails/templates';
import { errInfo, logger } from '../logger';
import { hmacSha256 } from '../util/crypto';
import { addDays, formatDateLongDe } from '../util/time';
import { audit } from './audit';
import { sendTransactionalEmail } from './email';
import { rateLimit } from './rate-limit';
import { isEmailSuppressed } from './suppression';
import { findPublicDemo, looksLikeSpam, notifyInterest, type RequestMeta } from './tracking';

/**
 * „Link per E-Mail zuschicken“ auf der Demo (11.11.2026, Betreiber: nach dem Scan per E-Mail im Gespräch bleiben, ohne
 * Kalt-Mails). Der Betrieb trägt seine Adresse selbst ein und setzt ein nicht vorausgewähltes Häkchen. Er bekommt sofort
 * den angeforderten Link. Weitere Erinnerungen (höchstens zwei bis zum Ablauf) erst nach Bestätigung per Klick
 * (Double-Opt-in); Nachweis im audit_log (`optin_requested`, `optin_confirmed`). Abmeldung über den bestehenden
 * Abmeldelink. Gespeichert wird die Anfrage als eingehende Support-Nachricht, damit der Betreiber unter Support antworten
 * kann; sie läuft nicht durch die KI-Bearbeitung.
 */
export const OPTIN_SUBJECT_PREFIX = 'Link per E-Mail angefordert';
export const OPTIN_CONSENT_TEXT =
  'Ja, schicken Sie mir den Link zu meinem Website-Entwurf per E-Mail. Nach meiner Bestätigung dürfen Sie mich bis zum Ablauf des Entwurfs höchstens zweimal kurz daran erinnern. Abmeldung jederzeit per Link in jeder E-Mail.';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export type OptinResult = { ok: true } | { ok: false; reason: 'invalid' | 'spam' | 'rate_limited' };

export function optinSignature(messageId: string): string {
  return hmacSha256(getEnv().SESSION_SECRET, `optin:${messageId}`).slice(0, 32);
}

export function optinConfirmUrl(messageId: string): string {
  return appUrl(`/bestaetigen/${messageId}.${optinSignature(messageId)}`);
}

/** Abmeldelink über denselben Weg wie die bestehende Erinnerungs-Mail. */
function unsubscribeLink(messageId: string): string {
  const sig = hmacSha256(getEnv().SESSION_SECRET, `unsubscribe:${messageId}`).slice(0, 32);
  return appUrl(`/abmelden/${messageId}.${sig}`);
}

export async function requestDemoLinkByEmail(
  slug: string,
  input: { email: string; consent: boolean; honeypot: string; ts: number },
  req: RequestMeta,
): Promise<OptinResult> {
  const found = await findPublicDemo(slug);
  if (found.state !== 'ok') return { ok: false, reason: 'invalid' };
  if (looksLikeSpam({ honeypot: input.honeypot, ts: input.ts, message: '' })) return { ok: false, reason: 'spam' };
  const email = input.email.trim().toLowerCase().slice(0, 200);
  if (!input.consent || !EMAIL_RE.test(email)) return { ok: false, reason: 'invalid' };
  const db = getDb();
  if (!(await rateLimit(db, `optin:${req.ipHash}`, 5, 3600)).allowed) return { ok: false, reason: 'rate_limited' };
  // Abgemeldete Adressen bekommen nichts; dieselbe Anfrage innerhalb eines Tages löst keine zweite Mail aus
  if (await isEmailSuppressed(db, email)) return { ok: true };
  const recent = await db.query.supportMessages.findFirst({
    where: and(
      eq(supportMessages.leadId, found.lead.id),
      eq(supportMessages.fromEmail, email),
      like(supportMessages.subject, `${OPTIN_SUBJECT_PREFIX}%`),
      gt(supportMessages.createdAt, addDays(new Date(), -1)),
    ),
  });
  if (recent) return { ok: true };
  const at = new Date();
  const [msg] = await db
    .insert(supportMessages)
    .values({
      leadId: found.lead.id,
      direction: 'in',
      channel: 'form',
      fromEmail: email,
      subject: `${OPTIN_SUBJECT_PREFIX}: ${found.lead.businessName}`.slice(0, 200),
      body: [
        'Der Betrieb hat auf seiner Demo „Link per E-Mail zuschicken“ genutzt.',
        `Einwilligung (Häkchen selbst gesetzt): „${OPTIN_CONSENT_TEXT}“`,
        `Zeitpunkt: ${at.toISOString()}`,
        'Weitere Erinnerungen erst nach Bestätigung per Klick in der E-Mail.',
      ].join('\n'),
      classification: 'frage',
      status: 'done',
    })
    .returning({ id: supportMessages.id });
  await audit(db, {
    entity: 'support_message',
    entityId: msg!.id,
    action: 'optin_requested',
    actor: 'public:demo-optin',
    context: { leadId: found.lead.id, consentText: OPTIN_CONSENT_TEXT, ipHash: req.ipHash, ua: req.ua },
  });
  const cfg = await getConfig();
  const unsub = unsubscribeLink(msg!.id);
  try {
    const mail = optinLinkEmail(cfg, {
      businessName: found.lead.businessName,
      demoUrl: demoUrl(`/d/${slug}`),
      expiresLabel: found.demo.expiresAt ? formatDateLongDe(found.demo.expiresAt) : 'auf Weiteres',
      confirmUrl: optinConfirmUrl(msg!.id),
      unsubscribeUrl: unsub,
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'optin_link',
      idempotencyKey: `optin-link:${msg!.id}`,
      to: email,
      leadId: found.lead.id,
      headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
  } catch (err) {
    logger.warn({ leadId: found.lead.id, ...errInfo(err) }, 'optin: Link-Mail nicht versendet');
  }
  await notifyInterest(found.lead.id, 'email_optin', req, {
    ref: msg!.id,
    detail: `E-Mail: ${email} (Link verschickt, Bestätigung für Erinnerungen steht noch aus)`,
  });
  return { ok: true };
}

/** Anfrage zu einem signierten Bestätigungs-Token (oder null). */
export async function optinRequestByToken(token: string) {
  const m = /^([0-9a-f-]{36})\.([0-9a-f]{32})$/.exec(token);
  if (!m || optinSignature(m[1]!) !== m[2]) return null;
  const msg = await getDb().query.supportMessages.findFirst({ where: eq(supportMessages.id, m[1]!) });
  return msg?.fromEmail && msg.subject?.startsWith(OPTIN_SUBJECT_PREFIX) ? msg : null;
}

/** Bestätigung per Klick (POST): einmalig im audit_log, Hinweis an den Betreiber. */
export async function confirmOptin(token: string, req: RequestMeta): Promise<boolean> {
  const msg = await optinRequestByToken(token);
  if (!msg) return false;
  const db = getDb();
  const done = await db.query.auditLog.findFirst({
    where: and(eq(auditLog.entity, 'support_message'), eq(auditLog.entityId, msg.id), eq(auditLog.action, 'optin_confirmed')),
  });
  if (done) return true;
  await audit(db, {
    entity: 'support_message',
    entityId: msg.id,
    action: 'optin_confirmed',
    actor: 'public:demo-optin',
    context: { leadId: msg.leadId, ipHash: req.ipHash, ua: req.ua },
  });
  await notifyInterest(msg.leadId, 'email_optin', req, {
    ref: `${msg.id}:bestaetigt`,
    detail: `E-Mail: ${msg.fromEmail} hat Erinnerungen bestätigt`,
  });
  return true;
}

/** SQL: Link-Anfrage ohne Bestätigung (bekommt keine Erinnerungen). */
export const unconfirmedOptinSql = sql`(coalesce(${supportMessages.subject}, '') LIKE ${`${OPTIN_SUBJECT_PREFIX}%`} AND NOT EXISTS (SELECT 1 FROM audit_log a WHERE a.entity = 'support_message' AND a.entity_id = ${supportMessages.id}::text AND a.action = 'optin_confirmed'))`;

/**
 * Eine kurze Nachfrage 3 Tage nach der Bestätigung („Passt der Entwurf? Wünsche kostenlos“). Nur bestätigte Anfragen,
 * kein Kauf, Demo noch mindestens einen Tag online, nicht abgemeldet. Zusammen mit der Erinnerung 7 Tage vor Ablauf
 * höchstens zwei Erinnerungen, wie im Einwilligungstext genannt.
 */
export async function sendOptinFollowups(now = new Date()): Promise<number> {
  const db = getDb();
  const cfg = await getConfig();
  const rows = await db
    .select({ msg: supportMessages, demo: demos })
    .from(supportMessages)
    .innerJoin(leads, eq(leads.id, supportMessages.leadId))
    .innerJoin(demos, and(eq(demos.leadId, leads.id), eq(demos.status, 'published')))
    .where(
      and(
        like(supportMessages.subject, `${OPTIN_SUBJECT_PREFIX}%`),
        isNull(leads.anonymizedAt),
        sql`${leads.status} <> 'suppressed'`,
        sql`${demos.expiresAt} > ${addDays(now, 1)}`,
        sql`EXISTS (SELECT 1 FROM audit_log a WHERE a.entity = 'support_message' AND a.entity_id = ${supportMessages.id}::text AND a.action = 'optin_confirmed' AND a.created_at < ${addDays(now, -3)})`,
        notExists(
          db
            .select({ x: orders.id })
            .from(orders)
            .where(and(eq(orders.leadId, leads.id), inArray(orders.status, ['paid', 'processing', 'pending']))),
        ),
        notExists(
          db
            .select({ x: outboundEmails.id })
            .from(outboundEmails)
            .where(and(eq(outboundEmails.leadId, leads.id), eq(outboundEmails.kind, 'optin_followup'))),
        ),
      ),
    )
    .limit(100);
  const seen = new Set<string>();
  let sent = 0;
  for (const { msg, demo } of rows) {
    if (!msg.leadId || seen.has(msg.leadId)) continue;
    seen.add(msg.leadId);
    if (await isEmailSuppressed(db, msg.fromEmail!)) continue;
    const unsub = unsubscribeLink(msg.id);
    try {
      const mail = optinFollowupEmail(cfg, {
        demoUrl: demoUrl(`/d/${demo.slug}`),
        wishUrl: demoUrl(`/d/${demo.slug}#frage`),
        expiresLabel: formatDateLongDe(demo.expiresAt!),
        unsubscribeUrl: unsub,
      });
      await sendTransactionalEmail({
        ...mail,
        kind: 'optin_followup',
        idempotencyKey: `optin-followup:${msg.leadId}`,
        to: msg.fromEmail!,
        leadId: msg.leadId,
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      sent++;
    } catch (err) {
      logger.warn({ leadId: msg.leadId, ...errInfo(err) }, 'optin: Nachfrage nicht versendet');
    }
  }
  return sent;
}
