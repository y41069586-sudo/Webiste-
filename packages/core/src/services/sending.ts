import { and, asc, eq, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { effectiveSwitches, getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { demos, leads, letters, webhookEvents } from '../db/schema';
import { logger } from '../logger';
import { getProviders } from '../providers';
import type { LetterWebhookEvent, ProviderLetterStatus } from '../providers/types';
import { addBusinessDays, addDays } from '../util/time';
import { audit } from './audit';
import { BudgetExceededError, KillSwitchError, raiseAlert, releaseReservation, reserveBudget, settleCost } from './budget';
import { extendDemoExpiry, extendDemoUntil } from './demo-review';
import { transitionLead } from './lead-state';

export class SendBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SendBlockedError';
  }
}

export type SendResult =
  | { state: 'sent'; providerLetterId: string; costCents: number }
  | { state: 'dry_run'; estimateCents: number }
  | { state: 'skipped'; reason: string };

/** Echte Briefe an Leads erst nach erfolgreichem Testbrief (Schalter im Dashboard). */
export function realLettersGate(providerName: string, isTest: boolean, unlocked: boolean): string | null {
  if (isTest) return null;
  const env = getEnv();
  const production = providerName === 'pingen' && env.PINGEN_ENV === 'production';
  if (production && !unlocked) return 'Echte Briefe an Leads sind noch gesperrt (erst Testbrief an dich, dann freischalten).';
  return null;
}

/**
 * Einen freigegebenen Brief versenden: Not-Aus, DRY_RUN, Freigabe-Sperre, Budget-Guard
 * (Reservierung zum Anbieterpreis), Versand mit Idempotency-Key = Brief-ID.
 */
export async function sendLetter(letterId: string, actor: string): Promise<SendResult> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  if (sw.killSwitch) throw new KillSwitchError();
  const letter = await db.query.letters.findFirst({ where: eq(letters.id, letterId) });
  if (!letter) return { state: 'skipped', reason: 'nicht gefunden' };
  if (letter.status !== 'approved') return { state: 'skipped', reason: `Status ${letter.status}` };
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, letter.leadId) });
  if (!lead || lead.anonymizedAt || lead.status === 'suppressed') {
    await db.update(letters).set({ status: 'cancelled', statusReason: 'Lead gesperrt/gelöscht' }).where(eq(letters.id, letterId));
    return { state: 'skipped', reason: 'Lead gesperrt' };
  }
  if (!letter.isTest) {
    const demo = letter.demoId ? await db.query.demos.findFirst({ where: eq(demos.id, letter.demoId) }) : null;
    if (!demo || demo.status !== 'published' || (demo.expiresAt && demo.expiresAt < addDays(new Date(), 7))) {
      await db
        .update(letters)
        .set({ status: 'cancelled', statusReason: 'Demo nicht (mehr lange genug) online' })
        .where(eq(letters.id, letterId));
      return { state: 'skipped', reason: 'Demo nicht verfügbar' };
    }
    // Das im Brief genannte „online bis …“ muss nach der Zustellung noch mindestens eine Woche gelten
    const delivery = addBusinessDays(new Date(), getEnv().DELIVERY_BUSINESS_DAYS);
    if (letter.statedExpiresAt && letter.statedExpiresAt < addDays(delivery, 7)) {
      await db
        .update(letters)
        .set({ status: 'failed', statusReason: 'Ablaufdatum im Brief liegt zu nah – bitte neu erzeugen' })
        .where(eq(letters.id, letterId));
      return { state: 'skipped', reason: 'Brief veraltet' };
    }
  }
  const provider = getProviders().mail;
  const gate = realLettersGate(provider.name, letter.isTest, sw.realLettersUnlocked);
  if (gate) throw new SendBlockedError(gate);

  const storage = getProviders().storage;
  const pdf = letter.pdfStorageKey ? await storage.get(letter.pdfStorageKey) : null;
  if (!pdf) throw new Error('Brief-PDF fehlt');
  const base = {
    color: cfg.letter.color,
    deliveryProduct: cfg.letter.deliveryProduct,
    addressPosition: cfg.letter.addressPosition,
    recipientCountry: 'DE',
    pages: letter.pageCount,
  };

  if (sw.dryRun) {
    await db.update(letters).set({ dryRun: true, updatedAt: new Date() }).where(eq(letters.id, letterId));
    logger.info({ letterId }, 'DRY_RUN: Brief würde jetzt versendet');
    return { state: 'dry_run', estimateCents: letter.estimatedCostCents ?? cfg.costs.letterEstimateCents };
  }

  const estimate =
    (await provider.estimateCost(pdf, base).catch(() => null)) ?? letter.estimatedCostCents ?? cfg.costs.letterEstimateCents;
  const reservationKey = `letter:${letterId}`;
  await reserveBudget(db, {
    category: 'letter',
    estimateCents: estimate,
    idempotencyKey: reservationKey,
    leadId: lead.id,
    ref: letterId,
  });

  try {
    const recipient = letter.isTest
      ? cfg.letter.testRecipient
      : {
          name: lead.businessName,
          street: lead.street ?? '',
          houseNumber: lead.houseNumber ?? '',
          postalCode: lead.postalCode ?? '',
          city: lead.city,
        };
    const res = await provider.send(pdf, {
      ...base,
      idempotencyKey: letterId,
      reference: `wbm-${letterId}`,
      recipient: {
        name: recipient.name,
        street: recipient.street,
        number: recipient.houseNumber,
        zip: recipient.postalCode,
        city: recipient.city,
        country: 'DE',
      },
      sender: {
        name: cfg.sender.company || cfg.sender.name,
        street: cfg.sender.street.replace(/\s+\S+$/, ''),
        number: cfg.sender.street.match(/(\S+)$/)?.[1] ?? '',
        zip: cfg.sender.postalCode,
        city: cfg.sender.city,
        country: 'DE',
      },
    });
    const cost = res.costCents ?? estimate;
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(letters)
        .set({
          status: res.status === 'sent' ? 'sent' : 'queued',
          provider: provider.name,
          providerLetterId: res.providerLetterId,
          costCents: cost,
          sentAt: res.status === 'sent' ? now : null,
          estimatedDeliveredAt: addBusinessDays(now, getEnv().DELIVERY_BUSINESS_DAYS),
          statusReason: null,
          updatedAt: now,
        })
        .where(eq(letters.id, letterId));
      if (res.costCents !== undefined) await settleCost(tx, reservationKey, res.costCents, { provider: provider.name });
      if (!letter.isTest) {
        await tx
          .update(leads)
          .set({ lettersSent: sql`${leads.lettersSent} + 1`, contactedAt: now, updatedAt: now })
          .where(eq(leads.id, lead.id));
        await transitionLead(tx, lead.id, letter.sequence >= 2 ? 'followup_sent' : 'letter_sent', { actor, soft: true });
        // Erstbrief: Demo-Laufzeit ab Versand; immer mindestens bis zum im Brief genannten Datum
        if (letter.sequence === 1) await extendDemoExpiry(tx, lead.id, now, letter.statedExpiresAt);
        else if (letter.statedExpiresAt) await extendDemoUntil(tx, lead.id, letter.statedExpiresAt);
      }
      await audit(tx, {
        entity: 'letter',
        entityId: letterId,
        action: 'send',
        actor,
        context: { provider: provider.name, providerLetterId: res.providerLetterId, cost },
      });
    });
    return { state: 'sent', providerLetterId: res.providerLetterId, costCents: cost };
  } catch (err) {
    await releaseReservation(db, reservationKey);
    await db
      .update(letters)
      .set({
        statusReason: `Versandfehler: ${err instanceof Error ? err.message.slice(0, 300) : String(err)}`,
        updatedAt: new Date(),
      })
      .where(eq(letters.id, letterId));
    throw err;
  }
}

