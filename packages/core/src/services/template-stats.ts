import { sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { templatesForGroup } from '@wbm/templates';
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
 * Bestes Template der Branche (höchste erwartete Kaufrate). Erst ab `minLetters` Briefen je Template
 * aussagekräftig; sonst null → die normale Rotation wählt (mit L5 kommt Partial Pooling hinzu).
 */
export async function bestTemplateForBranch(
  branch: string,
  group: BranchGroup,
  opts: { minLetters?: number; exclude?: string[] } = {},
): Promise<string | null> {
  const allowed = new Set(templatesForGroup(group).map((t) => t.id));
  const stats = (await templateStatsForBranch(branch)).filter(
    (s) => allowed.has(s.templateId) && s.letters >= (opts.minLetters ?? 30) && !(opts.exclude ?? []).includes(s.templateId),
  );
  if (!stats.length) return null;
  stats.sort((a, b) => b.meanRate - a.meanRate);
  return stats[0]!.templateId;
}
