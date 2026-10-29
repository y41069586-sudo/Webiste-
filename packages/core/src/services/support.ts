import { and, desc, eq, or } from 'drizzle-orm';
import { getConfig, effectiveSwitches } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import {
  changeRequests,
  customers,
  events,
  leads,
  objections,
  orders,
  sites,
  supportMessages,
  suppressionList,
} from '../db/schema';
import { renderEmail } from '../emails/templates';
import { emailHash, normalizeBusinessName } from '../leads/normalize';
import { errInfo, logger } from '../logger';
import type { InboundEmail } from '../providers/types';
import { enqueue, QUEUES } from '../queue';
import {
  CLASSIFY_SCHEMA,
  CLASSIFY_SYSTEM,
  CLASSIFY_TOOL,
  isAutomated,
  OPT_OUT_RE,
  REPLY_SCHEMA,
  REPLY_TOOL,
  replySystemPrompt,
} from '../support/prompts';
import type { ObjectionCategory, SupportClass } from '../types';
import { formatDateLongDe, formatEuro } from '../util/time';
import { appUrl } from '../config/env';
import { audit } from './audit';
import { notifyAdmin, sendTransactionalEmail } from './email';
import { llmStructured } from './llm';
import { optOutLead } from './suppression';
import { recordObjection } from './objections';
import { DECEPTION_RE } from './safety-nets';

export type SupportMessage = typeof supportMessages.$inferSelect;

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** Adresse aus „Name <a@b.de>“ extrahieren und normalisieren. */
export function plainAddress(from: string): string {
  const m = /<([^>]+)>/.exec(from);
  return (m ? m[1]! : from).trim().toLowerCase();
}

/** Zitierte Vorgänger-Mails und Signaturtrenner abschneiden (für Klassifizierung und Kontext). */
export function stripQuoted(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const l of lines) {
    if (/^>/.test(l)) continue;
    if (/^(am|on)\s.+(schrieb|wrote)\s*.*:\s*$/i.test(l.trim())) break;
    if (/^-{2,}\s*(ursprüngliche nachricht|original message)/i.test(l.trim())) break;
    out.push(l);
  }
  return out.join('\n').trim();
}

/** Eingehende E-Mail speichern (Duplikate über die Message-ID) und Verarbeitung anstoßen. */
export async function ingestInboundEmail(
  mail: InboundEmail & { headers?: Record<string, string> },
  options: { queueProcessing?: boolean } = {},
): Promise<{ id: string; duplicate: boolean }> {
  const db = getDb();
  const from = plainAddress(mail.from);
  const automated = isAutomated(from, mail.subject, mail.headers);
  const link = await linkSender(db, from, mail.inReplyTo);
  const inserted = await db
    .insert(supportMessages)
    .values({
      direction: 'in',
      channel: 'email',
      fromEmail: from.slice(0, 254),
      toEmail: mail.to.slice(0, 254),
      subject: mail.subject.slice(0, 300),
      body: mail.text.slice(0, 20_000),
      providerMessageId: mail.providerMessageId.slice(0, 300),
      customerId: link.customerId,
      leadId: link.leadId,
      inReplyToId: link.inReplyToId,
      status: automated ? 'ignored' : options.queueProcessing === false ? 'escalated' : 'new',
      ...(options.queueProcessing === false && !automated
        ? { escalationReason: 'Manuelle Prüfung: E-Mail-Eingang ohne automatische Verarbeitung' }
        : {}),
      ...(automated ? { classification: 'spam' as SupportClass, escalationReason: 'automatische Nachricht' } : {}),
    })
    .onConflictDoNothing({ target: supportMessages.providerMessageId })
    .returning({ id: supportMessages.id });
  if (!inserted[0]) {
    const prev = await db.query.supportMessages.findFirst({
      where: eq(supportMessages.providerMessageId, mail.providerMessageId.slice(0, 300)),
    });
    return { id: prev!.id, duplicate: true };
  }
  const id = inserted[0].id;
  await audit(db, {
    entity: 'support_message',
    entityId: id,
    action: 'received',
    actor: 'system',
    context: { channel: 'email', automated, linked: Boolean(link.customerId || link.leadId) },
  });
  if (!automated && options.queueProcessing !== false)
    await enqueue(QUEUES.supportInbound, { messageId: id }, { singletonKey: `support-${id}` });
  return { id, duplicate: false };
}

