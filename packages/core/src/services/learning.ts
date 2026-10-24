import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm';
import { appUrl, getEnv, trackUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { experiments, letters, safetyActions, variants, weeklyReports } from '../db/schema';
import { renderEmail } from '../emails/templates';
import { usableClaims } from '../claims/library';
import {
  applyProposal,
  AUTO_ACTIVATE_SLOTS,
  LEARNING_SCHEMA,
  LEARNING_SYSTEM,
  LEARNING_TOOL,
  MAX_ACTIVE_PER_INDUSTRY,
  MAX_HYPOTHESES,
  MAX_PROPOSALS_PER_INDUSTRY,
  proposalViolations,
  SLOT_LABEL,
  type LearningAnswer,
  type ProposalSlot,
} from '../learning/agent';
import type { LetterSlots } from '../letters/slots';
import type { TruthCheckResult } from '../letters/truth-check';
import { errInfo, logger } from '../logger';
import { getPlaybook } from '../playbooks';
import { getProviders } from '../providers';
import { renderLetterPreview } from '../render/letter-preview';
import { betaInterval, VERDICT_LABEL, type RateInterval } from '../stats/bayes';
import type { IndustryEvaluation } from '../stats/model';
import { INDUSTRIES, OBJECTION_LABEL, type Industry, type ObjectionCategory } from '../types';
import { addDays, formatDateDe, startOfIsoWeek } from '../util/time';
import { evaluateIndustries } from './arms';
import { audit } from './audit';
import { sendTransactionalEmail } from './email';
import { funnelRows, refreshFunnel, type FunnelRow } from './funnel';
import { llmStructured } from './llm';
import { objectionStats } from './objections';
import { runTruthCheck } from './truth-check';

/**
 * Lern-Agent (Update 2, B6.5) – sonntags nach dem Optimizer:
 *  1. Datenexport ohne personenbezogene Daten (Kennzahlen, Spannen, Einwand-Kategorien, Logbuch)
 *  2. Aufräumen: Varianten mit P ≥ 95 % schlechter als die Kontrolle (bei genug Briefen) pausieren
 *  3. Bericht, Hypothesen und Vorschläge vom Sprachmodell (MODEL_CREATIVE)
 *  4. Vorschläge streng prüfen (Ein-Slot-Regel, Claims, Platzhalter, Wahrheits-Check) → Review-Queue;
 *     ohne Freigabe nur mit AUTO_ACTIVATE_VARIANTS und nur Betreff, Nutzen-Satz oder QR-Text
 *  5. Bericht speichern (Tabelle, `reports/woche-{KW}.md`), Logbuch exportieren, Mail an den Betreiber
 */

export function isoWeekLabel(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-KW${String(week).padStart(2, '0')}`;
}

type VariantRow = typeof variants.$inferSelect;

const round = (v: number, d = 4) => Number(v.toFixed(d));
const spanOf = (i: RateInterval) => [round(i.lo), round(i.hi)] as [number, number];

export interface ExportIndustry {
  industry: string;
  signal: string;
  equal_split: boolean;
  pooled: { scan_span: [number, number]; purchase_span: [number, number] };
  arms: {
    variant_id: string;
    name: string;
    is_control: boolean;
    eligible: boolean;
    delivered: number;
    scans: number;
    scan_span: [number, number];
    evaluated: number;
    purchases: number;
    purchase_span: [number, number];
    p_better_than_control: number | null;
    verdict: string;
    share_next: number;
  }[];
  funnel: Pick<
    FunnelRow,
    | 'letters'
    | 'delivered'
    | 'scans'
    | 'demo_views'
    | 'engaged'
    | 'cta_clicks'
    | 'whatsapp'
    | 'questions'
    | 'checkouts'
    | 'purchases'
    | 'opt_outs'
    | 'complaints'
  >;
  week_compare: {
    this_week: { delivered: number; scans: number; scan_span: [number, number] };
    last_week: { delivered: number; scans: number; scan_span: [number, number] };
    overlap: boolean;
  };
  objections: { category: ObjectionCategory; count: number }[];
  variants: {
    id: string;
    name: string;
    status: string;
    created_by: string;
    parent_variant_id: string | null;
    changed_slot: string | null;
    hypothesis: string | null;
    slots: LetterSlots | null;
  }[];
  claims: { id: string; text: string }[];
  active_count: number;
}

export interface LearningExport {
  week: string;
  generated_at: string;
  industries: ExportIndustry[];
  experiments: {
    industry: string | null;
    hypothesis: string;
    changed_slot: string | null;
    decision: string;
    started_at: string | null;
    ended_at: string | null;
    result: Record<string, unknown>;
  }[];
  safety_actions: { kind: string; action: string; at: string }[];
  rules: {
    max_proposals_per_industry: number;
    max_hypotheses: number;
    max_active_per_industry: number;
    auto_activate: boolean;
  };
}

function weekCounts(rows: FunnelRow[], industry: string, week: string) {
  const r = rows.find((x) => x.industry === industry && x.week === week);
  const delivered = r?.delivered ?? 0;
  const scans = Math.min(r?.scans ?? 0, delivered);
  return { delivered, scans, scan_span: spanOf(betaInterval(1 + scans, 1 + delivered - scans)) };
}

/** Datenexport für den Agenten – nur Aggregate, keine Betriebsnamen, keine Kontaktdaten. */
export async function buildLearningExport(
  opts: { now?: Date; evals?: IndustryEvaluation[]; db?: DbOrTx } = {},
): Promise<LearningExport> {
  const db = opts.db ?? getDb();
  const now = opts.now ?? new Date();
  const evals = opts.evals ?? (await evaluateIndustries({ now, db }));
  const thisWeek = isoWeekLabel(now);
  const lastWeek = isoWeekLabel(addDays(now, -7));
  const [total, weekly, objs, exps, safety, allVariants] = await Promise.all([
    funnelRows({ groupBy: ['industry'] }, db),
    funnelRows({ from: addDays(startOfIsoWeek(now), -7), groupBy: ['industry', 'week'] }, db),
    objectionStats(addDays(now, -28), db),
    db.select().from(experiments).orderBy(desc(experiments.createdAt)).limit(60),
    db
      .select()
      .from(safetyActions)
      .where(gte(safetyActions.createdAt, addDays(now, -7))),
    db
      .select()
      .from(variants)
      .where(and(eq(variants.kind, 'letter'), eq(variants.sequence, 1))),
  ]);
  const industries: ExportIndustry[] = [];
  for (const ev of evals) {
    const industry = ev.industry as Industry;
    if (!(INDUSTRIES as readonly string[]).includes(industry)) continue;
    const f = total.find((r) => r.industry === industry);
    const tw = weekCounts(weekly, industry, thisWeek);
    const lw = weekCounts(weekly, industry, lastWeek);
    const allowed = new Set(getPlaybook(industry).allowed_claims);
    const claims = (await usableClaims(db, { industry, now })).filter((c) => allowed.has(c.id));
    const vs = allVariants.filter((v) => v.industry === industry || (v.industry === null && ev.arms.some((a) => a.arm === v.id)));
    industries.push({
      industry,
      signal: ev.signal,
      equal_split: ev.equalSplit,
      pooled: { scan_span: spanOf(ev.pooled.scan), purchase_span: spanOf(ev.pooled.purchase) },
      arms: ev.arms.map((a) => ({
        variant_id: a.arm,
        name: a.label ?? a.arm,
        is_control: a.isControl,
        eligible: a.eligible,
        delivered: a.delivered,
        scans: a.scans,
        scan_span: spanOf(a.scan),
        evaluated: a.evaluated,
        purchases: a.purchases,
        purchase_span: spanOf(a.purchase),
        p_better_than_control: a.pBetterThanControl === null ? null : round(a.pBetterThanControl, 3),
        verdict: a.verdict,
        share_next: round(a.share, 3),
      })),
      funnel: {
        letters: f?.letters ?? 0,
        delivered: f?.delivered ?? 0,
        scans: f?.scans ?? 0,
        demo_views: f?.demo_views ?? 0,
        engaged: f?.engaged ?? 0,
        cta_clicks: f?.cta_clicks ?? 0,
        whatsapp: f?.whatsapp ?? 0,
        questions: f?.questions ?? 0,
        checkouts: f?.checkouts ?? 0,
        purchases: f?.purchases ?? 0,
        opt_outs: f?.opt_outs ?? 0,
        complaints: f?.complaints ?? 0,
      },
      week_compare: {
        this_week: tw,
        last_week: lw,
        overlap: tw.scan_span[0] <= lw.scan_span[1] && lw.scan_span[0] <= tw.scan_span[1],
      },
      objections: objs.filter((o) => o.industry === industry).map((o) => ({ category: o.category, count: o.count })),
      variants: vs.map((v) => ({
        id: v.id,
        name: v.name,
        status: v.status,
        created_by: v.createdBy,
        parent_variant_id: v.parentVariantId,
        changed_slot: v.changedSlot,
        hypothesis: v.hypothesis,
        slots: (v.slotsJson as unknown as LetterSlots | null) ?? null,
      })),
      claims: claims.map((c) => ({ id: c.id, text: c.textDe })),
      active_count: ev.arms.filter((a) => a.eligible).length,
    });
  }
  return {
    week: thisWeek,
    generated_at: now.toISOString(),
    industries,
    experiments: exps.map((e) => ({
      industry: e.industry,
      hypothesis: e.hypothesis,
      changed_slot: e.changedSlot,
      decision: e.decision,
      started_at: e.startedAt?.toISOString() ?? null,
      ended_at: e.endedAt?.toISOString() ?? null,
      result: e.resultJson,
    })),
    safety_actions: safety.map((s) => ({ kind: s.kind, action: s.action, at: s.createdAt.toISOString() })),
    rules: {
      max_proposals_per_industry: MAX_PROPOSALS_PER_INDUSTRY,
      max_hypotheses: MAX_HYPOTHESES,
      max_active_per_industry: MAX_ACTIVE_PER_INDUSTRY,
      auto_activate: getEnv().AUTO_ACTIVATE_VARIANTS,
    },
  };
}

/** Für jede laufende Variante ohne Logbuch-Eintrag einen anlegen (Startvarianten aus B4, eigene Varianten). */
export async function ensureExperimentsForActiveVariants(evals: IndustryEvaluation[], db: DbOrTx = getDb()): Promise<number> {
  const existing = await db.select({ ids: experiments.variantIds }).from(experiments);
  const known = new Set(existing.flatMap((e) => e.ids));
  const all = await db.select().from(variants);
  let n = 0;
  for (const ev of evals) {
    const control = ev.arms.find((a) => a.isControl);
    for (const a of ev.arms) {
      if (a.isControl || !a.eligible || known.has(a.arm)) continue;
      const v = all.find((x) => x.id === a.arm);
      if (!v) continue;
      const first = await db
        .select({ at: sql<Date | null>`min(${letters.sentAt})` })
        .from(letters)
        .where(and(eq(letters.variantId, v.id), eq(letters.sequence, 1)));
      await db.insert(experiments).values({
        industry: ev.industry as Industry,
        hypothesis: v.hypothesis ?? `Startvariante ${v.name} gegen die Kontrolle`,
        variantIds: [v.id],
        controlVariantId: control?.arm ?? null,
        changedSlot: v.changedSlot,
        startedAt: first[0]?.at ? new Date(first[0].at) : new Date(),
        decision: 'running',
        createdBy: v.createdBy,
        notes: 'Automatisch ins Logbuch übernommen (Variante lief bereits).',
      });
      known.add(v.id);
      n++;
    }
  }
  return n;
}

/** Laufende Experimente mit dem aktuellen Urteil fortschreiben; „schlechter“ (P ≥ 95 %) → pausieren (B6.5 Aufräumen). */
async function updateRunningExperiments(
  evals: IndustryEvaluation[],
  actor: string,
  db: DbOrTx,
): Promise<{
  paused: { industry: string; name: string; pBetter: number | null }[];
  winners: { industry: string; name: string }[];
}> {
  const paused: { industry: string; name: string; pBetter: number | null }[] = [];
  const winners: { industry: string; name: string }[] = [];
  const running = await db
    .select()
    .from(experiments)
    .where(inArray(experiments.decision, ['running', 'auto_activated']));
  for (const ev of evals) {
    for (const a of ev.arms) {
      if (a.isControl) continue;
      const exp = running.find((e) => e.variantIds.includes(a.arm));
      const result = {
        lastVerdict: a.verdict,
        pBetterThanControl: a.pBetterThanControl,
        delivered: a.delivered,
        scans: a.scans,
        purchases: a.purchases,
        scanSpan: [a.scan.lo, a.scan.hi],
        updatedAt: new Date().toISOString(),
      };
      if (a.verdict === 'schlechter' && a.eligible) {
        await db
          .update(variants)
          .set({ status: 'paused' })
          .where(and(eq(variants.id, a.arm), eq(variants.status, 'active')));
        await audit(db, {
          entity: 'variant',
          entityId: a.arm,
          action: 'paused',
          actor,
          context: { reason: 'P ≥ 95 % schlechter als Kontrolle' },
        });
        paused.push({ industry: ev.industry, name: a.label ?? a.arm, pBetter: a.pBetterThanControl });
        if (exp)
          await db
            .update(experiments)
            .set({ decision: 'paused_worse', endedAt: new Date(), resultJson: result, updatedAt: new Date() })
            .where(eq(experiments.id, exp.id));
        continue;
      }
      if (a.verdict === 'gewinner') winners.push({ industry: ev.industry, name: a.label ?? a.arm });
      if (exp) await db.update(experiments).set({ resultJson: result, updatedAt: new Date() }).where(eq(experiments.id, exp.id));
    }
  }
  return { paused, winners };
}

/** Wahrheits-Check eines Vorschlags am Musterbrief (gleiche Komposition wie der echte Brief). */
async function truthCheckSlots(industry: Industry, slots: LetterSlots, now: Date, key: string): Promise<TruthCheckResult> {
  const db = getDb();
  const cfg = await getConfig();
  const allowed = new Set(getPlaybook(industry).allowed_claims);
  const claims = (await usableClaims(db, { industry, now })).filter((c) => allowed.has(c.id));
  const short = (u: string) => u.replace(/^https?:\/\//, '');
  const preview = await renderLetterPreview({
    cfg,
    industry,
    slots,
    recipient: { businessName: 'Musterbetrieb', street: 'Musterstraße', houseNumber: '1', postalCode: '44137', city: 'Dortmund' },
    domain: 'musterbetrieb-dortmund.de',
    claims,
    sourcesLabel: short(trackUrl('/quellen')),
    shortUrl: short(trackUrl('/abc123')),
    qrUrl: trackUrl('/q/MUSTERTOKENMUSTERTOKEN12'),
    expiresLabel: formatDateDe(addDays(now, 30)),
    dateLine: `Dortmund, ${formatDateDe(now)}`,
    privacyUrl: appUrl('/datenschutz'),
    optOutEmail: cfg.sender.email,
  });
  return runTruthCheck(preview.truthInput, { checkSourcesPage: false, idempotencyKey: key });
}

export interface ProposalOutcome {
  industry: string;
  slot: ProposalSlot;
  parentName: string;
  before: string;
  after: string;
  hypothesis: string;
  objection: string;
  status: 'review' | 'auto_activated' | 'rejected';
  reasons: string[];
  variantId?: string;
}

async function handleProposals(
  answer: LearningAnswer,
  exp: LearningExport,
  week: string,
  now: Date,
  db: DbOrTx,
): Promise<ProposalOutcome[]> {
  const cfg = await getConfig();
  const out: ProposalOutcome[] = [];
  const perIndustry = new Map<string, number>();
  const allVariants = await db.select().from(variants).where(eq(variants.kind, 'letter'));
  const loggedTexts = await db
    .select({ slot: experiments.changedSlot, result: experiments.resultJson, industry: experiments.industry })
    .from(experiments);
  for (const p of answer.proposals) {
    const ind = exp.industries.find((i) => i.industry === p.industry);
    const parent = allVariants.find((v) => v.id === p.parent_variant_id) ?? null;
    const parentSlots = (parent?.slotsJson as unknown as LetterSlots | null) ?? null;
    const base: Omit<ProposalOutcome, 'status' | 'reasons'> = {
      industry: p.industry,
      slot: p.changed_slot,
      parentName: parent?.name ?? p.parent_variant_id,
      before: parentSlots?.[p.changed_slot] ?? '',
      after: p.new_text.trim(),
      hypothesis: p.hypothesis,
      objection: p.addresses_objection,
    };
    const reasons: string[] = [];
    if (!ind) reasons.push('Branche nicht im Export');
    const count = perIndustry.get(p.industry) ?? 0;
    if (count >= MAX_PROPOSALS_PER_INDUSTRY) reasons.push(`mehr als ${MAX_PROPOSALS_PER_INDUSTRY} Vorschläge für die Branche`);
    const knownTexts = [
      ...allVariants
        .filter((v) => v.industry === p.industry && v.slotsJson)
        .map((v) => (v.slotsJson as unknown as LetterSlots)[p.changed_slot] ?? ''),
      ...loggedTexts
        .filter((e) => e.industry === p.industry && e.slot === p.changed_slot)
        .map((e) => String((e.result as { newText?: string }).newText ?? '')),
    ].filter(Boolean);
    reasons.push(
      ...proposalViolations({
        proposal: p,
        parent: parent
          ? { id: parent.id, industry: parent.industry, slots: parentSlots, sequence: parent.sequence, kind: parent.kind }
          : null,
        usableClaimIds: ind?.claims.map((c) => c.id) ?? [],
        knownTexts,
        unsupportedPromises: cfg.learning.unsupportedPromises,
      }),
    );
    let truth: TruthCheckResult | null = null;
    if (!reasons.length && parentSlots) {
      try {
        truth = await truthCheckSlots(
          p.industry as Industry,
          applyProposal(parentSlots, p.changed_slot, p.new_text),
          now,
          `learning:${week}:${p.parent_variant_id}:${p.changed_slot}:${count}`,
        );
        if (!truth.passed) reasons.push(...truth.violations.map((v) => `Wahrheits-Check: ${v.detail}`));
      } catch (err) {
        reasons.push(`Musterbrief nicht erzeugbar: ${errInfo(err).message}`);
      }
    }
    if (reasons.length) {
      out.push({ ...base, status: 'rejected', reasons });
      // Im Logbuch festhalten, damit dieselbe Idee nicht erneut kommt
      await db.insert(experiments).values({
        industry: (ind ? p.industry : null) as Industry | null,
        hypothesis: p.hypothesis,
        variantIds: [],
        controlVariantId: parent?.id ?? null,
        changedSlot: p.changed_slot,
        decision: 'rejected',
        resultJson: { newText: base.after, reasons, week },
        notes: 'Vom System verworfen (Regelprüfung)',
      });
      continue;
    }
    perIndustry.set(p.industry, count + 1);
    const slots = applyProposal(parentSlots!, p.changed_slot, p.new_text);
    const auto =
      getEnv().AUTO_ACTIVATE_VARIANTS &&
      AUTO_ACTIVATE_SLOTS.includes(p.changed_slot) &&
      (ind?.active_count ?? MAX_ACTIVE_PER_INDUSTRY) < MAX_ACTIVE_PER_INDUSTRY;
    const [v] = await db
      .insert(variants)
      .values({
        kind: 'letter',
        name: `${parent!.name} · ${SLOT_LABEL[p.changed_slot]} ${week}${count ? `-${count + 1}` : ''}`,
        sequence: 1,
        industry: p.industry as Industry,
        slotsJson: slots as unknown as Record<string, string>,
        content: slots as unknown as Record<string, unknown>,
        parentVariantId: parent!.id,
        changedSlot: p.changed_slot,
        hypothesis: p.hypothesis,
        status: auto ? 'active' : 'proposed',
        active: auto,
        weight: 1,
        createdBy: 'learning_agent',
      })
      .onConflictDoNothing()
      .returning();
    if (!v) {
      out.push({ ...base, status: 'rejected', reasons: ['Name schon vergeben (Lauf dieser Woche wiederholt?)'] });
      continue;
    }
    if (auto && ind) ind.active_count++;
    await db.insert(experiments).values({
      industry: p.industry as Industry,
      hypothesis: p.hypothesis,
      variantIds: [v.id],
      controlVariantId: ind?.arms.find((a) => a.is_control)?.variant_id ?? null,
      changedSlot: p.changed_slot,
      startedAt: auto ? now : null,
      decision: auto ? 'auto_activated' : 'proposed',
      resultJson: { newText: base.after, before: base.before, objection: p.addresses_objection, truthCheck: truth, week },
    });
    out.push({ ...base, status: auto ? 'auto_activated' : 'review', reasons: [], variantId: v.id });
  }
  return out;
}

const pct = (v: number | null | undefined, d = 1) =>
  v === null || v === undefined ? '–' : `${(v * 100).toFixed(d).replace('.', ',')} %`;
const spanTxt = (s: [number, number], d = 1) => `${pct(s[0], d)} – ${pct(s[1], d)}`;
const INDUSTRY_LABEL: Record<string, string> = {
  gastronomie: 'Gastronomie',
  handwerk: 'Handwerk',
  beauty: 'Beauty',
  einzelhandel: 'Einzelhandel',
  kurse_training: 'Kurse & Training',
  dienstleistung: 'Dienstleistung',
};

export function renderLearningReport(
  exp: LearningExport,
  answer: LearningAnswer | null,
  outcomes: ProposalOutcome[],
  cleanup: {
    paused: { industry: string; name: string; pBetter: number | null }[];
    winners: { industry: string; name: string }[];
  },
  llmError: string | null,
): string {
  const L: string[] = [`# Wochenbericht Lern-Agent ${exp.week}`, ''];
  L.push(
    answer?.summary ?? `_Kein Text vom Sprachmodell (${llmError ?? 'nicht ausgeführt'}) – Kennzahlen unten sind vollständig._`,
    '',
  );
  const withLetters = exp.industries.filter((i) => i.funnel.letters > 0);
  const empty = exp.industries.filter((i) => i.funnel.letters === 0);
  L.push('## Versand, Reaktionen und Spannen je Branche', '');
  if (!withLetters.length) L.push('Noch keine versendeten Briefe.', '');
  for (const ind of withLetters) {
    const f = ind.funnel;
    L.push(
      `### ${INDUSTRY_LABEL[ind.industry] ?? ind.industry}`,
      '',
      `Briefe ${f.letters}, zugestellt ${f.delivered}, Scans ${f.scans}, Demo-Aufrufe ${f.demo_views} (davon ≥ 30 s: ${f.engaged}), „Seite übernehmen“ ${f.cta_clicks}, WhatsApp ${f.whatsapp}, Fragen ${f.questions}, Checkout ${f.checkouts}, Käufe ${f.purchases}, Opt-outs ${f.opt_outs}, Beschwerden ${f.complaints}.`,
      '',
      '| Variante | zugestellt | Scans | Scan-Rate (90 %) | Käufe | Kaufrate (90 %) | P(besser als Kontrolle) | Urteil |',
      '|---|---:|---:|---|---:|---|---:|---|',
      ...ind.arms.map(
        (a) =>
          `| ${a.name}${a.is_control ? ' (Kontrolle)' : ''}${a.eligible ? '' : ' (nicht aktiv)'} | ${a.delivered} | ${a.scans} | ${a.delivered ? spanTxt(a.scan_span) : '–'} | ${a.purchases} | ${a.evaluated ? spanTxt(a.purchase_span, 2) : 'noch nicht ausgewertet'} | ${pct(a.p_better_than_control, 0)} | ${VERDICT_LABEL[a.verdict as keyof typeof VERDICT_LABEL] ?? a.verdict} |`,
      ),
      '',
    );
    const wc = ind.week_compare;
    const fmt = (w: typeof wc.this_week) =>
      w.delivered
        ? `${w.scans} Scans bei ${w.delivered} zugestellten Briefen (${spanTxt(w.scan_span)})`
        : 'keine zugestellten Briefe';
    L.push(
      `Diese Woche: ${fmt(wc.this_week)}; Vorwoche: ${fmt(wc.last_week)}${
        wc.this_week.delivered && wc.last_week.delivered
          ? ` – ${wc.overlap ? '**im Rahmen des Zufalls** (Spannen überlappen)' : '**deutlicher Unterschied** (Spannen überlappen nicht)'}`
          : ''
      }.`,
      '',
    );
  }
  if (answer?.changes.length) {
    L.push('## Veränderungen gegenüber der Vorwoche', '');
    for (const c of answer.changes)
      L.push(`- ${INDUSTRY_LABEL[c.industry] ?? c.industry}: ${c.text}${c.is_noise ? ' _(vermutlich Zufall)_' : ''}`);
    L.push('');
  }
  if (empty.length) L.push(`Ohne Briefe bisher: ${empty.map((i) => INDUSTRY_LABEL[i.industry] ?? i.industry).join(', ')}.`, '');
  L.push('## Wo die meisten abspringen', '');
  L.push('| Branche | Zugestellt → Scan | Scan → Demo | Demo → Übernehmen | Übernehmen → Checkout | Checkout → Kauf |');
  L.push('|---|---:|---:|---:|---:|---:|');
  const r = (a: number, b: number) => (b > 0 ? pct(a / b, 0) : '–');
  for (const ind of withLetters) {
    const f = ind.funnel;
    L.push(
      `| ${INDUSTRY_LABEL[ind.industry] ?? ind.industry} | ${r(f.scans, f.delivered)} | ${r(f.demo_views, f.scans)} | ${r(f.cta_clicks, f.demo_views)} | ${r(f.checkouts, f.cta_clicks)} | ${r(f.purchases, f.checkouts)} |`,
    );
  }
  L.push('', answer?.dropoff ?? '', '');
  L.push('## Häufigste Einwände (letzte 4 Wochen)', '');
  const objLines = exp.industries.flatMap((i) =>
    i.objections
      .slice(0, 3)
      .map((o) => `- ${INDUSTRY_LABEL[i.industry] ?? i.industry}: ${OBJECTION_LABEL[o.category]} – ${o.count}×`),
  );
  L.push(...(objLines.length ? objLines : ['Keine Einwände erfasst.']), '', answer?.objections_comment ?? '', '');
  L.push(`## Hypothesen (höchstens ${MAX_HYPOTHESES})`, '');
  const hyps = (answer?.hypotheses ?? []).slice(0, MAX_HYPOTHESES);
  L.push(
    ...(hyps.length
      ? hyps.map((h, i) => `${i + 1}. **${h.title}** (${INDUSTRY_LABEL[h.industry] ?? h.industry}) – ${h.rationale}`)
      : ['Keine.']),
    '',
  );
  L.push('## Neue Varianten-Vorschläge (Ein-Slot-Regel)', '');
  if (!outcomes.length) L.push('Keine Vorschläge.');
  for (const o of outcomes) {
    const status =
      o.status === 'review'
        ? '→ **Review-Queue** (Varianten-Labor)'
        : o.status === 'auto_activated'
          ? '→ **automatisch gestartet** (AUTO_ACTIVATE_VARIANTS)'
          : `→ **verworfen**: ${o.reasons.join('; ')}`;
    L.push(
      `- ${INDUSTRY_LABEL[o.industry] ?? o.industry}, ${SLOT_LABEL[o.slot] ?? o.slot} von „${o.parentName}“ ${status}`,
      `  - vorher: ${o.before || '_(leer)_'}`,
      `  - neu: ${o.after || '_(leer)_'}`,
      `  - Hypothese: ${o.hypothesis}${o.objection !== 'keiner' ? ` · Einwand: ${OBJECTION_LABEL[o.objection as ObjectionCategory] ?? o.objection}` : ''}`,
    );
  }
  L.push('');
  L.push('## Aufräumen', '');
  L.push(
    ...(cleanup.paused.length
      ? cleanup.paused.map(
          (p) =>
            `- ${INDUSTRY_LABEL[p.industry] ?? p.industry}: „${p.name}“ pausiert – P(besser als Kontrolle) ${pct(p.pBetter, 0)}`,
        )
      : ['Keine Variante mit P ≥ 95 % schlechter als die Kontrolle.']),
  );
  for (const w of cleanup.winners)
    L.push(
      `- ${INDUSTRY_LABEL[w.industry] ?? w.industry}: „${w.name}“ ist **Gewinner** gegen die Kontrolle – Entscheidung bei dir (neue Kontrolle setzen unter Einstellungen → Optimizer).`,
    );
  L.push('');
  if (answer?.claim_research.length) {
    L.push('## Recherche-Wünsche für neue Claims', '');
    for (const c of answer.claim_research) L.push(`- ${INDUSTRY_LABEL[c.industry] ?? c.industry}: ${c.topic}`);
    L.push('');
  }
  L.push(
    '---',
    '',
    '_Spannen = 90 % Wahrscheinlichkeit (Bayes mit Partial Pooling). „Gewinner“ erst bei P ≥ 90 % und genug Briefen je Arm. Bei wenigen Briefen sind Unterschiede überwiegend Zufall._',
  );
  return L.join('\n');
}

/** Experiment-Logbuch als Markdown (Dashboard-Download, `reports/experiments.md`). */
export async function experimentsMarkdown(db: DbOrTx = getDb()): Promise<string> {
  const rows = await db.select().from(experiments).orderBy(desc(experiments.createdAt));
  const vs = await db.select({ id: variants.id, name: variants.name }).from(variants);
  const name = (id: string | null) => (id ? (vs.find((v) => v.id === id)?.name ?? id) : '–');
  const L = [
    '# Experiment-Logbuch',
    '',
    `Stand ${formatDateDe(new Date())}. Jede Variante mit Hypothese, Laufzeit, Ergebnis und Entscheidung (B6.5).`,
    '',
    '| Erstellt | Branche | Slot | Hypothese | Varianten | Kontrolle | Start | Ende | Entscheidung | Ergebnis / Notiz |',
    '|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const e of rows) {
    const res = e.resultJson as {
      lastVerdict?: string;
      pBetterThanControl?: number | null;
      delivered?: number;
      reasons?: string[];
    };
    const result = res.reasons?.length
      ? `verworfen: ${res.reasons.join('; ')}`
      : res.lastVerdict
        ? `${VERDICT_LABEL[res.lastVerdict as keyof typeof VERDICT_LABEL] ?? res.lastVerdict}, P(besser) ${pct(res.pBetterThanControl ?? null, 0)}, ${res.delivered ?? 0} Briefe`
        : '';
    L.push(
      `| ${formatDateDe(e.createdAt)} | ${e.industry ?? '–'} | ${e.changedSlot ? (SLOT_LABEL[e.changedSlot as ProposalSlot] ?? e.changedSlot) : '–'} | ${e.hypothesis.replace(/\|/g, '/')} | ${e.variantIds.map(name).join(', ') || '–'} | ${name(e.controlVariantId)} | ${e.startedAt ? formatDateDe(e.startedAt) : '–'} | ${e.endedAt ? formatDateDe(e.endedAt) : '–'} | ${e.decision} | ${[result, e.notes].filter(Boolean).join(' · ').replace(/\|/g, '/')} |`,
    );
  }
  return L.join('\n');
}

export interface LearningRunResult {
  week: string;
  reportId: string;
  skipped: boolean;
  outcomes: ProposalOutcome[];
  paused: number;
  markdown: string;
  llmError: string | null;
}

/** Wochenlauf des Lern-Agents (sonntags 18:30, nach dem Optimizer). Ein Bericht je Woche; `force` erzeugt ihn neu. */
export async function runLearningAgent(opts: { now?: Date; force?: boolean; actor?: string } = {}): Promise<LearningRunResult> {
  const db = getDb();
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? 'job:learning-agent';
  const week = isoWeekLabel(now);
  const existing = await db.query.weeklyReports.findFirst({ where: eq(weeklyReports.week, week) });
  if (existing && !opts.force)
    return { week, reportId: existing.id, skipped: true, outcomes: [], paused: 0, markdown: existing.markdown, llmError: null };

  await refreshFunnel(db);
  let evals = await evaluateIndustries({ now, db });
  await ensureExperimentsForActiveVariants(evals, db);
  const cleanup = await updateRunningExperiments(evals, actor, db);
  if (cleanup.paused.length) evals = await evaluateIndustries({ now, db });
  const exp = await buildLearningExport({ now, evals, db });

  let answer: LearningAnswer | null = null;
  let llmError: string | null = null;
  try {
    answer = await llmStructured<LearningAnswer>({
      tier: 'creative',
      system: LEARNING_SYSTEM,
      prompt: `Kalenderwoche ${week}. Datenexport (JSON, ohne personenbezogene Daten):\n<<<EXPORT>>>${JSON.stringify(exp)}`,
      toolName: LEARNING_TOOL,
      toolDescription: 'Wochenbericht, Hypothesen und Varianten-Vorschläge des Lern-Agents.',
      inputSchema: LEARNING_SCHEMA as unknown as Record<string, unknown>,
      maxTokens: 8000,
      effort: 'high',
      purpose: 'learning_agent',
      idempotencyKey: `learning:${week}${opts.force ? `:${now.getTime()}` : ''}`,
    });
  } catch (err) {
    llmError = errInfo(err).message;
    logger.warn({ week, ...errInfo(err) }, 'Lern-Agent: Sprachmodell nicht verfügbar – Bericht ohne Text und Vorschläge');
  }
  const outcomes = answer ? await handleProposals(answer, exp, week, now, db) : [];
  const markdown = renderLearningReport(exp, answer, outcomes, cleanup, llmError);
  const metrics = {
    industries: exp.industries.map((i) => ({ industry: i.industry, funnel: i.funnel, arms: i.arms })),
    hypotheses: answer?.hypotheses.slice(0, MAX_HYPOTHESES) ?? [],
    proposals: outcomes.map((o) => ({ ...o })),
    paused: cleanup.paused,
    winners: cleanup.winners,
    llmError,
  };
  const [row] = await db
    .insert(weeklyReports)
    .values({ week, markdown, metricsJson: metrics as unknown as Record<string, unknown> })
    .onConflictDoUpdate({
      target: weeklyReports.week,
      set: { markdown, metricsJson: metrics as unknown as Record<string, unknown>, createdAt: new Date() },
    })
    .returning();
  const storage = getProviders().storage;
  await storage.put(`reports/woche-${week}.md`, markdown, 'text/markdown; charset=utf-8');
  await storage.put('reports/experiments.md', await experimentsMarkdown(db), 'text/markdown; charset=utf-8');
  await audit(db, {
    entity: 'weekly_report',
    entityId: row!.id,
    action: 'learning_agent_run',
    actor,
    context: {
      week,
      review: outcomes.filter((o) => o.status === 'review').length,
      auto: outcomes.filter((o) => o.status === 'auto_activated').length,
      rejected: outcomes.filter((o) => o.status === 'rejected').length,
      paused: cleanup.paused.length,
    },
  });
  try {
    const cfg = await getConfig();
    const mail = renderEmail(cfg, {
      subject: `[Website-Brief] Lern-Agent ${week}: ${outcomes.filter((o) => o.status === 'review').length} Vorschläge zur Freigabe`,
      noGreeting: true,
      blocks: [markdown, { button: { href: appUrl('/admin/variants'), label: 'Varianten-Labor öffnen' } }],
    });
    await sendTransactionalEmail({
      ...mail,
      kind: 'weekly_report',
      idempotencyKey: `learning:${row!.id}:${now.toISOString().slice(0, 13)}`,
      to: getEnv().ADMIN_EMAIL,
    });
  } catch (err) {
    logger.warn({ ...errInfo(err) }, 'Lern-Agent: Bericht nicht gemailt');
  }
  return { week, reportId: row!.id, skipped: false, outcomes, paused: cleanup.paused.length, markdown, llmError };
}

// ---------------------------------------------------------------------------
// Review-Queue (Varianten-Labor)
// ---------------------------------------------------------------------------

export class VariantReviewError extends Error {}

async function activeCountFor(db: DbOrTx, industry: Industry): Promise<number> {
  const evals = await evaluateIndustries({ db });
  return evals.find((e) => e.industry === industry)?.arms.filter((a) => a.eligible).length ?? 0;
}

/** Vorschlag freigeben: nur mit bestandenem Wahrheits-Check und höchstens 4 aktiven Varianten je Branche. */
export async function approveProposal(variantId: string, actor: string, db: DbOrTx = getDb()): Promise<void> {
  const v = await db.query.variants.findFirst({ where: eq(variants.id, variantId) });
  if (!v || v.status !== 'proposed') throw new VariantReviewError('Variante ist kein offener Vorschlag.');
  const exp = (
    await db
      .select()
      .from(experiments)
      .where(sql`${variantId}::uuid = ANY(${experiments.variantIds})`)
  )[0];
  const truth = (exp?.resultJson as { truthCheck?: { passed?: boolean } | null } | undefined)?.truthCheck;
  if (truth?.passed !== true) throw new VariantReviewError('Wahrheits-Check nicht bestanden – Vorschlag kann nicht starten.');
  if (v.industry && (await activeCountFor(db, v.industry)) >= MAX_ACTIVE_PER_INDUSTRY)
    throw new VariantReviewError(`Schon ${MAX_ACTIVE_PER_INDUSTRY} aktive Varianten in der Branche – erst eine pausieren.`);
  await db.update(variants).set({ status: 'active', active: true }).where(eq(variants.id, variantId));
  if (exp)
    await db
      .update(experiments)
      .set({ decision: 'running', startedAt: new Date(), updatedAt: new Date() })
      .where(eq(experiments.id, exp.id));
  await audit(db, { entity: 'variant', entityId: variantId, action: 'proposal_approved', actor });
}

export async function rejectProposal(variantId: string, actor: string, note: string, db: DbOrTx = getDb()): Promise<void> {
  const v = await db.query.variants.findFirst({ where: eq(variants.id, variantId) });
  if (!v || v.status !== 'proposed') throw new VariantReviewError('Variante ist kein offener Vorschlag.');
  await db.update(variants).set({ status: 'retired', active: false }).where(eq(variants.id, variantId));
  await db
    .update(experiments)
    .set({
      decision: 'rejected',
      endedAt: new Date(),
      notes: note.slice(0, 500) || 'Vom Betreiber abgelehnt',
      updatedAt: new Date(),
    })
    .where(sql`${variantId}::uuid = ANY(${experiments.variantIds})`);
  await audit(db, {
    entity: 'variant',
    entityId: variantId,
    action: 'proposal_rejected',
    actor,
    context: { note: note.slice(0, 200) },
  });
}

/** Aktive Variante von Hand beenden (Logbuch: gestoppt). */
export async function retireVariant(variantId: string, actor: string, note: string, db: DbOrTx = getDb()): Promise<void> {
  const v = await db.query.variants.findFirst({ where: eq(variants.id, variantId) });
  if (!v || !['active', 'paused'].includes(v.status)) throw new VariantReviewError('Nur aktive oder pausierte Varianten.');
  await db.update(variants).set({ status: 'retired', active: false }).where(eq(variants.id, variantId));
  await db
    .update(experiments)
    .set({
      decision: 'stopped',
      endedAt: new Date(),
      notes: note.slice(0, 500) || 'Vom Betreiber beendet',
      updatedAt: new Date(),
    })
    .where(
      and(
        sql`${variantId}::uuid = ANY(${experiments.variantIds})`,
        or(eq(experiments.decision, 'running'), eq(experiments.decision, 'auto_activated'), isNull(experiments.endedAt)),
      ),
    );
  await audit(db, { entity: 'variant', entityId: variantId, action: 'retired', actor, context: { note: note.slice(0, 200) } });
}

export async function pauseVariant(variantId: string, actor: string, db: DbOrTx = getDb()): Promise<void> {
  const res = await db
    .update(variants)
    .set({ status: 'paused' })
    .where(and(eq(variants.id, variantId), eq(variants.status, 'active')))
    .returning({ id: variants.id });
  if (!res.length) throw new VariantReviewError('Nur aktive Varianten können pausiert werden.');
  await audit(db, { entity: 'variant', entityId: variantId, action: 'paused', actor });
}

export type { VariantRow };
