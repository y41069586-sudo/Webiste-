import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { auditLog, letters } from '../db/schema';
import { canTransitionLetter } from '../letters/state';
import type { LetterStatus } from '../types';

/**
 * Zentrale Statusänderung für Briefe (10.11.2026): prüft jeden Wechsel gegen die Übergangsmatrix und schreibt nur,
 * wenn der Brief noch im erwarteten Ausgangsstatus ist (Schutz vor Race Conditions). Vor der Übergabe an den
 * Briefdienst (`requireNoProviderId`) darf zusätzlich keine Auftragsnummer existieren.
 * Gibt zurück, ob der Wechsel stattgefunden hat. Ein nach der Matrix unzulässiger Wechsel ist ein Programmfehler und
 * wirft, statt still einen falschen Status zu schreiben.
 */
export async function changeLetterStatus(
  db: DbOrTx,
  letterId: string,
  from: LetterStatus[],
  to: LetterStatus,
  fields: Partial<typeof letters.$inferInsert> = {},
  opts: { requireNoProviderId?: boolean } = {},
): Promise<boolean> {
  for (const f of from) if (!canTransitionLetter(f, to)) throw new Error(`Unzulässiger Briefstatus-Wechsel ${f} → ${to}`);
  const rows = await db
    .update(letters)
    .set({ ...fields, status: to, updatedAt: new Date() })
    .where(
      and(
        eq(letters.id, letterId),
        inArray(letters.status, from),
        ...(opts.requireNoProviderId ? [isNull(letters.providerLetterId)] : []),
      ),
    )
    .returning({ id: letters.id });
  return rows.length > 0;
}

/** Wurde die Übergabe dieses Briefs an den Briefdienst je begonnen? (auch ohne bestätigte Auftragsnummer) */
export async function handoverAttempted(db: DbOrTx, letterId: string): Promise<boolean> {
  const rows = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(and(eq(auditLog.entity, 'letter'), eq(auditLog.entityId, letterId), eq(auditLog.action, 'handover_started')))
    .limit(1);
  return rows.length > 0;
}

export const HANDOVER_UNCLEAR =
  'Die Übergabe an easyNova wurde begonnen, die Auftragsnummer kam aber nie an. easyNova bietet keine Suche nach Referenz. Bitte im easyNova-Portal prüfen, ob der Brief dort liegt, bevor er neu erzeugt wird. Ein erneuter Versand desselben Briefs ist sicher, weil der gleiche Idempotenz-Schlüssel denselben Auftrag liefert.';
