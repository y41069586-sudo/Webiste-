import { sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig, getDb, leadScorePool, type AssistantSnapshot } from '@wbm/core';
import { settingsTodos } from '@/app/admin/settings/todos';
import { SECTIONS } from '@/components/admin/nav-config';
import { loadLeadSearchStatus } from './lead-search';

/** Stand der Verwaltung für den Assistenten: nur Zahlen und Zustände, keine personenbezogenen Daten. */
export async function assistantSnapshot(): Promise<AssistantSnapshot> {
  const cfg = await getConfig();
  const sw = effectiveSwitches(cfg);
  const db = getDb();
  const [search, pool, statusRows, open] = await Promise.all([
    loadLeadSearchStatus(),
    leadScorePool(cfg.filters.minLeadScore).catch(() => ({ above: 0, below: 0, best: 0 })),
    db
      .execute<{ status: string; n: number }>(
        sql`SELECT status, count(*)::int AS n FROM leads WHERE anonymized_at IS NULL GROUP BY status`,
      )
      .then((r) => r.rows)
      .catch(() => []),
    db
      .execute<{ demos: number; letters: number; support: number; alerts: number }>(
        sql`SELECT
          (SELECT count(*)::int FROM leads WHERE status = 'demo_built') AS demos,
          (SELECT count(*)::int FROM leads WHERE status = 'letter_generated') AS letters,
          (SELECT count(*)::int FROM support_messages WHERE status IN ('new', 'drafted', 'escalated')) AS support,
          (SELECT count(*)::int FROM alerts WHERE acknowledged_at IS NULL) AS alerts`,
      )
      .then((r) => r.rows[0])
      .catch(() => undefined),
  ]);
  const p = search.progress;
  return {
    jetzt: new Date().toISOString(),
    modus: sw.dryRun ? 'test' : 'live',
    notAus: sw.killSwitch,
    zielstaedte: cfg.targeting.cities,
    branchen: cfg.targeting.branches.filter((b) => b.active).map((b) => ({ key: b.key, label: b.label, gruppe: b.group })),
    mindestPunkte: cfg.filters.minLeadScore,
    leads: {
      status: Object.fromEntries(statusRows.map((r) => [r.status, r.n])),
      offenAbGrenze: pool.above,
      offenUnterGrenze: pool.below,
      besterWert: pool.best,
    },
    suche: {
      laeuft: search.active + search.waiting > 0,
      wartend: search.waiting,
      phase: p?.phase ?? null,
      text: p?.label ?? null,
      prozent: p?.percent ?? null,
      zaehler: p?.counts ?? null,
      letzteMeldung: p?.updatedAt ?? null,
    },
    offen: {
      demosPruefen: open?.demos ?? 0,
      briefeFreigeben: open?.letters ?? 0,
      support: open?.support ?? 0,
      warnungen: open?.alerts ?? 0,
    },
    pflichtangaben: settingsTodos(cfg).map((t) => t.label),
    seiten: SECTIONS.flatMap((s) => s.pages.map((pg) => ({ href: pg.href, label: `${s.label} → ${pg.label}` }))),
  };
}
