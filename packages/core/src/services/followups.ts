import { and, eq, gt, inArray, isNull, notExists, sql } from 'drizzle-orm';
import { appUrl, demoUrl, getEnv } from '../config/env';
import { effectiveSwitches, getConfig } from '../config/service';
import { getDb } from '../db/client';
import { demos, leads, letters, orders, outboundEmails, supportMessages } from '../db/schema';
import { demoReminderEmail } from '../emails/templates';
import { errInfo, logger } from '../logger';
import { enqueue, QUEUES } from '../queue';
import { hmacSha256 } from '../util/crypto';
import { addDays, formatDateLongDe } from '../util/time';
import { audit } from './audit';
import { currentDemoForLead } from './demo-review';
import { sendTransactionalEmail } from './email';
import { isEmailSuppressed } from './suppression';
import { refreshLeadData } from './lead-finder';
import { bestTemplateForBranch } from './template-stats';

export interface FollowupSummary {
  /** Sendung 2 („nur noch bis … online“) eingereiht */
  second: number;
  /** Sendung 3 („Wir haben Ihre Website verbessert“) eingereiht */
  third: number;
  /** Demo-Überarbeitungen für heiße Leads angestoßen */
  improving: number;
  /** Erinnerungs-Mails an Leads, die uns selbst geschrieben haben */
  reminders: number;
  /** Kompatibilität: Summe der eingereihten Briefe */
  queued: number;
}

/**
 * Folgesendungen (max. 3 je Lead, alle als Brief):
 *  2) kein Scan 12 Tage nach (geschätzter) Zustellung → kurzer Brief, Demo wird bis „Zustellung + 7 Tage“ verlängert
 *  3) heißer Lead (≥ 2 Demo-Aufrufe oder CTA-Klick), nach 7 Tagen kein Kauf → Demo wird zuerst wirklich
 *     überarbeitet (neue Version, Pflicht-Prüfung), erst nach deren Veröffentlichung folgt Brief 3
 * Dazu höchstens eine Erinnerungs-Mail an Leads, die uns selbst mit E-Mail-Adresse kontaktiert haben.
 */
export async function scheduleFollowups(now = new Date()): Promise<FollowupSummary> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  const out: FollowupSummary = { second: 0, third: 0, improving: 0, reminders: 0, queued: 0 };
  if (!sw.followupEnabled || sw.killSwitch) return out;
  const max = cfg.letter.maxLettersPerLead;

  // 2) Kein Scan nach Zustellung
  if (max >= 2) {
    const cutoff = addDays(now, -cfg.timing.followupAfterDays);
    const due = await db
      .select({ leadId: leads.id })
      .from(leads)
      .innerJoin(letters, and(eq(letters.leadId, leads.id), eq(letters.sequence, 1)))
      .where(
        and(
          inArray(leads.status, ['letter_sent', 'letter_delivered']),
          isNull(leads.anonymizedAt),
          sql`${leads.lettersSent} < ${max}`,
          sql`coalesce(${letters.deliveredAt}, ${letters.estimatedDeliveredAt}) < ${cutoff}`,
          notExists(
            db
              .select({ x: letters.id })
              .from(letters)
              .where(and(eq(letters.leadId, leads.id), sql`${letters.sequence} >= 2`)),
          ),
        ),
      )
      .limit(200);
    for (const d of due) {
      await enqueue(
        QUEUES.generateLetter,
        { leadId: d.leadId, sequence: 2, triggeredBy: 'followup' },
        { singletonKey: `letter:${d.leadId}:2` },
      );
      out.second++;
    }
  }

  // 3) Heißer Lead ohne Kauf
  if (max >= 3) {
    const hotCutoff = addDays(now, -cfg.timing.hotLeadAfterDays);
    const minViews = cfg.timing.hotLeadMinViews;
    const rows = await db.execute<{ lead_id: string; hot_at: Date }>(sql`
      SELECT l.id AS lead_id, h.hot_at
      FROM leads l
      CROSS JOIN LATERAL (
        SELECT least(
          (SELECT min(e.created_at) FROM events e WHERE e.lead_id = l.id AND e.type = 'cta_click'),
          (SELECT e.created_at FROM events e WHERE e.lead_id = l.id AND e.type = 'demo_view'
             ORDER BY e.created_at OFFSET ${minViews - 1} LIMIT 1)
        ) AS hot_at
      ) h
      WHERE l.status IN ('scanned', 'cta_clicked', 'checkout_started', 'followup_sent', 'letter_delivered', 'letter_sent')
        AND l.anonymized_at IS NULL
        AND l.letters_sent < ${max}
        AND h.hot_at IS NOT NULL AND h.hot_at < ${hotCutoff}
        AND NOT EXISTS (SELECT 1 FROM letters x WHERE x.lead_id = l.id AND x.sequence = 3)
        AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.lead_id = l.id AND o.status IN ('paid', 'processing', 'refunded'))
      LIMIT 200
    `);
    for (const r of rows.rows) {
      const hotAt = new Date(r.hot_at);
      const current = await currentDemoForLead(db, r.lead_id);
      if (current?.publishedAt && current.publishedAt > hotAt) {
        // Überarbeitete Version ist veröffentlicht → jetzt Brief 3
        await enqueue(
          QUEUES.generateLetter,
          { leadId: r.lead_id, sequence: 3, triggeredBy: 'followup-hot' },
          { singletonKey: `letter:${r.lead_id}:3` },
        );
        out.third++;
        continue;
      }
      // Läuft schon eine Überarbeitung (oder ist sie gescheitert)? Dann nicht erneut anstoßen
      const started = await db
        .select({ id: demos.id })
        .from(demos)
        .where(and(eq(demos.leadId, r.lead_id), gt(demos.createdAt, hotAt)))
        .limit(1);
      if (started.length) continue;
      // Neueste Daten des Betriebs laden; hat er inzwischen eine Website oder ist geschlossen → kein Brief 3
      let refresh = { refreshed: false, hasWebsite: false, closed: false };
      try {
        refresh = await refreshLeadData(r.lead_id, 'job:followup');
      } catch (err) {
        logger.warn({ leadId: r.lead_id, ...errInfo(err) }, 'Lead-Daten nicht aufgefrischt – Überarbeitung mit bekannten Daten');
      }
      if (refresh.hasWebsite || refresh.closed) {
        await audit(db, {
          entity: 'lead',
          entityId: r.lead_id,
          action: 'followup3_skipped',
          actor: 'job:followup',
          context: { reason: refresh.hasWebsite ? 'hat jetzt eine Website' : 'geschlossen' },
        });
        continue;
      }
      const lead = await db.query.leads.findFirst({ where: eq(leads.id, r.lead_id) });
      // Das in der Branche am besten konvertierende Template (Lernsystem); ohne genug Daten: Rotation
      const templateId = lead
        ? await bestTemplateForBranch(lead.branch, lead.branchGroup, { exclude: current ? [current.templateId] : [] })
        : null;
      // Die ersten N Überarbeitungen prüft der Betreiber, danach automatisch (QA und Wahrheits-Check müssen bestehen)
      const manual = (await reviewedImprovements()) < cfg.review.letter3ManualFirstN;
      await enqueue(
        QUEUES.buildDemo,
        {
          leadId: r.lead_id,
          regenerate: true,
          triggeredBy: 'followup-hot',
          ...(templateId ? { templateId } : {}),
          ...(manual
            ? {
                reviewNote:
                  'Überarbeitung für Folgebrief 3 („Wir haben Ihre Website verbessert“) – bitte prüfen, ob die neue Version wirklich besser ist.',
              }
            : {}),
        },
        { singletonKey: `improve:${r.lead_id}` },
      );
      await audit(db, {
        entity: 'lead',
        entityId: r.lead_id,
        action: 'followup3_improve_demo',
        actor: 'job:followup',
        context: { hotAt: hotAt.toISOString(), templateId, manual, refreshed: refresh.refreshed },
      });
      out.improving++;
    }
  }

  out.reminders = await sendDemoReminders(now);
  out.queued = out.second + out.third;
  return out;
}

