import { sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { templatesForGroup } from '@wbm/templates';
import { poolHierarchy } from '../stats/bayes';
import type { BranchGroup } from '../types';

export interface TemplateStat {
  templateId: string;
  letters: number;
  purchases: number;
  /** Beta(1+Käufe, 1+Briefe−Käufe) – Erwartungswert der Kaufrate */
  meanRate: number;
}

/**
 * Kaufrate je Template in einer Branche (Kohorte: Erstbriefe an Leads, deren Demo dieses Template nutzte).
 * Grundlage für Brief 3: die verbesserte Demo nutzt das in der Branche am besten konvertierende Template.
 */
export async function templateStatsForBranch(branch: string, db: DbOrTx = getDb()): Promise<TemplateStat[]> {
  const res = await db.execute<{ template_id: string; letters: number; purchases: number }>(sql`
    SELECT d.template_id,
      count(DISTINCT l.lead_id)::int AS letters,
      count(DISTINCT o.lead_id)::int AS purchases
    FROM letters l
    JOIN leads ld ON ld.id = l.lead_id
    JOIN demos d ON d.id = l.demo_id
    LEFT JOIN orders o ON o.lead_id = l.lead_id AND o.status IN ('paid', 'refunded')
    WHERE l.sequence = 1 AND l.is_test = false AND l.dry_run = false AND l.sent_at IS NOT NULL AND ld.branch = ${branch}
    GROUP BY d.template_id
  `);
  return res.rows.map((r) => ({
    templateId: r.template_id,
    letters: r.letters,
    purchases: r.purchases,
    meanRate: (1 + r.purchases) / (2 + r.letters),
  }));
}

/**
 * Bestes Template der Branche für Brief 3 (L5: Partial Pooling statt Mindestzahl je Template).
 * Hierarchie: alle Templates der Gruppe → Template über alle Branchen der Gruppe → Template in dieser
 * Branche. So zählen Erfahrungen aus Nachbarbranchen mit, ohne dass 5 Briefe einen Sieger machen.
 * null (→ normale Rotation), solange die Gruppe weniger als `minLetters` Briefe oder keinen Kauf hat.
 */
export async function bestTemplateForBranch(
  branch: string,
  group: BranchGroup,
  opts: { minLetters?: number; exclude?: string[] } = {},
  db: DbOrTx = getDb(),
): Promise<string | null> {
  const allowed = templatesForGroup(group)
    .map((t) => t.id)
    .filter((id) => !(opts.exclude ?? []).includes(id));
  if (!allowed.length) return null;
  const res = await db.execute<{ template_id: string; branch: string; letters: number; purchases: number }>(sql`
    SELECT d.template_id, ld.branch,
      count(DISTINCT l.lead_id)::int AS letters,
      count(DISTINCT o.lead_id)::int AS purchases
    FROM letters l
    JOIN leads ld ON ld.id = l.lead_id
    JOIN demos d ON d.id = l.demo_id
    LEFT JOIN orders o ON o.lead_id = l.lead_id AND o.status IN ('paid', 'refunded')
    WHERE l.sequence = 1 AND l.is_test = false AND l.dry_run = false AND l.sent_at IS NOT NULL AND ld.branch_group = ${group}
    GROUP BY d.template_id, ld.branch
  `);
  const rows = res.rows.filter((r) => allowed.includes(r.template_id));
  const total = rows.reduce((s, r) => s + r.letters, 0);
  const buys = rows.reduce((s, r) => s + r.purchases, 0);
  if (total < (opts.minLetters ?? 30) || buys === 0) return null;
  // Jedes erlaubte Template bekommt einen Arm für diese Branche (ohne Daten → Schätzung der Template-Ebene)
  const arms = [
    ...rows.map((r) => ({ group: r.template_id, arm: r.branch, n: r.letters, x: r.purchases })),
    ...allowed
      .filter((id) => !rows.some((r) => r.template_id === id && r.branch === branch))
      .map((id) => ({ group: id, arm: branch, n: 0, x: 0 })),
  ];
  const pooled = poolHierarchy(arms);
  const candidates = pooled.arms
    .filter((a) => a.arm === branch && allowed.includes(a.group))
    .map((a) => ({ templateId: a.group, mean: a.alpha / (a.alpha + a.beta) }))
    .sort((a, b) => b.mean - a.mean);
  return candidates[0]?.templateId ?? null;
}