/** Absender einem Kunden oder Lead zuordnen (nur über bereits bekannte Adressen bzw. Antwort-Bezug). */
async function linkSender(
  db: DbOrTx,
  from: string,
  inReplyTo?: string,
): Promise<{ customerId: string | null; leadId: string | null; inReplyToId: string | null }> {
  const inReplyToId: string | null = null;
  if (inReplyTo) {
    const prev = await db.query.supportMessages.findFirst({
      where: eq(supportMessages.providerMessageId, inReplyTo.slice(0, 300)),
    });
    if (prev) return { customerId: prev.customerId, leadId: prev.leadId, inReplyToId: prev.id };
  }
  const customer = await db.query.customers.findFirst({ where: eq(customers.email, from) });
  if (customer) return { customerId: customer.id, leadId: customer.leadId, inReplyToId };
  const order = await db.query.orders.findFirst({ where: eq(orders.customerEmail, from), orderBy: desc(orders.createdAt) });
  if (order) return { customerId: null, leadId: order.leadId, inReplyToId };
  const earlier = await db.query.supportMessages.findFirst({
    where: and(eq(supportMessages.fromEmail, from), eq(supportMessages.direction, 'in')),
    orderBy: desc(supportMessages.createdAt),
  });
  return { customerId: earlier?.customerId ?? null, leadId: earlier?.leadId ?? null, inReplyToId };
}

interface Classification {
  class: SupportClass;
  confidence: number;
  reason: string;
  company_name: string;
  objection?: ObjectionCategory | 'keiner';
}

async function classify(msg: SupportMessage): Promise<Classification> {
  const body = stripQuoted(msg.body).slice(0, 6000);
  // Widerspruch wird deterministisch erkannt – unabhängig vom Sprachmodell
  const ruleOptOut = OPT_OUT_RE.test(`${msg.subject ?? ''}\n${body}`);
  let c: Classification;
  try {
    c = await llmStructured<Classification>({
      tier: 'bulk',
      system: CLASSIFY_SYSTEM,
      prompt: `Betreff: ${msg.subject ?? ''}\n\nNachricht:\n${body}`,
      toolName: CLASSIFY_TOOL,
      toolDescription: 'Klassifiziert die Nachricht.',
      inputSchema: CLASSIFY_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 2000,
      effort: 'low',
      purpose: 'support_classify',
      leadId: msg.leadId ?? undefined,
    });
  } catch (err) {
    logger.warn({ messageId: msg.id, ...errInfo(err) }, 'support: Klassifizierung fehlgeschlagen');
    c = { class: 'frage', confidence: 0, reason: 'Klassifizierung fehlgeschlagen', company_name: '', objection: 'keiner' };
  }
  if (ruleOptOut && c.class !== 'opt_out')
    c = { ...c, class: 'opt_out', confidence: Math.max(c.confidence, 0.9), reason: `Regel: Widerspruch erkannt. ${c.reason}` };
  return c;
}

/** Kontext für den Antwortentwurf (nur Fakten aus unserer Datenbank, keine Links mit Zugangs-Token). */
async function replyContext(db: DbOrTx, msg: SupportMessage): Promise<string> {
  const lines: string[] = [];
  if (msg.customerId) {
    const c = await db.query.customers.findFirst({ where: eq(customers.id, msg.customerId) });
    const s = c ? await db.query.sites.findFirst({ where: eq(sites.customerId, c.id) }) : undefined;
    const o = c ? await db.query.orders.findFirst({ where: eq(orders.id, c.orderId) }) : undefined;
    if (c) {
      lines.push(`Absender ist Kunde: ${c.company}, Ansprechpartner ${c.contactName}.`);
      lines.push(`Domain: ${c.domain ?? 'noch offen'} (Status: ${c.domainStatus}).`);
      if (s)
        lines.push(
          `Website-Status: ${s.status}${s.productionUrl ? `, online unter ${s.productionUrl}` : ''}. Änderungsrunden genutzt: ${c.changeRoundsUsed}.`,
        );
      if (o)
        lines.push(
          `Bestellung: ${o.invoiceNumber ?? 'ohne Rechnung'}, ${formatEuro(o.amountCents)}, Status ${o.status}${o.paidAt ? `, bezahlt am ${formatDateLongDe(o.paidAt)}` : ''}.`,
        );
      if (c.hostingUntil) lines.push(`Hosting inklusive bis ${formatDateLongDe(c.hostingUntil)}.`);
      lines.push(
        'Den persönlichen Link zu Angaben/Vorschau hat der Kunde per E-Mail erhalten (nicht in die Antwort schreiben, auf die E-Mail verweisen).',
      );
    }
  } else if (msg.leadId) {
    const l = await db.query.leads.findFirst({ where: eq(leads.id, msg.leadId) });
    if (l && !l.anonymizedAt)
      lines.push(`Absender bezieht sich auf den Entwurf für ${l.businessName} (${l.city}). Lead-Status: ${l.status}.`);
  } else {
    lines.push('Absender ist uns nicht zugeordnet (vermutlich Empfänger eines Briefes).');
  }
  return lines.join('\n');
}

