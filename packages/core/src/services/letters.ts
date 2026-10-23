import { and, eq, inArray } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { leads, letters, variants } from '../db/schema';
import type { LetterVariantContent } from '../letters/variants';
import { enqueue, QUEUES } from '../queue';
import { audit } from './audit';
import { transitionLead } from './lead-state';

export interface ChosenVariant {
  id: string;
  name: string;
  content: LetterVariantContent;
}

/** Variante nach Gewicht zufällig wählen (Gewichte setzt der Optimizer). */
export async function chooseLetterVariant(db: DbOrTx, sequence: number, random = Math.random()): Promise<ChosenVariant> {
  const rows = await db
    .select()
    .from(variants)
    .where(and(eq(variants.kind, 'letter'), eq(variants.active, true), eq(variants.sequence, sequence === 2 ? 2 : 1)));
  if (!rows.length) throw new Error(`Keine aktive Briefvariante für Sequenz ${sequence}`);
  const total = rows.reduce((s, r) => s + Math.max(0, r.weight), 0) || rows.length;
  let acc = 0;
  for (const r of rows) {
    acc += (Math.max(0, r.weight) || (total === rows.length ? 1 : 0)) / total;
    if (random < acc) return { id: r.id, name: r.name, content: r.content as unknown as LetterVariantContent };
  }
  const last = rows[rows.length - 1]!;
  return { id: last.id, name: last.name, content: last.content as unknown as LetterVariantContent };
}

/** Brief freigeben (einzeln oder per Bulk). */
export async function approveLetter(letterId: string, actor: string): Promise<boolean> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const letter = await tx.query.letters.findFirst({ where: eq(letters.id, letterId) });
    if (!letter || letter.status !== 'generated') return false;
    await tx
      .update(letters)
      .set({ status: 'approved', approvedBy: actor, approvedAt: new Date(), updatedAt: new Date() })
      .where(eq(letters.id, letterId));
    if (letter.sequence === 1 && !letter.isTest)
      await transitionLead(tx, letter.leadId, 'letter_approved', { actor, soft: true });
    await audit(tx, { entity: 'letter', entityId: letterId, action: 'approve', actor });
    return true;
  });
}

export async function bulkApproveLetters(ids: string[], actor: string): Promise<number> {
  let n = 0;
  for (const id of ids) if (await approveLetter(id, actor)) n++;
  return n;
}

/** Ablehnen: Brief verwerfen und optional neu erzeugen (andere Variante/neuer Domain-Check). */
export async function rejectLetter(letterId: string, actor: string, note: string, regenerate: boolean): Promise<void> {
  const db = getDb();
  let leadId = '';
  let sequence = 1;
  await db.transaction(async (tx) => {
    const letter = await tx.query.letters.findFirst({ where: eq(letters.id, letterId) });
    if (!letter) throw new Error('Brief nicht gefunden');
    if (!['generated', 'approved', 'failed'].includes(letter.status))
      throw new Error(`Brief im Status ${letter.status} kann nicht verworfen werden`);
    leadId = letter.leadId;
    sequence = letter.sequence;
    await tx.delete(letters).where(eq(letters.id, letterId));
    if (letter.sequence === 1 && !letter.isTest) {
      await transitionLead(tx, letter.leadId, 'demo_published', { actor, reason: `Brief verworfen: ${note}`, soft: true });
    }
    await audit(tx, {
      entity: 'letter',
      entityId: letterId,
      action: regenerate ? 'reject_regenerate' : 'reject',
      actor,
      context: { note },
    });
  });
  if (regenerate && sequence >= 1) {
    await enqueue(
      QUEUES.generateLetter,
      { leadId, sequence: sequence as 1 | 2, triggeredBy: actor, regenerate: true },
      { singletonKey: `letter:${leadId}:${sequence}:${Date.now()}` },
    );
  }
}

/** Offene Briefe (für Dashboard-Zähler). */
export async function pendingLetterCount(db: DbOrTx): Promise<number> {
  const rows = await db
    .select({ id: letters.id })
    .from(letters)
    .where(inArray(letters.status, ['generated']));
  return rows.length;
}

export async function leadForLetter(db: DbOrTx, letterId: string) {
  const letter = await db.query.letters.findFirst({ where: eq(letters.id, letterId) });
  if (!letter) return null;
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, letter.leadId) });
  return { letter, lead };
}