/** Alle freigegebenen Briefe versenden (Testbriefe zuerst), stoppt beim Budget. */
export async function sendApprovedLetters(
  actor: string,
  limit = 500,
): Promise<{ sent: number; dryRun: number; skipped: number; stoppedBy?: string }> {
  const db = getDb();
  const rows = await db
    .select({ id: letters.id })
    .from(letters)
    .where(eq(letters.status, 'approved'))
    .orderBy(sql`${letters.isTest} DESC`, asc(letters.approvedAt))
    .limit(limit);
  const out = { sent: 0, dryRun: 0, skipped: 0 } as { sent: number; dryRun: number; skipped: number; stoppedBy?: string };
  for (const r of rows) {
    try {
      const res = await sendLetter(r.id, actor);
      if (res.state === 'sent') out.sent++;
      else if (res.state === 'dry_run') out.dryRun++;
      else out.skipped++;
    } catch (err) {
      if (err instanceof BudgetExceededError || err instanceof KillSwitchError || err instanceof SendBlockedError) {
        out.stoppedBy = err.name;
        if (err instanceof SendBlockedError) {
          await raiseAlert(db, { level: 'warn', code: 'send_blocked', message: err.message });
        }
        break;
      }
      logger.error({ letterId: r.id, err: err instanceof Error ? err.message : String(err) }, 'Versand fehlgeschlagen');
      out.skipped++;
    }
  }
  return out;
}

const RANK: Record<string, number> = { generated: 0, approved: 1, queued: 2, sent: 3, delivered: 4 };

