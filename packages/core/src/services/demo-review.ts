import { assessDemoQuality, type ManualQualityScores } from '../quality/demo';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { demos, leads } from '../db/schema';
import { enqueue, QUEUES } from '../queue';
import { addDays } from '../util/time';
import { audit } from './audit';
import { transitionLead } from './lead-state';
import { leadResearch } from './lead-research';
import { assessAcquisition } from '../leads/acquisition';
import { saveOperatorWish } from '../demos/operator-wish';

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
  opts: {
    manual: boolean;
    note?: string;
    /** Du hast die technischen Befunde selbst angesehen und gibst trotzdem frei (wird protokolliert) */
    acceptTechnical?: boolean;
    review?: {
      letterFacts?: import('../letters/personalization').VerifiedLetterContext['details'];
      facts: boolean;
      desktop: boolean;
      mobile: boolean;
      images: boolean;
      text: boolean;
      qualityScores?: ManualQualityScores;
    };
  } = { manual: true },
): Promise<void> {
  const db = getDb();
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM demos WHERE id=${demoId} FOR UPDATE`);
    const demo = await tx.query.demos.findFirst({ where: eq(demos.id, demoId) });
    if (!demo) throw new Error('Demo nicht gefunden');
    if (!['pending_review', 'qa_failed'].includes(demo.status)) {
      throw new Error(`Demo im Status ${demo.status} kann nicht freigegeben werden`);
    }
    // 08.11.2026 (Betreiber): technische Befunde dürfen die Freigabe nicht blockieren, wenn du sie selbst gesehen
    // hast. Die Befunde bleiben sichtbar und werden im Protokoll festgehalten.
    const failedTech = (demo.qaResultJson?.checks ?? []).filter((c) => !c.passed).map((c) => c.name);
    if (!demo.qaResultJson) throw new Error('Demo ohne technisches Prüfergebnis; bitte zuerst prüfen.');
    if (!opts.acceptTechnical && (!demo.qaResultJson?.passed || failedTech.length))
      throw new Error('Technische QA nicht bestanden; Befunde beheben und erneut prüfen.');
    if (!opts.manual && (demo.contentJson?._meta as { designRequiresReview?: boolean } | undefined)?.designRequiresReview)
      throw new Error('Neuer Gestaltungskontext benötigt eine individuelle visuelle Freigabe.');
    if (!opts.manual && (await requiresManualReview(tx)))
      throw new Error('Manuelle Demo-Prüfung erforderlich; erste 30 und Stichproben bleiben geschützt.');
    if (
      opts.manual &&
      (!opts.review ||
        !['facts', 'desktop', 'mobile', 'images', 'text'].every((k) => opts.review![k as keyof typeof opts.review] === true))
    )
      throw new Error('Fakten, Desktop, Mobil, Bilder und Text müssen tatsächlich manuell geprüft werden.');
    const quality = demo.qaResultJson.quality
      ? assessDemoQuality(
          // Bestätigte Freigabe trotz Technik-Befunden: die Befunde zählen dann nicht mehr gegen die Bewertung
          opts.acceptTechnical ? demo.qaResultJson.checks.map(() => ({ passed: true })) : demo.qaResultJson.checks,
          opts.review?.qualityScores ??
            (!opts.manual && demo.qaResultJson.quality?.passed
              ? Object.fromEntries(
                  demo.qaResultJson.quality.dimensions.filter((d) => d.key !== 'technical').map((d) => [d.key, d.score]),
                )
              : undefined),
          (await getConfig({ db: tx })).review.qualityMinimum,
        )
      : undefined;
    if (quality && !quality.passed)
      throw new Error('Qualitätsbewertung unvollständig oder unter Mindestniveau; manuelle Überarbeitung erforderlich.');
    if (opts.manual && opts.review?.facts) {
      const lead = await tx.query.leads.findFirst({ where: eq(leads.id, demo.leadId) });
      if (lead?.scoreReasons?.some((r) => r.criterion === 'suitability')) {
        const cfg = await getConfig({ db: tx });
        const researched = await leadResearch(lead, tx);
        const acquisition =
          cfg.offers.activeVersion === 'v4' && cfg.targeting.acquisition.enabled
            ? assessAcquisition(lead, researched, cfg.targeting.acquisition)
            : null;
        const reasons =
          acquisition?.reasons ??
          lead.scoreReasons
            .filter((r) => r.criterion !== 'suitability')
            .map((r) =>
              r.criterion === 'demo_suitability'
                ? { ...r, points: 10, verified: true, detail: 'Demo technisch und gestalterisch einzeln geprüft' }
                : r,
            );
        const score = Math.max(
          0,
          Math.min(
            100,
            reasons.reduce((sum, r) => sum + r.points, 0),
          ),
        );
        if (!acquisition)
          reasons.push({
            criterion: 'suitability',
            points: 0,
            verified: true,
            detail:
              score >= cfg.leadScoring.goodMin
                ? 'Gute Eignung; weiterhin keine Versandfreigabe'
                : score >= cfg.leadScoring.reviewMin
                  ? 'Manuelle Prüfung notwendig'
                  : 'Nicht geeignet nach aktuellem Prüfstand',
          });
        await tx.update(leads).set({ score, scoreReasons: reasons, updatedAt: new Date() }).where(eq(leads.id, lead.id));
      }
    }
    await tx
      .update(demos)
      .set({
        status: 'approved',
        approvedBy: actor,
        approvedAt: new Date(),
        reviewNote: opts.note ?? null,
        qaResultJson: {
          ...demo.qaResultJson,
          ...(quality ? { quality: { ...quality, htmlHash: demo.qaResultJson.quality?.htmlHash } } : {}),
          ...(opts.manual ? { review: { ...opts.review!, actor, at: new Date().toISOString() } } : {}),
        },
        updatedAt: new Date(),
      })
      .where(eq(demos.id, demoId));
    // Testläufe (erfundene Betriebe) zählen nicht zu den ersten 30 Pflichtprüfungen
    const source = (await tx.query.leads.findFirst({ where: eq(leads.id, demo.leadId), columns: { source: true } }))?.source;
    if (opts.manual && source !== 'mock')
      await tx.execute(sql`UPDATE counters SET value = value + 1 WHERE name = 'demos_reviewed'`);
    await transitionLead(tx, demo.leadId, 'demo_approved', { actor, soft: true });
    await audit(tx, {
      entity: 'demo',
      entityId: demoId,
      action: opts.manual ? 'approve' : 'auto_approve',
      actor,
      context: {
        note: opts.note,
        ...(opts.acceptTechnical && failedTech.length ? { technischeBefunde: failedTech, bewusstFreigegeben: true } : {}),
      },
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
    // Wunschtext geht wirklich in den Neubau (vorher nur gespeichert, der Neubau lief ohne ihn)
    if (regenerate && note.trim() && note.trim() !== 'abgelehnt')
      await saveOperatorWish(
        demo.leadId,
        {
          note,
          previousConcept: ((demo.contentJson as { design?: { concept?: string } } | null)?.design?.concept ?? '').slice(0, 400),
          demoId,
          at: new Date().toISOString(),
        },
        actor,
        tx,
      );
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
  // Brief nicht erst beim nächsten 5-Minuten-Takt anlegen: Takt sofort anstoßen (er prüft Not-Aus und Budget selbst)
  await enqueue(QUEUES.pipelineTick, {}, { singletonKey: 'pipeline-tick-now' }).catch(() => undefined);
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

/**
 * Ablauf verlängern (nie verkürzen): nach dem Versand um die Demo-Laufzeit ab `from`, bzw. mindestens
 * bis `until` (z. B. das im Brief genannte Datum „online bis …“).
 */
export async function extendDemoExpiry(db: DbOrTx, leadId: string, from: Date, until?: Date | null): Promise<void> {
  const cfg = await getConfig({ db });
  const byDays = addDays(from, cfg.timing.demoExpiryDays);
  const target = until && until > byDays ? until : byDays;
  await extendDemoUntil(db, leadId, target);
}

export async function extendDemoUntil(db: DbOrTx, leadId: string, until: Date): Promise<void> {
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
  await db
    .update(leads)
    .set({ expiresAt: until })
    .where(and(eq(leads.id, leadId), sql`(${leads.expiresAt} IS NULL OR ${leads.expiresAt} < ${until})`));
}
