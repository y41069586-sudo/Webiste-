import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { usableClaims, type ClaimRow } from '../claims/library';
import { getDb, type DbOrTx } from '../db/client';
import { leads, letters, variants } from '../db/schema';
import { claimRefs, type LetterSlots } from '../letters/slots';
import type { LetterVariantContent } from '../letters/variants';
import { getPlaybook } from '../playbooks';
import { enqueue, QUEUES } from '../queue';
import type { Industry } from '../types';
import { audit } from './audit';
import { transitionLead } from './lead-state';

export interface ChosenVariant {
  id: string;
  name: string;
  /** Altformat (Varianten ohne Slots) */
  content: LetterVariantContent;
  /** Slot-Template (B5.3), sonst null */
  slots: LetterSlots | null;
  industry: Industry | null;
  /** Für die Slots aufgelöste, freigegebene Claims */
  claims: ClaimRow[];
}

export interface ChooseVariantOptions {
  industry?: Industry | null;
  random?: number;
  now?: Date;
}

type VariantRow = typeof variants.$inferSelect;

/**
 * Für einen Lead nutzbare Varianten: aktiv, passende Sequenz, Branche des Leads oder neutral (ohne
 * Branche). Slot-Varianten nur, wenn alle referenzierten Claims freigegeben, gültig und im Playbook
 * erlaubt sind – sonst fällt die Branche automatisch auf die neutrale Variante zurück.
 */
export async function eligibleLetterVariants(
  db: DbOrTx,
  sequence: number,
  opts: Omit<ChooseVariantOptions, 'random'> = {},
): Promise<{ row: VariantRow; claims: ClaimRow[] }[]> {
  const industry = opts.industry ?? null;
  const rows = await db
    .select()
    .from(variants)
    .where(
      and(
        eq(variants.kind, 'letter'),
        eq(variants.active, true),
        eq(variants.status, 'active'),
        eq(variants.sequence, sequence >= 1 && sequence <= 3 ? sequence : 1),
        industry ? or(isNull(variants.industry), eq(variants.industry, industry)) : isNull(variants.industry),
      ),
    );
  const out: { row: VariantRow; claims: ClaimRow[] }[] = [];
  for (const row of rows) {
    const refs = row.slotsJson ? claimRefs(row.slotsJson as unknown as LetterSlots) : [];
    if (!refs.length) {
      out.push({ row, claims: [] });
      continue;
    }
    const target = (row.industry ?? industry) as Industry | null;
    if (!target) continue;
    const allowed = new Set(getPlaybook(target).allowed_claims);
    const usable = await usableClaims(db, { industry: target, ids: refs, now: opts.now });
    if (refs.every((id) => allowed.has(id) && usable.some((c) => c.id === id))) out.push({ row, claims: usable });
  }
  return out;
}

/** Variante nach Gewicht zufällig wählen (Gewichte setzt der Optimizer). */
export async function chooseLetterVariant(db: DbOrTx, sequence: number, opts: ChooseVariantOptions = {}): Promise<ChosenVariant> {
  const rows = await eligibleLetterVariants(db, sequence, opts);
  if (!rows.length) throw new Error(`Keine aktive Briefvariante für Sequenz ${sequence}`);
  const random = opts.random ?? Math.random();
  const total = rows.reduce((s, r) => s + Math.max(0, r.row.weight), 0) || rows.length;
  let pick = rows[rows.length - 1]!;
  let acc = 0;
  for (const r of rows) {
    acc += (Math.max(0, r.row.weight) || (total === rows.length ? 1 : 0)) / total;
    if (random < acc) {
      pick = r;
      break;
    }
  }
  return {
    id: pick.row.id,
    name: pick.row.name,
    content: pick.row.content as unknown as LetterVariantContent,
    slots: (pick.row.slotsJson as unknown as LetterSlots | null) ?? null,
    industry: pick.row.industry ?? null,
    claims: pick.claims,
  };
}

/** Brief freigeben (einzeln oder per Bulk). */
export async function approveLetter(letterId: string, actor: string): Promise<boolean> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const letter = await tx.query.letters.findFirst({ where: eq(letters.id, letterId) });
    if (!letter || letter.status !== 'generated') return false;
    // Kein Versand ohne bestandenen Wahrheits-Check (B5.4)
    if ((letter.truthCheckJson as { passed?: boolean } | null)?.passed !== true) return false;
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
      { leadId, sequence: sequence as 1 | 2 | 3, triggeredBy: actor, regenerate: true },
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