/** Statuswechsel aus Webhook oder Abgleich anwenden (nur vorwärts, idempotent). */
export async function applyLetterStatus(
  db: DbOrTx,
  providerLetterId: string,
  status: ProviderLetterStatus,
  at: Date,
  actor: string,
  reason?: string,
  costCents?: number,
): Promise<boolean> {
  const letter = await db.query.letters.findFirst({ where: eq(letters.providerLetterId, providerLetterId) });
  if (!letter) return false;
  if (costCents !== undefined && letter.costCents !== costCents) {
    await db.update(letters).set({ costCents }).where(eq(letters.id, letter.id));
    await settleCost(db, `letter:${letter.id}`, costCents, { source: 'provider' });
  }
  if (status === 'failed' || status === 'cancelled') {
    if (['failed', 'cancelled', 'delivered'].includes(letter.status)) return false;
    await db
      .update(letters)
      .set({ status, statusReason: reason ?? status, updatedAt: new Date() })
      .where(eq(letters.id, letter.id));
    if (!letter.isTest && status === 'failed') {
      await transitionLead(db, letter.leadId, 'failed', { actor, reason: `Brief: ${reason ?? 'unzustellbar'}`, soft: true });
      await raiseAlert(db, {
        level: 'error',
        code: `letter_failed:${letter.id}`,
        message: `Brief fehlgeschlagen/unzustellbar: ${reason ?? ''}`,
        context: { letterId: letter.id },
      });
    }
    await audit(db, { entity: 'letter', entityId: letter.id, action: `status:${status}`, actor, context: { reason } });
    return true;
  }
  const target = status === 'delivered' ? 'delivered' : status === 'sent' ? 'sent' : null;
  if (!target || (RANK[letter.status] ?? -1) >= RANK[target]!) return false;
  await db
    .update(letters)
    .set({
      status: target,
      ...(target === 'sent' ? { sentAt: letter.sentAt ?? at } : {}),
      ...(target === 'delivered' ? { deliveredAt: at, sentAt: letter.sentAt ?? at } : {}),
      updatedAt: new Date(),
    })
    .where(eq(letters.id, letter.id));
  if (target === 'delivered' && letter.sequence === 1 && !letter.isTest) {
    await transitionLead(db, letter.leadId, 'letter_delivered', { actor, onlyForward: true });
  }
  await audit(db, { entity: 'letter', entityId: letter.id, action: `status:${target}`, actor });
  return true;
}

/** Webhook verarbeiten (Signatur geprüft vom Aufrufer). Replay-sicher über webhook_events. */
export async function processLetterWebhookEvents(events: LetterWebhookEvent[], provider: string): Promise<number> {
  const db = getDb();
  let applied = 0;
  for (const ev of events) {
    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(webhookEvents)
        .values({ provider, eventId: ev.eventId, type: ev.status })
        .onConflictDoNothing()
        .returning({ id: webhookEvents.eventId });
      if (!inserted.length) return; // bereits verarbeitet
      if (await applyLetterStatus(tx, ev.providerLetterId, ev.status, ev.occurredAt, `webhook:${provider}`, ev.reason)) applied++;
      await tx
        .update(webhookEvents)
        .set({ processedAt: new Date() })
        .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, ev.eventId)));
    });
  }
  return applied;
}

/**
 * Abgleich ohne Webhook: Status beim Anbieter abfragen; ohne Zustellmeldung gilt ein Brief
 * nach `assumeDeliveredAfterDays` als zugestellt (Standardbriefe haben keine Sendungsverfolgung).
 */
export async function syncLetterStatuses(actor = 'job:sync-letter-status'): Promise<{ checked: number; changed: number }> {
  const db = getDb();
  const cfg = await getConfig();
  const provider = getProviders().mail;
  const open = await db
    .select()
    .from(letters)
    .where(and(inArray(letters.status, ['queued', 'sent']), isNotNull(letters.providerLetterId)))
    .limit(500);
  let changed = 0;
  for (const l of open) {
    try {
      if (l.provider === provider.name) {
        const s = await provider.getStatus(l.providerLetterId!);
        if (await applyLetterStatus(db, l.providerLetterId!, s.status, new Date(), actor, undefined, s.costCents)) changed++;
      }
    } catch (err) {
      logger.warn({ letterId: l.id, err: err instanceof Error ? err.message : String(err) }, 'Statusabgleich fehlgeschlagen');
    }
  }
  const cutoff = addDays(new Date(), -cfg.timing.assumeDeliveredAfterDays);
  const assume = await db
    .select()
    .from(letters)
    .where(and(eq(letters.status, 'sent'), lt(letters.sentAt, cutoff), isNotNull(letters.providerLetterId)));
  for (const l of assume) {
    if (
      await applyLetterStatus(
        db,
        l.providerLetterId!,
        'delivered',
        addDays(l.sentAt!, cfg.timing.assumeDeliveredAfterDays),
        `${actor}:angenommen`,
      )
    )
      changed++;
  }
  return { checked: open.length + assume.length, changed };
}

export { scheduleFollowups } from './followups';
