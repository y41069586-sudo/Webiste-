import { and, eq, inArray, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { demos, leads } from '../db/schema';
import { enqueue, QUEUES } from '../queue';
import { addDays } from '../util/time';
import { audit } from './audit';
import { transitionLead } from './lead-state';

/** Anzahl manuell geprüfter Demos (für die Regel „erste N manuell“). */
export async function manuallyReviewedCount(db: DbOrTx): Promise<number> {
  const r = await db.execute<{ value: number }>(sql`SELECT value FROM counters WHERE name = 'demos_reviewed'`);
  return Number(r.rows[0]?.value ?? 0);
}

/**
 * Review-Pflicht: Die ersten N Demos (Standard 30) brauchen immer eine manuelle Freigabe.
 * Danach – nur mit AUTO_APPROVE_DEMOS – eine zufällige Stichprobe (Standard 10 %).
 */
export async function requiresManualReview(db: DbOrTx, random = Math.random()): Promise<boolean> {
  const cfg = await getConfig({ db });
  const sw = effectiveSwitches(cfg);
  if (!sw.autoApproveDemos) return true;
  const reviewed = await manuallyReviewedCount(db);
  if (reviewed < cfg.review.manualReviewFirstN) return true;
  return random < cfg.review.sampleRatePercent / 100;
}

export async function approveDemo(
  demoId: string,
  actor: string,
  opts: { manual: boolean; note?: string } = { manual: true },
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    const demo = await tx.query.demos.findFirst({ where: eq(demos.id, demoId) });
    if (!demo) throw new Error('Demo nicht gefunden');
    if (!['pending_review', 'qa_failed'].includes(demo.status)) {
      throw new Error(`Demo im Status ${demo.status} kann nicht freigegeben werden`);
    }
    if (demo.status === 'qa_failed' && !opts.manual) throw new Error('QA nicht bestanden');
    await tx
      .update(demos)
      .set({
        status: 'approved',
        approvedBy: actor,
        approvedAt: new Date(),
        reviewNote: opts.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(demos.id, demoId));
    if (opts.manual) await tx.execute(sql`UPDATE counters SET value = value + 1 WHERE name = 'demos_reviewed'`);
    await transitionLead(tx, demo.leadId, 'demo_approved', { actor, soft: true });
    await audit(tx, {
      entity: 'demo',
      entityId: demoId,
      action: opts.manual ? 'approve' : 'auto_approve',
      actor,
      context: { note: opts.note },
    });
  });
  await enqueue(QUEUES.publishDemo, { demoId }, { singletonKey: `publish:${demoId}` });
}

/** Ablehnen; optional neu generieren (neue Demo mit anderem Template/Text). */
export async function rejectDemo(demoId: string, actor: string, note: string, regenerate: boolean): Promise<void> {
  const db = getDb();
  let leadId = '';
  await db.transaction(async (tx) => {
    const demo = await tx.query.demos.findFirst({ where: eq(demos.id, demoId) });
    if (!demo) throw new Error('Demo nicht gefunden');
    leadId = demo.leadId;
    await tx.update(demos).set({ status: 'rejected', reviewNote: note, updatedAt: new Date() }).where(eq(demos.id, demoId));
    await tx.execute(sql`UPDATE counters SET value = value + 1 WHERE name = 'demos_reviewed'`);
    await transitionLead(tx, demo.leadId, regenerate ? 'qualified' : 'rejected', {
      actor,
      reason: regenerate ? 'Demo neu generieren' : `Demo abgelehnt: ${note}`,
      soft: true,
    });
    await audit(tx, {
      entity: 'demo',
      entityId: demoId,
      action: regenerate ? 'reject_regenerate' : 'reject',
      actor,
      context: { note },
    });
  });
  if (regenerate)
    await enqueue(QUEUES.buildDemo, { leadId, regenerate: true, triggeredBy: actor }, { singletonKey: `demo:${leadId}` });
}

/** Veröffentlichen: Demo unter /d/{slug} erreichbar, Ablaufdatum setzen. */
export async function publishDemo(demoId: string, actor: string, now = new Date()): Promise<void> {
  const db = getDb();
  const cfg = await getConfig();
  await db.transaction(async (tx) => {
    const demo = await tx.query.demos.findFirst({ where: eq(demos.id, demoId) });
    if (!demo) throw new Error('Demo nicht gefunden');
    if (demo.status === 'published') return;
    if (demo.status !== 'approved') throw new Error(`Demo im Status ${demo.status} kann nicht veröffentlicht werden`);
    await tx
      .update(demos)
      .set({ status: 'published', publishedAt: now, expiresAt: addDays(now, cfg.timing.demoExpiryDays), updatedAt: now })
      .where(eq(demos.id, demoId));
    // ältere, noch nicht veröffentlichte Demos desselben Leads verwerfen
    await tx
      .update(demos)
      .set({ status: 'rejected', reviewNote: 'ersetzt' })
      .where(
        and(
          eq(demos.leadId, demo.leadId),
          inArray(demos.status, ['pending_review', 'qa_failed', 'building']),
          sql`${demos.id} <> ${demoId}`,
        ),
      );
    await transitionLead(tx, demo.leadId, 'demo_published', {
      actor,
      soft: true,
      patch: { expiresAt: addDays(now, cfg.timing.demoExpiryDays) },
    });
    await audit(tx, { entity: 'demo', entityId: demoId, action: 'publish', actor });
  });
}

/** Aktuell veröffentlichte Demo eines Leads. */
export async function currentDemoForLead(db: DbOrTx, leadId: string) {
  const rows = await db
    .select()
    .from(demos)
    .where(and(eq(demos.leadId, leadId), eq(demos.status, 'published')))
    .orderBy(sql`${demos.publishedAt} DESC`)
    .limit(1);
  return rows[0] ?? null;
}

/** Ablauf verlängern, sobald der Brief tatsächlich versendet wurde (Versprechen im Brief). */
export async function extendDemoExpiry(db: DbOrTx, leadId: string, from: Date): Promise<void> {
  const cfg = await getConfig({ db });
  const until = addDays(from, cfg.timing.demoExpiryDays);
  await db
    .update(demos)
    .set({ expiresAt: until })
    .where(
      and(
        eq(demos.leadId, leadId),
        eq(demos.status, 'published'),
        sql`(${demos.expiresAt} IS NULL OR ${demos.expiresAt} < ${until})`,
      ),
    );
  await db.update(leads).set({ expiresAt: until }).where(eq(leads.id, leadId));
}