/** Anzahl der vom Betreiber geprüften Brief-3-Briefe (Schwelle für den Automatikbetrieb). */
export async function reviewedImprovements(): Promise<number> {
  const res = await getDb().execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM letters WHERE sequence = 3 AND is_test = false AND approved_at IS NOT NULL AND approved_by NOT LIKE 'job:%'`,
  );
  return res.rows[0]?.n ?? 0;
}

/** Signatur für den Abmeldelink (an der Support-Nachricht, ohne E-Mail-Adresse in der URL). */
export function unsubscribeSignature(messageId: string): string {
  return hmacSha256(getEnv().SESSION_SECRET, `unsubscribe:${messageId}`).slice(0, 32);
}

export function unsubscribeUrl(messageId: string): string {
  return appUrl(`/abmelden/${messageId}.${unsubscribeSignature(messageId)}`);
}

/**
 * Eine einzige Erinnerungs-Mail, 7 Tage vor Ablauf der Demo – nur an Leads, die uns selbst über das
 * Demo-Formular bzw. per E-Mail kontaktiert haben, nicht gekauft und sich nicht abgemeldet haben.
 */
async function sendDemoReminders(now: Date): Promise<number> {
  const db = getDb();
  const cfg = await getConfig();
  const soon = addDays(now, 7);
  const candidates = await db
    .select({ msg: supportMessages, demo: demos })
    .from(supportMessages)
    .innerJoin(leads, eq(leads.id, supportMessages.leadId))
    .innerJoin(demos, and(eq(demos.leadId, leads.id), eq(demos.status, 'published')))
    .where(
      and(
        eq(supportMessages.direction, 'in'),
        sql`${supportMessages.fromEmail} IS NOT NULL`,
        isNull(leads.anonymizedAt),
        sql`${leads.status} <> 'suppressed'`,
        sql`${demos.expiresAt} BETWEEN ${now} AND ${soon}`,
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
            .where(and(eq(outboundEmails.leadId, leads.id), eq(outboundEmails.kind, 'demo_reminder'))),
        ),
        // Opt-out-Nachrichten und Spam lösen nie eine Erinnerung aus
        sql`coalesce(${supportMessages.classification}, '') NOT IN ('opt_out', 'spam', 'beschwerde')`,
      ),
    )
    .orderBy(supportMessages.createdAt)
    .limit(100);
  const seen = new Set<string>();
  let sent = 0;
  for (const { msg, demo } of candidates) {
    if (!msg.leadId || seen.has(msg.leadId)) continue;
    seen.add(msg.leadId);
    if (await isEmailSuppressed(db, msg.fromEmail!)) continue;
    try {
      const unsub = unsubscribeUrl(msg.id);
      const mail = demoReminderEmail(cfg, {
        name: null,
        demoUrl: demoUrl(`/d/${demo.slug}`),
        expiresLabel: formatDateLongDe(demo.expiresAt!),
        unsubscribeUrl: unsub,
      });
      await sendTransactionalEmail({
        ...mail,
        kind: 'demo_reminder',
        idempotencyKey: `demo-reminder:${msg.leadId}`,
        to: msg.fromEmail!,
        leadId: msg.leadId,
        headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      });
      sent++;
    } catch (err) {
      logger.warn({ leadId: msg.leadId, ...errInfo(err) }, 'Erinnerungs-Mail nicht versendet');
    }
  }
  return sent;
}
