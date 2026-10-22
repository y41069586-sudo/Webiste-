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

export async function resetRateLimit(db: DbOrTx, key: string): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

export async function cleanupRateLimits(db: DbOrTx): Promise<void> {
  await db.execute(sql`DELETE FROM rate_limits WHERE window_start < now() - interval '2 days'`);
}
