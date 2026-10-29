import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { ensureLetterVariants } from '../src/services/seed';

class Rollback extends Error {}
/** Läuft in einer Transaktion, die am Ende zurückgerollt wird – die gemeinsamen Testvarianten bleiben unverändert. */
async function inRollback(fn: (tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]) => Promise<void>) {
  await expect(
    getDb().transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    }),
  ).rejects.toBeInstanceOf(Rollback);
}
const active = async (tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]) =>
  (await tx.execute<{ name: string }>(sql`SELECT name FROM variants WHERE kind = 'letter' AND active ORDER BY name`)).rows.map(
    (r) => r.name,
  );

describe('Briefvorlagen startklar', () => {
  it('legt ohne Vorlagen alles an und aktiviert unter V4 die geprüften V4-Vorlagen statt blockierter Altvorlagen', async () => {
    await inRollback(async (tx) => {
      await tx.execute(sql`DELETE FROM variants WHERE kind = 'letter'`);
      const r = await ensureLetterVariants(tx, 'v4');
      expect(r.seeded).toBe(true);
      const names = await active(tx);
      expect(names).toContain('V4 handwerk A');
      expect(names).toContain('V4 allgemein A');
      expect(names).toContain('V4 F1 – Vorschau erneut');
      expect(names.every((n) => n.startsWith('V4 '))).toBe(true);
      // Zweiter Lauf ändert nichts
      expect((await ensureLetterVariants(tx, 'v4')).activated).toEqual([]);
      // Entscheidungen des Betreibers bleiben: pausierte V4-Vorlage wird nicht wieder aktiviert
      await tx.execute(sql`UPDATE variants SET active = false, status = 'paused' WHERE name = 'V4 handwerk A'`);
      await ensureLetterVariants(tx, 'v4');
      expect(await active(tx)).not.toContain('V4 handwerk A');
    });
  });

  it('ändert im Altangebot keine Aktivierung', async () => {
    await inRollback(async (tx) => {
      const before = await active(tx);
      const r = await ensureLetterVariants(tx, 'legacy');
      expect(r).toEqual({ seeded: false, activated: [] });
      expect(await active(tx)).toEqual(before);
    });
  });
});
