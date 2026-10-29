import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import {
  evaluateIndustries,
  getDb,
  getEnv,
  MAX_ACTIVE_PER_INDUSTRY,
  OBJECTION_LABEL,
  schema,
  SLOT_LABEL,
  VERDICT_LABEL,
  type ObjectionCategory,
  type ProposalSlot,
} from '@wbm/core';
import { Badge, Card, Notice, PageHeader, btn, input } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt, pct } from '@/lib/format';
import {
  approveProposalAction,
  pauseVariantAction,
  reactivateAction,
  rejectProposalAction,
  retireVariantAction,
  runLearningAgentAction,
  setupLetterVariantsAction,
} from './actions';
import { SubmitButton } from '@/components/admin/submit-button';

export const metadata = { title: 'Varianten-Labor' };
export const dynamic = 'force-dynamic';

const INDUSTRY_LABEL: Record<string, string> = {
  gastronomie: 'Gastronomie',
  handwerk: 'Handwerk',
  beauty: 'Beauty',
  einzelhandel: 'Einzelhandel',
  kurse_training: 'Kurse & Training',
  dienstleistung: 'Dienstleistung',
};

/** Wortweiser Vergleich (LCS) für die Diff-Ansicht. */
function wordDiff(a: string, b: string): { text: string; kind: 'same' | 'del' | 'ins' }[] {
  const x = a.split(/(\s+)/).filter(Boolean);
  const y = b.split(/(\s+)/).filter(Boolean);
  const dp = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--)
      dp[i]![j] = x[i] === y[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: { text: string; kind: 'same' | 'del' | 'ins' }[] = [];
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i] === y[j]) {
      out.push({ text: x[i]!, kind: 'same' });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) out.push({ text: x[i++]!, kind: 'del' });
    else out.push({ text: y[j++]!, kind: 'ins' });
  }
  while (i < x.length) out.push({ text: x[i++]!, kind: 'del' });
  while (j < y.length) out.push({ text: y[j++]!, kind: 'ins' });
  return out;
}

function Diff({ before, after }: { before: string; after: string }) {
  return (
    <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed">
      {wordDiff(before, after).map((p, k) =>
        p.kind === 'same' ? (
          <span key={k}>{p.text}</span>
        ) : p.kind === 'del' ? (
          <del key={k} className="bg-red-100 text-red-900">
            {p.text}
          </del>
        ) : (
          <ins key={k} className="bg-emerald-100 text-emerald-900 no-underline">
            {p.text}
          </ins>
        ),
      )}
    </p>
  );
}