async function draftReply(
  msg: SupportMessage,
  cls: SupportClass,
): Promise<{ reply: string; needsHuman: boolean; reason: string }> {
  const db = getDb();
  const cfg = await getConfig();
  const context = await replyContext(db, msg);
  const res = await llmStructured<{ reply: string; needs_human: boolean; reason: string }>({
    tier: 'creative',
    system: replySystemPrompt(cfg),
    prompt: `KONTEXT:\n${context}\n\nKLASSE: ${cls}\n\nBETREFF: ${msg.subject ?? ''}\n\nNACHRICHT:\n${stripQuoted(msg.body).slice(0, 6000)}`,
    toolName: REPLY_TOOL,
    toolDescription: 'Gibt den Antwortentwurf zurück.',
    inputSchema: REPLY_SCHEMA as unknown as Record<string, unknown>,
    maxTokens: 1500,
    effort: 'medium',
    purpose: 'support_reply',
    leadId: msg.leadId ?? undefined,
  });
  return { reply: res.reply.trim(), needsHuman: res.needs_human, reason: res.reason };
}

/** Widerspruch umsetzen: Lead sperren/anonymisieren bzw. E-Mail sperren; Bestätigung senden. */
async function executeOptOut(msg: SupportMessage, companyName: string, actor: string): Promise<{ done: boolean; note: string }> {
  const db = getDb();
  let leadId = msg.leadId;
  if (!leadId && companyName.trim()) {
    const norm = normalizeBusinessName(companyName);
    const candidates = await db
      .select({ id: leads.id, name: leads.businessName })
      .from(leads)
      .where(
        or(
          eq(leads.status, 'letter_sent'),
          eq(leads.status, 'letter_delivered'),
          eq(leads.status, 'followup_sent'),
          eq(leads.status, 'scanned'),
          eq(leads.status, 'demo_published'),
        ),
      );
    const hits = candidates.filter((c) => normalizeBusinessName(c.name) === norm);
    if (hits.length === 1) leadId = hits[0]!.id;
  }
  if (msg.fromEmail && EMAIL_RE.test(msg.fromEmail)) {
    await db
      .insert(suppressionList)
      .values({ hash: emailHash(msg.fromEmail), kind: 'email', reason: 'opt_out_email' })
      .onConflictDoNothing({ target: suppressionList.hash });
  }
  if (!leadId)
    return { done: false, note: 'Widerspruch ohne eindeutige Zuordnung zu einem Betrieb – bitte im Dashboard den Lead sperren.' };
  await optOutLead(db, leadId, actor, 'widerspruch_email');
  return { done: true, note: 'Widerspruch umgesetzt (Lead gesperrt, Daten gelöscht).' };
}

/**
 * Verarbeitung einer eingehenden Nachricht: klassifizieren, Widerspruch automatisch,
 * sonst Antwortentwurf → Review-Queue (Auto-Reply nur mit Schalter und für freigegebene Klassen).
 */
