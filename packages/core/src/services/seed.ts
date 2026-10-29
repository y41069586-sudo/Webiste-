import { sql } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { variants } from '../db/schema';
import { maintainClaims } from '../claims/library';
import { SLOT_VARIANTS } from '../letters/slots';
import { DEFAULT_LETTER_VARIANTS } from '../letters/variants';
import { v4LetterVariant, V4_LETTER_INDUSTRIES } from '../letters/conversion-v4';
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
  // New candidates are review-only, never automatically added to active allocations.
  for (const industry of V4_LETTER_INDUSTRIES) {
    for (const arm of ['A', 'B', 'C'] as const) {
      await db
        .insert(variants)
        .values({
          kind: 'letter',
          name: `V4 ${industry} ${arm}`,
          industry,
          sequence: 1,
          content: v4LetterVariant(industry, arm) as unknown as Record<string, unknown>,
          status: 'paused',
          active: false,
          weight: 1,
          hypothesis: arm === 'A' ? 'Bestehende Kontrolle' : arm === 'B' ? 'Vorschau zuerst' : 'Branchennutzen zuerst',
        })
        .onConflictDoNothing({ target: [variants.kind, variants.name] });
    }
  }
  // Safe V4 follow-up copy is prepared for review, never silently replacing active legacy sequences.
  for (const sequence of [2, 3] as const) {
    await db
      .insert(variants)
      .values({
        kind: 'letter',
        name: sequence === 2 ? 'V4 F1 – Vorschau erneut' : 'V4 F2 – Geprüfter neuer Entwurf',
        sequence,
        content: v4LetterVariant('dienstleistung', 'A', sequence) as unknown as Record<string, unknown>,
        active: false,
        status: 'paused',
        weight: 1,
        hypothesis: 'Keine neue Wirkungshypothese: sachliche Folgekorrespondenz erst nach belegter vorheriger Sendung.',
      })
      .onConflictDoNothing({ target: [variants.kind, variants.name] });
  }
  await db.execute(sql`INSERT INTO counters (name, value) VALUES ('demos_reviewed', 0) ON CONFLICT DO NOTHING`);
  // Claims-Bibliothek und Playbooks aus den YAML-Dateien (B2/B3)
  await maintainClaims(db);
  await syncPlaybooks(db);
}

/**
 * Briefvorlagen startklar machen (läuft bei jedem Worker-Start, idempotent):
 * 1. Ohne jede Briefvorlage (z. B. Produktion ohne Migrationslauf) werden die Standarddaten angelegt.
 * 2. Im V4-Angebot, solange noch keine V4-Erstbrief-Vorlage aktiv ist: je Branche die V4-Kontrolle „A“ und eine
 *    allgemeine V4-Vorlage (für Branchen ohne eigene) aktivieren, die V4-Folgebriefe ebenso, und die älteren
 *    Vorlagen pausieren – diese würden unter V4 vom Wahrheits-Check blockiert. Spätere Entscheidungen des Betreibers
 *    (Labor → Varianten) bleiben unberührt, weil Schritt 2 nur beim ersten Mal greift.
 */
export async function ensureLetterVariants(
  db: DbOrTx = getDb(),
  offerVersion: 'v4' | 'legacy' = 'v4',
): Promise<{
  seeded: boolean;
  activated: string[];
}> {
  const count = await db.execute<{ n: number }>(sql`SELECT count(*)::int AS n FROM variants WHERE kind = 'letter'`);
  const seeded = (count.rows[0]?.n ?? 0) === 0;
  if (seeded) await seedDefaults(db);
  if (offerVersion !== 'v4') return { seeded, activated: [] };
  await db
    .insert(variants)
    .values({
      kind: 'letter',
      name: 'V4 allgemein A',
      sequence: 1,
      content: v4LetterVariant('dienstleistung', 'A') as unknown as Record<string, unknown>,
      status: 'paused',
      active: false,
      weight: 1,
      hypothesis: 'Allgemeine Kontrolle für Branchen ohne eigene V4-Vorlage',
    })
    .onConflictDoNothing({ target: [variants.kind, variants.name] });
  const v4Active = await db.execute<{ n: number }>(
    sql`SELECT count(*)::int AS n FROM variants WHERE kind = 'letter' AND sequence = 1 AND active AND name LIKE 'V4 %'`,
  );
  if ((v4Active.rows[0]?.n ?? 0) > 0) return { seeded, activated: [] };
  const names = [
    ...V4_LETTER_INDUSTRIES.map((i) => `V4 ${i} A`),
    'V4 allgemein A',
    'V4 F1 – Vorschau erneut',
    'V4 F2 – Geprüfter neuer Entwurf',
  ];
  await db.execute(
    sql`UPDATE variants SET active = false, status = 'paused' WHERE kind = 'letter' AND name NOT LIKE 'V4 %' AND active`,
  );
  const r = await db.execute<{ name: string }>(
    sql`UPDATE variants SET active = true, status = 'active'
         WHERE kind = 'letter' AND name IN (${sql.join(
           names.map((n) => sql`${n}`),
           sql`, `,
         )}) RETURNING name`,
  );
  return { seeded, activated: r.rows.map((x) => x.name) };
}
