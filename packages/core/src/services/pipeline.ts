import { and, desc, eq, inArray, isNull, notExists, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig } from '../config/service';
import type { AppConfig } from '../config/settings';
import { getDb, type DbOrTx } from '../db/client';
import { demos, leads, letters } from '../db/schema';
import { enqueue, QUEUES } from '../queue';
import type { LeadStatus } from '../types';
import { budgetStatus } from './budget';
import { preferredCampaignTier } from '../leads/acquisition';

/** Leads, die bereits Budget „gebunden“ haben, aber noch keinen Brief verschickt haben. */
const IN_FLIGHT: LeadStatus[] = ['demo_built', 'demo_approved', 'demo_published', 'letter_generated', 'letter_approved'];

export interface PipelineTickResult {
  halted: boolean;
  capacity: number;
  inFlight: number;
  demosEnqueued: number;
  lettersEnqueued: number;
  sendTriggered: boolean;
  bySegment: Record<string, number>;
}

/**
 * Standard-Anteile: Hälfte Beauty, Hälfte Handwerk, darin gleichmäßig je Branche
 * (ergibt bei der ersten Charge 20/20). Optimizer/Dashboard können das überschreiben.
 */
export function segmentShares(cfg: AppConfig, segments: string[]): Record<string, number> {
  const configured = Object.fromEntries(Object.entries(cfg.budget.segmentShares).filter(([k]) => segments.includes(k)));
  const sum = Object.values(configured).reduce((a, b) => a + b, 0);
  if (sum > 0) return Object.fromEntries(segments.map((s) => [s, (configured[s] ?? 0) / sum]));
  const groups = new Map<string, string[]>();
  for (const s of segments) {
    const g = s.split(':')[1] ?? 'x';
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  const out: Record<string, number> = {};
  for (const [, segs] of groups) for (const s of segs) out[s] = 1 / groups.size / segs.length;
  return out;
}

/** Verteilt `n` Plätze nach Anteilen (größte Reste), begrenzt durch verfügbare Leads je Segment. */
export function allocate(n: number, shares: Record<string, number>, available: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  let remaining = n;
  const raw = Object.entries(shares).map(([s, share]) => ({ s, exact: n * share }));
  for (const r of raw) {
    const take = Math.min(Math.floor(r.exact), available[r.s] ?? 0);
    result[r.s] = take;
    remaining -= take;
  }
  // Reste nach größtem Nachkommaanteil, dann nach verfügbarem Vorrat verteilen
  const order = raw.sort((a, b) => b.exact - Math.floor(b.exact) - (a.exact - Math.floor(a.exact)));
  let progress = true;
  while (remaining > 0 && progress) {
    progress = false;
    for (const r of order) {
      if (remaining <= 0) break;
      if ((result[r.s] ?? 0) < (available[r.s] ?? 0)) {
        result[r.s] = (result[r.s] ?? 0) + 1;
        remaining--;
        progress = true;
      }
    }
  }
  return result;
}

async function countLettersEverSent(db: DbOrTx): Promise<number> {
  const r = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(letters)
    .where(and(inArray(letters.status, ['sent', 'delivered', 'queued']), eq(letters.isTest, false)));
  return r[0]?.n ?? 0;
}

/**
 * Idempotenter Takt (alle 5 Minuten):
 * 1. Kapazität für neue Demos aus Wochenbudget, erster Charge und laufenden Leads.
 * 2. Qualifizierte Leads je Segment (nach Score) zur Demo-Erstellung einreihen.
 * 3. Veröffentlichte Demos ohne Brief → Brief erzeugen.
 * 4. Mit AUTO_SEND: freigegebene Briefe versenden.
 */
export async function pipelineTick(): Promise<PipelineTickResult> {
  const db = getDb();
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  const result: PipelineTickResult = {
    halted: false,
    capacity: 0,
    inFlight: 0,
    demosEnqueued: 0,
    lettersEnqueued: 0,
    sendTriggered: false,
    bySegment: {},
  };
  if (sw.killSwitch) return { ...result, halted: true };

  // 1) Kapazität
  const inFlightRows = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leads)
    .where(inArray(leads.status, IN_FLIGHT));
  const inFlight = inFlightRows[0]?.n ?? 0;
  const letterBudget = await budgetStatus('letter', db);
  const perLetter = Math.max(1, cfg.costs.letterEstimateCents);
  const affordable = Math.floor((letterBudget.remainingCents ?? 0) / perLetter);
  const sentEver = await countLettersEverSent(db);
  const firstBatchCap = sentEver === 0 ? cfg.budget.firstBatchSize : Number.POSITIVE_INFINITY;
  const capacity = Math.max(0, Math.min(affordable, firstBatchCap) - inFlight);
  result.capacity = capacity;
  result.inFlight = inFlight;

  // 2) Demos einreihen
  if (capacity > 0) {
    const pool = await db
      .select({ id: leads.id, segment: leads.segmentKey, score: leads.score, branch: leads.branch })
      .from(leads)
      .where(
        and(
          eq(leads.status, 'qualified'),
          isNull(leads.anonymizedAt),
          notExists(
            db
              .select({ x: demos.id })
              .from(demos)
              .where(and(eq(demos.leadId, leads.id), inArray(demos.status, ['building', 'pending_review', 'approved']))),
          ),
        ),
      )
      .orderBy(desc(leads.score))
      .limit(2000);
    const bySeg = new Map<string, string[]>();
    const preferred =
      cfg.offers.activeVersion === 'v4' && cfg.targeting.acquisition.enabled
        ? preferredCampaignTier(pool, cfg.targeting.acquisition)
        : pool;
    // Existing budget, capacity and segment allocation remain; each tick starts with the best available tier.
    for (const l of preferred) bySeg.set(l.segment, [...(bySeg.get(l.segment) ?? []), l.id]);
    const segments = [...bySeg.keys()];
    if (segments.length) {
      const shares = segmentShares(cfg, segments);
      const available = Object.fromEntries(segments.map((s) => [s, bySeg.get(s)!.length]));
      const plan = allocate(capacity, shares, available);
      for (const [seg, n] of Object.entries(plan)) {
        for (const leadId of bySeg.get(seg)!.slice(0, n)) {
          await enqueue(QUEUES.buildDemo, { leadId, triggeredBy: 'pipeline' }, { singletonKey: `demo:${leadId}` });
          result.demosEnqueued++;
        }
        if (n) result.bySegment[seg] = n;
      }
    }
  }

  // 3) Briefe für veröffentlichte Demos
  const needLetter = await db
    .select({ id: leads.id })
    .from(leads)
    .where(
      and(
        eq(leads.status, 'demo_published'),
        notExists(
          db
            .select({ x: letters.id })
            .from(letters)
            .where(and(eq(letters.leadId, leads.id), eq(letters.sequence, 1))),
        ),
      ),
    )
    .limit(200);
  for (const l of needLetter) {
    await enqueue(
      QUEUES.generateLetter,
      { leadId: l.id, sequence: 1, triggeredBy: 'pipeline' },
      { singletonKey: `letter:${l.id}:1` },
    );
    result.lettersEnqueued++;
  }

  // 4) Automatischer Versand
  if (sw.autoSend && !sw.dryRun) {
    await enqueue(QUEUES.sendApprovedLetters, { triggeredBy: 'pipeline' }, { singletonKey: 'send-approved' });
    result.sendTriggered = true;
  }
  return result;
}