export async function processSupportMessage(id: string): Promise<{ status: string; class?: SupportClass }> {
  const db = getDb();
  const msg = await db.query.supportMessages.findFirst({ where: eq(supportMessages.id, id) });
  if (!msg || msg.direction !== 'in' || msg.status !== 'new') return { status: 'skipped' };
  const cfg = await getConfig();
  const c = await classify(msg);
  const isCustomer = Boolean(msg.customerId);
  await db
    .update(supportMessages)
    .set({ classification: c.class, classificationConfidence: c.confidence, status: 'classified', updatedAt: new Date() })
    .where(eq(supportMessages.id, id));

  // Einwand für den Lern-Agent (L6); bei Widerspruch nur die Kategorie, ohne Text und ohne Lead-Bezug
  if (c.class !== 'spam' && c.objection && c.objection !== 'keiner') {
    await recordObjection(db, {
      leadId: c.class === 'opt_out' ? null : msg.leadId,
      industryFromLeadId: msg.leadId,
      source: msg.channel === 'form' ? 'form' : 'email',
      category: c.objection,
      text: c.class === 'opt_out' ? null : stripQuoted(msg.body),
      supportMessageId: msg.id,
    });
  }
  if (c.class === 'spam') {
    await db.update(supportMessages).set({ status: 'ignored', updatedAt: new Date() }).where(eq(supportMessages.id, id));
    return { status: 'ignored', class: c.class };
  }

  if (c.class === 'opt_out' && !isCustomer) {
    const r = await executeOptOut(msg, c.company_name, 'job:support');
    if (msg.fromEmail && EMAIL_RE.test(msg.fromEmail)) {
      const mail = renderEmail(cfg, {
        subject: 'Bestätigung: Wir schreiben Ihnen nicht mehr',
        blocks: [
          'vielen Dank für Ihre Nachricht. Wir haben Ihren Widerspruch umgesetzt: Sie erhalten von uns keine weitere Post, Ihr Website-Entwurf und die zugehörigen Daten werden gelöscht.',
          'Damit wir Sie auch künftig nicht erneut anschreiben, speichern wir nur einen nicht rückrechenbaren Prüfwert (Hash) Ihres Betriebs.',
        ],
      });
      try {
        await sendTransactionalEmail({
          ...mail,
          kind: 'opt_out_confirmation',
          idempotencyKey: `optout:${msg.id}`,
          to: msg.fromEmail,
          leadId: null,
        });
      } catch (err) {
        logger.warn({ messageId: id, ...errInfo(err) }, 'support: Bestätigung Widerspruch nicht gesendet');
      }
    }
    await db
      .update(supportMessages)
      .set({
        status: r.done ? 'done' : 'escalated',
        escalationReason: r.done ? null : r.note,
        leadId: r.done ? null : msg.leadId,
        updatedAt: new Date(),
      })
      .where(eq(supportMessages.id, id));
    await audit(db, {
      entity: 'support_message',
      entityId: id,
      action: 'opt_out',
      actor: 'job:support',
      context: { done: r.done },
    });
    if (!r.done)
      await notifyAdmin({
        key: `optout-unmatched:${id}`,
        title: 'Widerspruch ohne Zuordnung',
        lines: [r.note],
        link: appUrl(`/admin/support/${id}`),
      });
    return { status: r.done ? 'done' : 'escalated', class: c.class };
  }

  // Änderungswunsch eines Kunden mit Live-Seite → als Änderungsauftrag ablegen (Betreiber entscheidet)
  if (c.class === 'aenderungswunsch' && msg.customerId) {
    const site = await db.query.sites.findFirst({ where: eq(sites.customerId, msg.customerId) });
    if (site && ['live', 'preview'].includes(site.status)) {
      await db.insert(changeRequests).values({
        siteId: site.id,
        source: 'support',
        text: stripQuoted(msg.body).slice(0, 4000),
        status: 'needs_admin',
        countsAsRound: false,
      });
    }
  }

  let draft: { reply: string; needsHuman: boolean; reason: string };
  try {
    draft = await draftReply(msg, c.class);
  } catch (err) {
    logger.warn({ messageId: id, ...errInfo(err) }, 'support: Entwurf fehlgeschlagen');
    draft = { reply: '', needsHuman: true, reason: 'Entwurf fehlgeschlagen' };
  }
  // Beschwerde als Ereignis am Lead (Funnel, Sicherheitsnetz B6.7)
  if (c.class === 'beschwerde' && msg.leadId) {
    // Nur das Ergebnis der Erkennung speichern, nicht den Text (Sicherheitsnetz „Abzocke/Täuschung“)
    const deception = DECEPTION_RE.test(`${msg.subject ?? ''} ${msg.body}`);
    await db.insert(events).values({ leadId: msg.leadId, type: 'complaint', metaJson: { messageId: id, deception } });
  }
  const sw = effectiveSwitches(cfg);
  const escalate = c.class === 'beschwerde' || (c.class === 'opt_out' && isCustomer) || draft.needsHuman || !draft.reply;
  const auto = !escalate && sw.autoReply && cfg.support.autoReplyClasses.includes(c.class) && c.confidence >= 0.8;
  await db
    .update(supportMessages)
    .set({
      draftReply: draft.reply || null,
      status: auto ? 'approved' : escalate ? 'escalated' : 'drafted',
      escalationReason: escalate ? (c.class === 'beschwerde' ? 'Beschwerde' : draft.reason || 'Prüfung nötig') : null,
      ...(auto ? { approvedBy: 'auto', approvedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(supportMessages.id, id));
  if (auto) await enqueue(QUEUES.supportSend, { messageId: id }, { singletonKey: `support-send-${id}` });
  if (escalate) {
    await notifyAdmin({
      key: `support-escalated:${id}`,
      title: `Support: ${c.class} braucht dich`,
      lines: [
        `Betreff: ${msg.subject ?? '–'}`,
        `Grund: ${c.class === 'beschwerde' ? 'Beschwerde' : draft.reason || 'Prüfung nötig'}`,
      ],
      link: appUrl(`/admin/support/${id}`),
    });
  }
  return { status: auto ? 'approved' : escalate ? 'escalated' : 'drafted', class: c.class };
}

/** Admin: Entwurf (ggf. bearbeitet) freigeben und senden. */
export async function approveSupportReply(id: string, text: string, actor: string): Promise<void> {
  const db = getDb();
  const msg = await db.query.supportMessages.findFirst({ where: eq(supportMessages.id, id) });
  if (!msg || msg.direction !== 'in') throw new Error('Nachricht nicht gefunden');
  if (!msg.fromEmail || !EMAIL_RE.test(msg.fromEmail)) throw new Error('Keine gültige Absenderadresse');
  if (text.trim().length < 10) throw new Error('Antwort ist zu kurz');
  await db
    .update(supportMessages)
    .set({ draftReply: text.trim(), status: 'approved', approvedBy: actor, approvedAt: new Date(), updatedAt: new Date() })
    .where(eq(supportMessages.id, id));
  await audit(db, { entity: 'support_message', entityId: id, action: 'approved', actor });
  await enqueue(QUEUES.supportSend, { messageId: id }, { singletonKey: `support-send-${id}-${Date.now()}` });
}

/** Freigegebene Antwort senden (idempotent je Nachricht). */
export async function sendSupportReply(id: string): Promise<'sent' | 'skipped'> {
  const db = getDb();
  const cfg = await getConfig();
  const msg = await db.query.supportMessages.findFirst({ where: eq(supportMessages.id, id) });
  if (!msg || msg.status !== 'approved' || !msg.draftReply || !msg.fromEmail) return 'skipped';
  const subject = msg.subject ? (/^(re|aw):/i.test(msg.subject) ? msg.subject : `Re: ${msg.subject}`) : 'Ihre Nachricht';
  const name = msg.customerId
    ? (await db.query.customers.findFirst({ where: eq(customers.id, msg.customerId) }))?.contactName
    : null;
  const mail = renderEmail(cfg, {
    subject,
    name,
    blocks: [msg.draftReply.replace(/^(guten tag|hallo|sehr geehrte[rs]?)[^\n]*\n+/i, '')],
  });
  const res = await sendTransactionalEmail({
    ...mail,
    kind: 'support_reply',
    idempotencyKey: `support-reply:${msg.id}`,
    to: msg.fromEmail,
    customerId: msg.customerId,
    leadId: msg.leadId,
    ...(msg.providerMessageId && msg.channel === 'email'
      ? { headers: { 'In-Reply-To': msg.providerMessageId, References: msg.providerMessageId } }
      : {}),
  });
  await db.insert(supportMessages).values({
    direction: 'out',
    channel: 'email',
    fromEmail: cfg.sender.email,
    toEmail: msg.fromEmail,
    subject,
    body: mail.text,
    status: 'sent',
    customerId: msg.customerId,
    leadId: msg.leadId,
    inReplyToId: msg.id,
    providerMessageId: res.messageId ? `out:${res.messageId}` : null,
    sentAt: new Date(),
  });
  await db
    .update(supportMessages)
    .set({ status: 'sent', sentAt: new Date(), updatedAt: new Date() })
    .where(eq(supportMessages.id, id));
  return 'sent';
}

export async function setSupportStatus(id: string, status: 'done' | 'ignored', actor: string): Promise<void> {
  const db = getDb();
  await db.update(supportMessages).set({ status, updatedAt: new Date() }).where(eq(supportMessages.id, id));
  await audit(db, { entity: 'support_message', entityId: id, action: status, actor });
}

/**
 * Admin: Nachricht endgültig entfernen (z. B. Newsletter oder Werbung an die Support-Adresse). Verweise darauf
 * (Antwort-Kette, erfasste Einwände) bleiben bestehen, zeigen aber nicht mehr auf die gelöschte Nachricht.
 */
export async function deleteSupportMessage(id: string, actor: string): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.update(supportMessages).set({ inReplyToId: null }).where(eq(supportMessages.inReplyToId, id));
    await tx.update(objections).set({ supportMessageId: null }).where(eq(objections.supportMessageId, id));
    await tx.delete(supportMessages).where(eq(supportMessages.id, id));
    await audit(tx, { entity: 'support_message', entityId: id, action: 'deleted', actor });
  });
}

