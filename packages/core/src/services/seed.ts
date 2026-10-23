import { sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { variants } from '../db/schema';
import { DEFAULT_LETTER_VARIANTS } from '../letters/variants';

/**
 * Idempotentes Anlegen der Standarddaten. Die mitgelieferten Briefvarianten werden
 * aktualisiert (eigene Varianten bitte unter eigenem Namen anlegen); Gewicht/aktiv bleiben.
 */
export async function seedDefaults(db: DbOrTx = getDb()): Promise<void> {
  for (const v of DEFAULT_LETTER_VARIANTS) {
    await db
      .insert(variants)
      .values({
        kind: 'letter',
        name: v.name,
        sequence: v.sequence,
        content: v.content as unknown as Record<string, unknown>,
        active: true,
        weight: 1,
      })
      .onConflictDoUpdate({
        target: [variants.kind, variants.name],
        set: { content: v.content as unknown as Record<string, unknown>, sequence: v.sequence },
      });
  }
  await db.execute(sql`INSERT INTO counters (name, value) VALUES ('demos_reviewed', 0) ON CONFLICT DO NOTHING`);
}
