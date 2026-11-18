import { sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  resetAt: Date;
}

/**
 * Fester-Fenster-Ratenbegrenzung in Postgres (funktioniert über mehrere Prozesse).
 * `key` darf keine Klartext-PII enthalten (z. B. gehashte IP verwenden).
 */
export async function rateLimit(db: DbOrTx, key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const res = await db.execute<{ count: number; window_start: Date }>(sql`
    INSERT INTO rate_limits (key, window_start, count) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) THEN now() ELSE rate_limits.window_start END
    RETURNING count, window_start
  `);
  const row = res.rows[0]!;
  const start = new Date(row.window_start);
  return {
    allowed: row.count <= limit,
    count: row.count,
    limit,
    resetAt: new Date(start.getTime() + windowSeconds * 1000),
  };
}

/**
 * Mehrere Begrenzungen in einer einzigen Abfrage (Tempo, 18.11.2026: jede Abfrage kostet von der Web-Funktion aus
 * ~0,1 s). Gleiche Zählweise wie `rateLimit`; Schlüssel müssen verschieden sein. Ergebnis in derselben Reihenfolge.
 */
export async function rateLimitMany(
  db: DbOrTx,
  checks: { key: string; limit: number; windowSeconds: number }[],
): Promise<RateLimitResult[]> {
  if (!checks.length) return [];
  if (new Set(checks.map((c) => c.key)).size !== checks.length) throw new Error('rateLimitMany: doppelter Schlüssel');
  const values = sql.join(
    checks.map((c) => sql`(${c.key}::text, ${Math.round(c.windowSeconds)}::int)`),
    sql`, `,
  );
  const res = await db.execute<{ key: string; count: number; window_start: Date }>(sql`
    WITH input(key, win) AS (VALUES ${values})
    INSERT INTO rate_limits (key, window_start, count)
    SELECT key, now(), 1 FROM input
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => (SELECT win FROM input WHERE input.key = EXCLUDED.key)) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => (SELECT win FROM input WHERE input.key = EXCLUDED.key)) THEN now() ELSE rate_limits.window_start END
    RETURNING key, count, window_start
  `);
  const byKey = new Map(res.rows.map((r) => [r.key, r]));
  return checks.map((c) => {
    const row = byKey.get(c.key)!;
    const start = new Date(row.window_start);
    return {
      allowed: row.count <= c.limit,
      count: row.count,
      limit: c.limit,
      resetAt: new Date(start.getTime() + c.windowSeconds * 1000),
    };
  });
}

export async function resetRateLimit(db: DbOrTx, key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

export async function cleanupRateLimits(db: DbOrTx): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
}