/** Admin: Widerspruch für diese Nachricht manuell ausführen (z. B. mit gewähltem Lead). */
export async function adminOptOut(id: string, leadId: string | null, actor: string): Promise<void> {
  const db = getDb();
  const msg = await db.query.supportMessages.findFirst({ where: eq(supportMessages.id, id) });
  if (!msg) throw new Error('Nachricht nicht gefunden');
  const r = await executeOptOut({ ...msg, leadId: leadId ?? msg.leadId }, '', actor);
  if (!r.done) throw new Error(r.note);
  await db.update(supportMessages).set({ status: 'done', leadId: null, updatedAt: new Date() }).where(eq(supportMessages.id, id));
}

/** Admin: Entwurf neu erzeugen (setzt die Nachricht zurück auf „neu“). */
export async function redraftSupport(id: string, actor: string): Promise<void> {
  const db = getDb();
  await db
    .update(supportMessages)
    .set({ status: 'new', draftReply: null, escalationReason: null, updatedAt: new Date() })
    .where(eq(supportMessages.id, id));
  await audit(db, { entity: 'support_message', entityId: id, action: 'redraft', actor });
  await enqueue(QUEUES.supportInbound, { messageId: id }, { singletonKey: `support-${id}-${Date.now()}` });
}

// ---------------------------------------------------------------------------
// Eingang per Webhook (Postmark Inbound oder generisches JSON)
// ---------------------------------------------------------------------------
export function parseInboundPayload(raw: string): (InboundEmail & { headers: Record<string, string> }) | null {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  // Postmark Inbound
  if (typeof j.MessageID === 'string' && (typeof j.From === 'string' || typeof j.FromFull === 'object')) {
    const headers = Object.fromEntries(
      ((j.Headers as { Name: string; Value: string }[] | undefined) ?? []).map((h) => [h.Name, h.Value]),
    );
    const fromFull = j.FromFull as { Email?: string } | undefined;
    const msgIdHeader = headers['Message-ID'] ?? headers['Message-Id'];
    return {
      providerMessageId: (msgIdHeader ?? j.MessageID) as string,
      from: fromFull?.Email ?? (j.From as string),
      to: String(j.OriginalRecipient ?? j.To ?? ''),
      subject: String(j.Subject ?? ''),
      text: String(j.TextBody ?? j.StrippedTextReply ?? ''),
      receivedAt: j.Date ? new Date(String(j.Date)) : new Date(),
      ...(headers['In-Reply-To'] ? { inReplyTo: headers['In-Reply-To'] } : {}),
      headers,
    };
  }
  // Generisch {messageId, from, to, subject, text, inReplyTo, headers}
  if (typeof j.messageId === 'string' && typeof j.from === 'string' && typeof j.text === 'string') {
    return {
      providerMessageId: j.messageId,
      from: j.from,
      to: String(j.to ?? ''),
      subject: String(j.subject ?? ''),
      text: j.text,
      receivedAt: new Date(),
      ...(typeof j.inReplyTo === 'string' ? { inReplyTo: j.inReplyTo } : {}),
      headers: (j.headers as Record<string, string>) ?? {},
    };
  }
  return null;
}