export default async function VariantsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = getDb();
  const [all, exps, evals] = await Promise.all([
    db
      .select()
      .from(schema.variants)
      .where(and(eq(schema.variants.kind, 'letter'), eq(schema.variants.sequence, 1)))
      .orderBy(desc(schema.variants.createdAt)),
    db.select().from(schema.experiments).orderBy(desc(schema.experiments.createdAt)),
    evaluateIndustries(),
  ]);
  const byId = new Map(all.map((v) => [v.id, v]));
  const proposals = all.filter((v) => v.status === 'proposed');
  const industries = [...new Set(all.map((v) => v.industry ?? 'neutral'))];
  const autoActivate = getEnv().AUTO_ACTIVATE_VARIANTS;

  return (
    <>
      <PageHeader
        title="Varianten-Labor"
        subtitle={`Vorschläge des Lern-Agents (Ein-Slot-Regel), aktive, pausierte und beendete Briefvarianten. Höchstens ${MAX_ACTIVE_PER_INDUSTRY} aktive Varianten je Branche.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a className={btn.secondary} href="/admin/variants/logbuch">
              Experiment-Logbuch (Markdown)
            </a>
            <Link className={btn.secondary} href="/admin/optimizer#power">
              Power-Rechner
            </Link>
            <form action={runLearningAgentAction}>
              <SubmitButton type="submit" className={btn.secondary}>
                Lern-Agent jetzt ausführen
              </SubmitButton>
            </form>
          </div>
        }
      />
      <div className="mb-6 space-y-3">
        {sp.error ? <Notice kind="error">{sp.error}</Notice> : null}
        {!all.some((v) => v.active && v.status === 'active') ? (
          <Notice kind="warn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <strong>Keine aktive Briefvorlage.</strong> Ohne sie entsteht kein Brief. Richte die geprüften Standardvorlagen
                ein – danach kannst du sie hier pausieren oder austauschen.
              </span>
              <form action={setupLetterVariantsAction}>
                <SubmitButton className={btn.primary}>Briefvorlagen einrichten</SubmitButton>
              </form>
            </div>
          </Notice>
        ) : null}
        <Notice>
          AUTO_ACTIVATE_VARIANTS ist <strong>{autoActivate ? 'an' : 'aus'}</strong>.{' '}
          {autoActivate
            ? 'Vorschläge, die nur Betreff, Nutzen-Satz oder QR-Text ändern und den Wahrheits-Check bestehen, starten ohne Freigabe; alles andere wartet hier.'
            : 'Jeder Vorschlag wartet hier auf deine Freigabe.'}
        </Notice>
      </div>

      <Card title={`Review-Queue (${proposals.length})`}>
        {proposals.length === 0 ? <p className="text-sm text-slate-600">Keine offenen Vorschläge.</p> : null}
        <div className="space-y-6">
          {proposals.map((v) => {
            const parent = v.parentVariantId ? byId.get(v.parentVariantId) : undefined;
            const slot = (v.changedSlot ?? 'subject') as ProposalSlot;
            const before = ((parent?.slotsJson as Record<string, string> | null) ?? {})[slot] ?? '';
            const after = ((v.slotsJson as Record<string, string> | null) ?? {})[slot] ?? '';
            const exp = exps.find((e) => e.variantIds.includes(v.id));
            const res = (exp?.resultJson ?? {}) as { truthCheck?: { passed?: boolean }; objection?: string };
            return (
              <article key={v.id} className="border-b border-slate-100 pb-6 last:border-0" data-variant-id={v.id}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{v.name}</h3>
                  <Badge color="blue">{INDUSTRY_LABEL[v.industry ?? ''] ?? v.industry}</Badge>
                  <Badge color="purple">{SLOT_LABEL[slot] ?? slot}</Badge>
                  <Badge color={res.truthCheck?.passed ? 'green' : 'red'}>
                    Wahrheits-Check {res.truthCheck?.passed ? 'bestanden' : 'fehlt'}
                  </Badge>
                  {v.createdBy === 'learning_agent' ? <Badge>Lern-Agent</Badge> : null}
                </div>
                <p className="mb-2 text-sm text-slate-700">
                  <strong>Hypothese:</strong> {v.hypothesis}
                  {res.objection && res.objection !== 'keiner' ? (
                    <> · Einwand: {OBJECTION_LABEL[res.objection as ObjectionCategory] ?? res.objection}</>
                  ) : null}
                </p>
                <p className="mb-1 text-xs text-slate-500">
                  Ausgangsvariante „{parent?.name ?? '–'}“ · vorgeschlagen {dt(v.createdAt)}
                </p>
                <Diff before={before} after={after} />
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <form action={approveProposalAction}>
                    <input type="hidden" name="id" value={v.id} />
                    <SubmitButton type="submit" className={btn.primary}>
                      Freigeben und starten
                    </SubmitButton>
                  </form>
                  <form action={rejectProposalAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={v.id} />
                    <label className="sr-only" htmlFor={`note-${v.id}`}>
                      Grund der Ablehnung
                    </label>
                    <input id={`note-${v.id}`} name="note" className={input} placeholder="Grund (fürs Logbuch)" />
                    <SubmitButton type="submit" className={btn.secondary}>
                      Ablehnen
                    </SubmitButton>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      <div className="mt-6 grid gap-6">
        {industries.map((ind) => {
          const ev = evals.find((e) => e.industry === ind);
          const vs = all.filter((v) => (v.industry ?? 'neutral') === ind && v.status !== 'proposed');
          if (!vs.length) return null;
          return (
            <Card
              key={ind}
              title={ind === 'neutral' ? 'Neutrale Varianten (Kontrolle für alle Branchen)' : (INDUSTRY_LABEL[ind] ?? ind)}
            >
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500">
                      <th className="px-2 py-1">Variante</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1">geändert</th>
                      <th className="px-2 py-1">Hypothese</th>
                      <th className="px-2 py-1">Urteil / Anteil</th>
                      <th className="px-2 py-1">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vs.map((v) => {
                      const arm = ev?.arms.find((a) => a.arm === v.id);
                      return (
                        <tr key={v.id} className="border-t border-slate-100 align-top">
                          <td className="px-2 py-2">
                            <div className="font-medium">{v.name}</div>
                            <div className="text-xs text-slate-500">
                              {v.createdBy === 'learning_agent' ? 'Lern-Agent' : 'Betreiber/Start'}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <Badge color={v.status === 'active' ? 'green' : v.status === 'paused' ? 'yellow' : 'gray'}>
                              {v.status}
                            </Badge>
                            {arm?.isControl ? (
                              <div className="mt-1">
                                <Badge color="blue">Kontrolle</Badge>
                              </div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            {v.changedSlot ? (SLOT_LABEL[v.changedSlot as ProposalSlot] ?? v.changedSlot) : '–'}
                          </td>
                          <td className="max-w-md px-2 py-2 text-slate-700">{v.hypothesis ?? '–'}</td>
                          <td className="px-2 py-2">
                            {arm ? (
                              <>
                                {VERDICT_LABEL[arm.verdict]}
                                <div className="text-xs text-slate-500">
                                  {arm.delivered} zugestellt · Anteil {pct(arm.share, 0)}
                                </div>
                              </>
                            ) : (
                              '–'
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-wrap gap-2">
                              {v.status === 'active' ? (
                                <form action={pauseVariantAction}>
                                  <input type="hidden" name="id" value={v.id} />
                                  <SubmitButton type="submit" className="text-xs text-brand-700 underline">
                                    pausieren
                                  </SubmitButton>
                                </form>
                              ) : null}
                              {v.status === 'paused' ? (
                                <form action={reactivateAction}>
                                  <input type="hidden" name="id" value={v.id} />
                                  <SubmitButton type="submit" className="text-xs text-brand-700 underline">
                                    wieder aktivieren
                                  </SubmitButton>
                                </form>
                              ) : null}
                              {v.status === 'active' || v.status === 'paused' ? (
                                <form action={retireVariantAction}>
                                  <input type="hidden" name="id" value={v.id} />
                                  <input type="hidden" name="note" value="Im Varianten-Labor beendet" />
                                  <SubmitButton type="submit" className="text-xs text-red-700 underline">
                                    beenden
                                  </SubmitButton>
                                </form>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
