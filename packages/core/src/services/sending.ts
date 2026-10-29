import { assertLetterLeadEligible } from '../letters/eligibility';
import { assertLetterBinding } from '../letters/binding';
import { and, asc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
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
import { currentDemoForLead, extendDemoExpiry, extendDemoUntil } from './demo-review';
import { GoLiveBlockedError, letterBlockers } from './readiness';
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
/** Mindestzahl erfolgreicher Testaufträge im Testmodus des Briefdienstes vor dem ersten echten Brief (B5.2) */
export const LXP_REQUIRED_TEST_JOBS = 3;

/** Briefdienste mit Testmodus (kein Druck) und Zähler der dort übertragenen Testaufträge */
const TEST_JOB_COUNTERS: Record<string, { counter: string; label: string; setup: string }> = {
  easynova: { counter: 'easynova_test_jobs', label: 'easyNova', setup: 'MAIL_PROVIDER=easynova und EASYNOVA_MODE=test' },
  letterxpress: { counter: 'lxp_test_jobs', label: 'LetterXpress', setup: 'MAIL_PROVIDER=letterxpress und LXP_MODE=test' },
};

/**
 * Freigabe-Reihenfolge für echte Briefe: (easyNova/LetterXpress) 3 Testaufträge im Testmodus → 1 echter
 * Testbrief an den Betreiber → erst nach Freischaltung echte Leads.
 */
export function realLettersGate(
  providerName: string,
  isTest: boolean,
  unlocked: boolean,
  providerMode?: 'test' | 'live',
  lxpTestJobs = 0,
): string | null {
  const env = getEnv();
  const testJobProvider = TEST_JOB_COUNTERS[providerName];
  const testJobLive = Boolean(testJobProvider) && providerMode === 'live';
  const production = (providerName === 'pingen' && env.PINGEN_ENV === 'production') || testJobLive;
  if (testJobLive && lxpTestJobs < LXP_REQUIRED_TEST_JOBS) {
    return `Erst ${LXP_REQUIRED_TEST_JOBS} Testaufträge im ${testJobProvider!.label}-Testmodus prüfen (bisher ${lxpTestJobs}).`;
  }
  if (isTest) return null;
  if (production && !unlocked) return 'Echte Briefe an Leads sind noch gesperrt (erst Testbrief an dich, dann freischalten).';
  return null;
}

export async function lxpTestJobCount(db: DbOrTx = getDb()): Promise<number> {
  return providerTestJobCount('letterxpress', db);
}

/** Bisher übertragene Testaufträge beim jeweiligen Briefdienst (0 für Dienste ohne Testmodus). */
export async function providerTestJobCount(providerName: string, db: DbOrTx = getDb()): Promise<number> {
  const t = TEST_JOB_COUNTERS[providerName];
  if (!t) return 0;
  const r = await db.execute<{ value: number }>(sql`SELECT value FROM counters WHERE name = ${t.counter}`);
  return Number(r.rows[0]?.value ?? 0);
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
  // Sicherheitsnetz „unzustellbar“ (B6.7): Versand an Leads pausiert, Testbriefe an den Betreiber bleiben möglich
  if (sw.sendingPaused && !letter.isTest) {
    throw new SendBlockedError('Versand pausiert (Sicherheitsnetz) – Lead-Qualität prüfen und unter Einstellungen freigeben.');
  }
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, letter.leadId) });
  if (!lead || lead.anonymizedAt || lead.status === 'suppressed') {
    await db.update(letters).set({ status: 'cancelled', statusReason: 'Lead gesperrt/gelöscht' }).where(eq(letters.id, letterId));
    return { state: 'skipped', reason: 'Lead gesperrt' };
  }
  try {
    await assertLetterLeadEligible(db, lead, cfg, { testLetter: letter.isTest });
    await assertLetterBinding(db, letter, lead, cfg);
  } catch (error) {
    await db
      .update(letters)
      .set({ status: 'cancelled', statusReason: error instanceof Error ? error.message : 'Briefzuordnung nicht bestanden' })
      .where(eq(letters.id, letterId));
    return { state: 'skipped', reason: 'Sperrliste, Eignung oder Briefzuordnung geändert' };
  }
  // Wahrheits-Check (B5.4): kein Versand ohne passed; verwendete Claims müssen noch gültig sein
  if ((letter.truthCheckJson as { passed?: boolean } | null)?.passed !== true) {
    await db
      .update(letters)
      .set({ status: 'failed', statusReason: 'Wahrheits-Check fehlt oder nicht bestanden – bitte neu erzeugen' })
      .where(eq(letters.id, letterId));
    return { state: 'skipped', reason: 'Wahrheits-Check' };
  }
  const staleClaims = await db.execute<{ claim_id: string }>(
    sql`SELECT u.claim_id FROM claim_usages u JOIN claims c ON c.id = u.claim_id
        WHERE u.letter_id = ${letterId} AND (c.status <> 'approved' OR c.expires_at <= now())`,
  );
  if (staleClaims.rows.length) {
    await db
      .update(letters)
      .set({
        status: 'failed',
        statusReason: `Claim inzwischen gesperrt/abgelaufen (${staleClaims.rows.map((r) => r.claim_id).join(', ')}) – bitte neu erzeugen`,
      })
      .where(eq(letters.id, letterId));
    return { state: 'skipped', reason: 'Claim gesperrt' };
  }
  if (!letter.isTest) {
    const currentDemo = await currentDemoForLead(db, letter.leadId);
    const demo = letter.demoId ? await db.query.demos.findFirst({ where: eq(demos.id, letter.demoId) }) : null;
    if (
      !demo ||
      currentDemo?.id !== demo.id ||
      demo.qaResultJson?.passed === false ||
      demo.qaResultJson?.quality?.passed === false ||
      demo.status !== 'published' ||
      (demo.expiresAt && demo.expiresAt < addDays(new Date(), 7))
    ) {
      await db
        .update(letters)
        .set({
          status: 'cancelled',
          statusReason: 'Demo ersetzt, Qualitätsprüfung offen/fehlgeschlagen oder nicht mehr lange genug online',
        })
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
  const gate = realLettersGate(
    provider.name,
    letter.isTest,
    sw.realLettersUnlocked,
    provider.mode,
    await providerTestJobCount(provider.name, db),
  );
  if (gate) throw new SendBlockedError(gate);
  // Echte Briefe an Leads erst, wenn Absenderdaten, Impressum und Datenschutz vollständig sind (Verkauf separat gesperrt)
  if (!letter.isTest && !sw.dryRun) {
    const blockers = letterBlockers(cfg);
    if (blockers.length) throw new SendBlockedError(new GoLiveBlockedError(blockers).message);
  }

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
  // Guthaben-Wächter (B5.2): vor der Charge prüfen, ob das Guthaben beim Briefdienst reicht
  const cfg = await getConfig({ fresh: true });
  if (rows.length && !effectiveSwitches(cfg).dryRun) {
    const guard = await balanceGuard(
      db,
      rows.map((r) => r.id),
    );
    if (guard) {
      await raiseAlert(db, { level: 'error', code: 'mail_balance_low', message: guard.message, context: guard.context });
      return { ...out, stoppedBy: 'BalanceTooLow' };
    }
  }
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

/** Reicht das Guthaben für die geschätzten Kosten der Briefe? null = ja oder Anbieter ohne Guthabenabfrage. */
export async function balanceGuard(
  db: DbOrTx,
  letterIds: string[],
): Promise<{ message: string; context: Record<string, unknown> } | null> {
  const provider = getProviders().mail;
  if (!provider.getBalance) return null;
  const cfg = await getConfig();
  const rows = await db.select({ cents: letters.estimatedCostCents }).from(letters).where(inArray(letters.id, letterIds));
  const needed = rows.reduce((s, r) => s + (r.cents ?? cfg.costs.letterEstimateCents), 0);
  const { balanceCents } = await provider.getBalance();
  if (balanceCents >= needed) return null;
  return {
    message: `Guthaben beim Briefdienst reicht nicht: ${(balanceCents / 100).toFixed(2)} € verfügbar, ${(needed / 100).toFixed(2)} € nötig. Versand gestoppt – bitte aufladen.`,
    context: { balanceCents, neededCents: needed, letters: letterIds.length },
  };
}

/**
 * Testauftrag im Testmodus des Briefdienstes (B5.2): easyNova prüft die Sendung vollständig (testFlag, kein Druck,
 * keine Zustellung), LetterXpress legt sie in die Postbox (kein Druck, nach 7 Tagen gelöscht). Erlaubt auch bei
 * DRY_RUN, weil im Testmodus nichts versendet wird. Ändert den Brief nicht; zählt für die Freigabe (3 Testaufträge).
 */
export const submitLxpTestJob = submitProviderTestJob;

export async function submitProviderTestJob(
  letterId: string,
  actor: string,
): Promise<{ jobId: string; status: string; count: number }> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  if (effectiveSwitches(cfg).killSwitch) throw new KillSwitchError();
  const provider = getProviders().mail;
  const t = TEST_JOB_COUNTERS[provider.name];
  if (!t || provider.mode !== 'test') {
    throw new SendBlockedError(
      `Testaufträge nur mit ${Object.values(TEST_JOB_COUNTERS)
        .map((c) => c.setup)
        .join(' oder ')}.`,
    );
  }
  const letter = await db.query.letters.findFirst({ where: eq(letters.id, letterId) });
  if (!letter?.pdfStorageKey) throw new Error('Brief oder PDF nicht gefunden');
  // Aufträge in der Postbox lassen sich beim Anbieter von Hand absenden – daher auch hier nur geprüfte Briefe
  if ((letter.truthCheckJson as { passed?: boolean } | null)?.passed !== true) {
    throw new SendBlockedError('Nur Briefe mit bestandenem Wahrheits-Check.');
  }
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, letter.leadId) });
  if (!lead) throw new SendBlockedError('Betrieb nicht vorhanden.');
  await assertLetterLeadEligible(db, lead, cfg, { testLetter: letter.isTest });
  await assertLetterBinding(db, letter, lead, cfg);
  const pdf = await getProviders().storage.get(letter.pdfStorageKey);
  if (!pdf) throw new Error('Brief-PDF fehlt');
  const count = (await providerTestJobCount(provider.name, db)) + 1;
  const res = await provider.send(pdf, {
    color: cfg.letter.color,
    deliveryProduct: cfg.letter.deliveryProduct,
    addressPosition: cfg.letter.addressPosition,
    recipientCountry: 'DE',
    pages: letter.pageCount,
    idempotencyKey: `${provider.name === 'letterxpress' ? 'lxp' : provider.name}-test-${letterId}-${count}`,
    reference: `wbm-test-${letterId}-${count}`,
  });
  await db.execute(
    sql`INSERT INTO counters (name, value) VALUES (${t.counter}, 1) ON CONFLICT (name) DO UPDATE SET value = counters.value + 1`,
  );
  await audit(db, {
    entity: 'letter',
    entityId: letterId,
    action: provider.name === 'letterxpress' ? 'lxp_test_job' : `${provider.name}_test_job`,
    actor,
    context: { jobId: res.providerLetterId, status: res.status, costCents: res.costCents ?? null, count },
  });
  return { jobId: res.providerLetterId, status: res.status, count };
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
  // Geschätzte Zustellung ab dem tatsächlichen Druck/Versand (Briefdienste ohne Zustellbestätigung)
  const sentAt = letter.status === 'sent' ? (letter.sentAt ?? at) : at;
  await db
    .update(letters)
    .set({
      status: target,
      ...(target === 'sent' ? { sentAt, estimatedDeliveredAt: addBusinessDays(sentAt, getEnv().DELIVERY_BUSINESS_DAYS) } : {}),
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
 * bleibt die Zustellung unbekannt (Standardbriefe haben keine Sendungsverfolgung).
 */
export async function syncLetterStatuses(actor = 'job:sync-letter-status'): Promise<{ checked: number; changed: number }> {
  const db = getDb();
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
  // An elapsed delivery estimate is not a provider confirmation. Keep status sent
  // and estimatedDeliveredAt separately; no fabricated delivery or follow-up trigger.
  return { checked: open.length, changed };
}

export { scheduleFollowups } from './followups';

export interface MailProviderOverview {
  provider: string;
  mode: 'test' | 'live' | null;
  balanceCents: number | null;
  balanceError: string | null;
  openJobs: number;
  avgCostCents: number | null;
  /** Testaufträge beim aktiven Briefdienst (easyNova oder LetterXpress; Feldname historisch) */
  lxpTestJobs: number;
  requiredTestJobs: number;
}

/** Überblick für das Dashboard (B8): Guthaben, offene Aufträge, Kosten pro Brief, Testaufträge. */
export async function mailProviderOverview(): Promise<MailProviderOverview> {
  const db = getDb();
  const provider = getProviders().mail;
  let balanceCents: number | null = null;
  let balanceError: string | null = null;
  if (provider.getBalance) {
    try {
      balanceCents = (await provider.getBalance()).balanceCents;
    } catch (err) {
      balanceError = err instanceof Error ? err.message : String(err);
    }
  }
  const stats = await db.execute<{ open: number; avg: number | null }>(sql`
    SELECT count(*) FILTER (WHERE status = 'queued')::int AS open,
           avg(cost_cents) FILTER (WHERE status IN ('sent', 'delivered') AND NOT is_test AND cost_cents IS NOT NULL
                                   AND sent_at > now() - interval '60 days') AS avg
    FROM letters`);
  const s = stats.rows[0];
  return {
    provider: provider.name,
    mode: provider.mode ?? null,
    balanceCents,
    balanceError,
    openJobs: Number(s?.open ?? 0),
    avgCostCents: s?.avg !== null && s?.avg !== undefined ? Math.round(Number(s.avg)) : null,
    lxpTestJobs: await providerTestJobCount(provider.name, db),
    requiredTestJobs: LXP_REQUIRED_TEST_JOBS,
  };
}
