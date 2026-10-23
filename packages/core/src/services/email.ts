import { and, eq, lt, or, sql } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { getConfig } from '../config/service';
import { getDb } from '../db/client';
import { outboundEmails } from '../db/schema';
import { adminNotificationEmail, type EmailContent } from '../emails/templates';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import type { EmailAttachment } from '../providers/types';

export interface TransactionalEmail extends EmailContent {
  kind: string;
  /** Gleicher Schlüssel ⇒ höchstens eine Zustellung */
  idempotencyKey: string;
  to: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  headers?: Record<string, string>;
  orderId?: string | null;
  customerId?: string | null;
  leadId?: string | null;
}

export class EmailInProgressError extends Error {
  constructor() {
    super('Diese E-Mail wird gerade versendet');
    this.name = 'EmailInProgressError';
  }
}

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/**
 * Transaktions-Mail idempotent senden. Die Zeile in outbound_emails sperrt Doppelversand
 * (auch bei Anbietern ohne Idempotenz-Header); fehlgeschlagene oder hängende Versuche
 * (> 10 min „sending“) werden beim nächsten Aufruf wiederholt. Keine Adressen im Log.
 */
export async function sendTransactionalEmail(mail: TransactionalEmail): Promise<{ status: 'sent' | 'duplicate'; messageId: string | null }> {
  if (!EMAIL_RE.test(mail.to)) throw new Error(`Ungültige Empfängeradresse (${mail.kind})`);
  const db = getDb();
  const { email } = getProviders();
  const inserted = await db
    .insert(outboundEmails)
    .values({
      kind: mail.kind,
      idempotencyKey: mail.idempotencyKey,
      toEmail: mail.to,
      subject: mail.subject,
      orderId: mail.orderId ?? null,
      customerId: mail.customerId ?? null,
      leadId: mail.leadId ?? null,
      provider: email.name,
      attachmentNames: (mail.attachments ?? []).map((a) => a.filename),
    })
    .onConflictDoNothing({ target: outboundEmails.idempotencyKey })
    .returning({ id: outboundEmails.id });

  let rowId = inserted[0]?.id;
  if (!rowId) {
    const existing = await db.query.outboundEmails.findFirst({ where: eq(outboundEmails.idempotencyKey, mail.idempotencyKey) });
    if (!existing) throw new Error('outbound_emails: Zeile verschwunden');
    if (existing.status === 'sent') return { status: 'duplicate', messageId: existing.providerMessageId };
    // erneut beanspruchen: nur failed oder hängengebliebene Versuche
    const claimed = await db
      .update(outboundEmails)
      .set({ status: 'sending', error: null, provider: email.name, createdAt: new Date() })
      .where(
        and(
          eq(outboundEmails.id, existing.id),
          or(eq(outboundEmails.status, 'failed'), and(eq(outboundEmails.status, 'sending'), lt(outboundEmails.createdAt, sql`now() - interval '10 minutes'`))),
        ),
      )
      .returning({ id: outboundEmails.id });
    if (!claimed[0]) throw new EmailInProgressError();
    rowId = claimed[0].id;
  }

  try {
    const res = await email.send({
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      replyTo: mail.replyTo ?? (await getConfig()).sender.email,
      attachments: mail.attachments,
      tag: mail.kind,
      idempotencyKey: mail.idempotencyKey,
      ...(mail.headers ? { headers: mail.headers } : {}),
    });
    await db.update(outboundEmails).set({ status: 'sent', providerMessageId: res.messageId, sentAt: new Date() }).where(eq(outboundEmails.id, rowId));
    logger.info({ kind: mail.kind, emailId: rowId, provider: email.name }, 'E-Mail versendet');
    return { status: 'sent', messageId: res.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 500) : String(err);
    await db.update(outboundEmails).set({ status: 'failed', error: msg }).where(eq(outboundEmails.id, rowId));
    logger.warn({ kind: mail.kind, emailId: rowId, ...errInfo(err) }, 'E-Mail-Versand fehlgeschlagen');
    throw err;
  }
}

/** Kurze Benachrichtigung an den Betreiber (ADMIN_EMAIL). Fehler werden nur geloggt. */
export async function notifyAdmin(input: { key: string; title: string; lines: string[]; link?: string }): Promise<void> {
  try {
    const cfg = await getConfig();
    const content = adminNotificationEmail(cfg, input);
    await sendTransactionalEmail({ ...content, kind: 'admin', idempotencyKey: `admin:${input.key}`, to: getEnv().ADMIN_EMAIL });
  } catch (err) {
    logger.warn({ key: input.key, ...errInfo(err) }, 'Admin-Benachrichtigung fehlgeschlagen');
  }
}
