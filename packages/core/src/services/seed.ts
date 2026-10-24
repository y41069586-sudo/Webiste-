import { sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { variants } from '../db/schema';
import { maintainClaims } from '../claims/library';
import { SLOT_VARIANTS } from '../letters/slots';
import { DEFAULT_LETTER_VARIANTS } from '../letters/variants';
import { syncPlaybooks } from '../playbooks';

/**
 * Idempotentes Anlegen der Standarddaten. Die mitgelieferten Briefvarianten werden
 * aktualisiert (eigene Varianten bitte unter eigenem Namen anlegen); Gewicht/aktiv bleiben.
 */
export async function seedDefaults(db: DbOrTx = getDb()): Promise<void> {
  for (const v of DEFAULT_LETTER_VARIANTS) {
    // Erste Charge (B10): Branchen-Startvariante gegen die neutrale Variante A, 50/50 – B startet pausiert
    const startActive = v.name !== 'B – Ruf & Entwurf';
    await db
      .insert(variants)
      .values({
        kind: 'letter',
        name: v.name,
        sequence: v.sequence,
        content: v.content as unknown as Record<string, unknown>,
        active: startActive,
        status: startActive ? 'active' : 'paused',
        weight: 1,
      })
      .onConflictDoUpdate({
        target: [variants.kind, variants.name],
        set: { content: v.content as unknown as Record<string, unknown>, sequence: v.sequence },
      });
  }
  // Branchen-Startvarianten als Slot-Templates (B4/B5.3); Status und Gewicht bleiben bei Updates erhalten
  for (const v of SLOT_VARIANTS) {
    const slots = v.slots as unknown as Record<string, string>;
    await db
      .insert(variants)
      .values({
        kind: 'letter',
        name: v.name,
        sequence: v.sequence,
        industry: v.industry,
        slotsJson: slots,
        content: slots,
        hypothesis: v.hypothesis,
        active: true,
        status: 'active',
        weight: 1,
      })
      .onConflictDoUpdate({
        target: [variants.kind, variants.name],
        set: { slotsJson: slots, content: slots, industry: v.industry, sequence: v.sequence, hypothesis: v.hypothesis },
      });
  }
  await db.execute(sql`INSERT INTO counters (name, value) VALUES ('demos_reviewed', 0) ON CONFLICT DO NOTHING`);
  // Claims-Bibliothek und Playbooks aus den YAML-Dateien (B2/B3)
  await maintainClaims(db);
  await syncPlaybooks(db);
}
