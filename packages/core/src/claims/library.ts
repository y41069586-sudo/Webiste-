import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, asc, eq, inArray, lte, ne, sql } from 'drizzle-orm';
import { parse } from 'yaml';
import { z } from 'zod';
import { getDb, type DbOrTx } from '../db/client';
import { claims } from '../db/schema';
import { CLAIM_CHECK_RESULTS, INDUSTRIES, type Industry } from '../types';
import { sha256 } from '../util/crypto';
import { addMonths } from '../util/time';
import { audit } from '../services/audit';
import { raiseAlert } from '../services/budget';

/**
 * Claims-Bibliothek (Update 2, B1/B2). Die YAML-Datei liefert Text, Quelle und Prüfergebnis;
 * Freigaben setzt nur der Betreiber im Dashboard, Sperren zusätzlich der Ablauf-Job.
 */

/** Gültigkeit einer Quelle ab Veröffentlichung (B2: 24 Monate). */
export const CLAIM_MAX_AGE_MONTHS = 24;

const dateSchema = z.union([z.date(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((v) => {
  const d = typeof v === 'string' ? new Date(`${v}T00:00:00Z`) : v;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
});

export const claimDefinitionSchema = z.object({
  id: z.string().regex(/^[A-Z0-9_]+$/),
  text_de: z.string().min(10),
  footnote_de: z.string().min(5),
  source_publisher: z.string().min(2),
  source_title: z.string().min(2),
  source_url: z.url({ protocol: /^https$/ }),
  published_at: dateSchema,
  sample: z.number().int().positive().optional(),
  population: z.string().optional(),
  scope: z.string().regex(/^[A-Z]{2}$/),
  industries: z.array(z.enum(INDUSTRIES)).default([]),
  source_type: z.enum(['external', 'own_data']).default('external'),
  /** In der Datei gesperrt (z. B. US-Daten) – lässt sich im Dashboard nicht freigeben */
  blocked: z.boolean().default(false),
  note: z.string().optional(),
  check: z
    .object({
      checked_at: dateSchema,
      result: z.enum(CLAIM_CHECK_RESULTS),
      quote: z.string().min(5),
      note: z.string().optional(),
    })
    .optional(),
});
export type ClaimDefinition = z.infer<typeof claimDefinitionSchema>;

export function claimsFilePath(): string {
  if (process.env.CLAIMS_FILE) return process.env.CLAIMS_FILE;
  // Bewusst kein `new URL(rel, import.meta.url)`, damit Bundler den Pfad nicht als Asset behandeln
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.join(here, '..', '..', 'claims', ['claims', 'yaml'].join('.'));
}

export function parseClaims(yamlText: string): ClaimDefinition[] {
  const raw: unknown = parse(yamlText);
  const list = z.array(claimDefinitionSchema).parse(raw);
  const ids = new Set<string>();
  for (const c of list) {
    if (ids.has(c.id)) throw new Error(`Claim-ID doppelt: ${c.id}`);
    ids.add(c.id);
  }
  return list;
}

let cache: { path: string; list: ClaimDefinition[] } | undefined;

export function loadClaimDefinitions(file = claimsFilePath()): ClaimDefinition[] {
  if (cache?.path === file) return cache.list;
  if (!existsSync(file)) throw new Error(`Claims-Datei fehlt (${file}).`);
  const list = parseClaims(readFileSync(file, 'utf8'));
  cache = { path: file, list };
  return list;
}

export function claimExpiry(publishedAt: Date): Date {
  return addMonths(publishedAt, CLAIM_MAX_AGE_MONTHS);
}

export function claimContentHash(c: ClaimDefinition): string {
  return sha256(
    JSON.stringify([c.text_de, c.footnote_de, c.source_url, c.published_at.toISOString(), c.scope, c.sample ?? null]),
  );
}

/** Warum ein Claim (noch) nicht freigegeben werden darf; null = Freigabe möglich. */
export function approvalBlocker(
  row: Pick<typeof claims.$inferSelect, 'status' | 'blockedReason' | 'scope' | 'expiresAt' | 'checkResult' | 'sourceType'>,
  now = new Date(),
): string | null {
  if (row.status === 'approved') return 'Bereits freigegeben.';
  if (row.expiresAt <= now) return 'Quelle älter als 24 Monate – neuere Studie suchen.';
  if (row.blockedReason === 'yaml') return 'In der Claims-Datei gesperrt.';
  if (row.blockedReason === 'removed') return 'Nicht mehr in der Claims-Datei.';
  if (row.scope !== 'DE') return `Daten aus ${row.scope} – für Briefe gesperrt (B1.5).`;
  if (row.sourceType === 'own_data') return 'Eigene Daten erst nach Berechnung aus echten Messwerten (B1.6).';
  if (row.checkResult !== 'ok' && row.checkResult !== 'corrected') {
    return row.checkResult === 'primary_missing'
      ? 'Primärquelle noch nicht geprüft – erst Primärquelle eintragen und verifizieren.'
      : 'Quellenprüfung nicht bestanden.';
  }
  return null;
}

export interface ClaimSyncSummary {
  created: number;
  updated: number;
  resetToVerification: number;
  blocked: number;
  removed: number;
}

/**
 * Gleicht die Claims-Datei mit der Tabelle ab (idempotent). Neue Claims starten als
 * needs_verification (bzw. blocked, wenn gesperrt oder abgelaufen); geänderter Inhalt eines
 * freigegebenen Claims setzt ihn auf needs_verification zurück.
 */
export async function syncClaims(
  db: DbOrTx = getDb(),
  opts: { definitions?: ClaimDefinition[]; now?: Date; actor?: string } = {},
): Promise<ClaimSyncSummary> {
  const defs = opts.definitions ?? loadClaimDefinitions();
  const now = opts.now ?? new Date();
  const actor = opts.actor ?? 'system';
  const summary: ClaimSyncSummary = { created: 0, updated: 0, resetToVerification: 0, blocked: 0, removed: 0 };
  const existing = new Map((await db.select().from(claims)).map((r) => [r.id, r]));

  for (const d of defs) {
    const hash = claimContentHash(d);
    const expiresAt = claimExpiry(d.published_at);
    const fileBlock = d.blocked ? 'yaml' : d.scope !== 'DE' ? 'scope' : expiresAt <= now ? 'expired' : null;
    const base = {
      textDe: d.text_de,
      footnoteDe: d.footnote_de,
      sourcePublisher: d.source_publisher,
      sourceTitle: d.source_title,
      sourceUrl: d.source_url,
      publishedAt: d.published_at,
      sample: d.sample ?? null,
      population: d.population ?? null,
      scope: d.scope,
      industries: d.industries,
      expiresAt,
      sourceType: d.source_type,
      note: d.note ?? null,
      checkResult: d.check?.result ?? null,
      checkQuote: d.check?.quote ?? null,
      checkNote: d.check?.note ?? null,
      checkedAt: d.check?.checked_at ?? null,
      contentHash: hash,
      updatedAt: now,
    };
    const row = existing.get(d.id);
    existing.delete(d.id);
    if (!row) {
      await db.insert(claims).values({
        id: d.id,
        ...base,
        status: fileBlock ? 'blocked' : 'needs_verification',
        blockedReason: fileBlock,
      });
      summary.created++;
      if (fileBlock) summary.blocked++;
      if (fileBlock === 'expired') await alertExpired(db, d.id, d.source_title);
      continue;
    }
    const changed = row.contentHash !== hash;
    let status = row.status;
    let blockedReason = row.blockedReason;
    let verifiedBy = row.verifiedBy;
    let verifiedAt = row.verifiedAt;
    if (fileBlock) {
      if (status !== 'blocked' || blockedReason !== fileBlock) {
        status = 'blocked';
        blockedReason = fileBlock;
        summary.blocked++;
        if (fileBlock === 'expired') await alertExpired(db, d.id, d.source_title);
      }
    } else if (changed || blockedReason === 'yaml' || blockedReason === 'removed' || blockedReason === 'scope') {
      // geänderter Text/Quelle oder aufgehobene Datei-Sperre → neue Freigabe nötig
      if (status === 'approved') summary.resetToVerification++;
      if (status !== 'blocked' || blockedReason !== 'manual') {
        status = 'needs_verification';
        blockedReason = null;
        verifiedBy = null;
        verifiedAt = null;
      }
    }
    await db
      .update(claims)
      .set({ ...base, status, blockedReason, verifiedBy, verifiedAt })
      .where(eq(claims.id, d.id));
    summary.updated++;
    if (changed && row.status === 'approved') {
      await audit(db, {
        entity: 'claim',
        entityId: d.id,
        action: 'reset_to_verification',
        actor,
        context: { reason: 'Inhalt der Claims-Datei geändert' },
      });
    }
  }
  // nicht mehr in der Datei → sperren (Briefe mit Verweis auf die ID bleiben nachvollziehbar)
  for (const row of existing.values()) {
    if (row.status === 'blocked' && row.blockedReason === 'removed') continue;
    await db.update(claims).set({ status: 'blocked', blockedReason: 'removed', updatedAt: now }).where(eq(claims.id, row.id));
    summary.removed++;
  }
  return summary;
}

async function alertExpired(db: DbOrTx, id: string, title: string): Promise<void> {
  await raiseAlert(db, {
    level: 'warn',
    code: `claim_expired:${id}`,
    message: `Claim ${id}: Quelle veraltet (älter als ${CLAIM_MAX_AGE_MONTHS} Monate), neuere Studie suchen. Quelle: „${title}“.`,
    context: { claimId: id },
  });
}

/** Sperrt abgelaufene Claims und meldet sie (täglicher Job). */
export async function expireClaims(db: DbOrTx = getDb(), now = new Date()): Promise<string[]> {
  const rows = await db
    .select({ id: claims.id, title: claims.sourceTitle })
    .from(claims)
    .where(and(lte(claims.expiresAt, now), ne(claims.status, 'blocked')));
  for (const r of rows) {
    await db.update(claims).set({ status: 'blocked', blockedReason: 'expired', updatedAt: now }).where(eq(claims.id, r.id));
    await audit(db, { entity: 'claim', entityId: r.id, action: 'expired', actor: 'system', context: {} });
    await alertExpired(db, r.id, r.title);
  }
  return rows.map((r) => r.id);
}

/** Abgleich + Ablauf in einem Schritt (Worker-Start und täglicher Job). */
export async function maintainClaims(db: DbOrTx = getDb(), now = new Date()) {
  const sync = await syncClaims(db, { now });
  const expired = await expireClaims(db, now);
  return { ...sync, expired };
}

export class ClaimApprovalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaimApprovalError';
  }
}

/** Freigabe durch den Betreiber im Dashboard (B2: „erst nach meinem OK“). */
export async function approveClaim(db: DbOrTx, id: string, actor: string, now = new Date()): Promise<void> {
  const row = await db.query.claims.findFirst({ where: eq(claims.id, id) });
  if (!row) throw new ClaimApprovalError(`Claim ${id} nicht gefunden.`);
  // Eine manuelle Sperre hebt die erneute Freigabe auf; sonst gelten dieselben Regeln
  const blocker = approvalBlocker(row, now);
  if (blocker) throw new ClaimApprovalError(blocker);
  await db
    .update(claims)
    .set({ status: 'approved', blockedReason: null, verifiedBy: actor, verifiedAt: now, updatedAt: now })
    .where(eq(claims.id, id));
  await audit(db, {
    entity: 'claim',
    entityId: id,
    action: 'approved',
    actor,
    context: { contentHash: row.contentHash, checkResult: row.checkResult },
  });
}

export async function blockClaim(db: DbOrTx, id: string, actor: string, now = new Date()): Promise<void> {
  const res = await db
    .update(claims)
    .set({ status: 'blocked', blockedReason: 'manual', verifiedBy: null, verifiedAt: null, updatedAt: now })
    .where(eq(claims.id, id))
    .returning({ id: claims.id });
  if (!res.length) throw new ClaimApprovalError(`Claim ${id} nicht gefunden.`);
  await audit(db, { entity: 'claim', entityId: id, action: 'blocked', actor, context: {} });
}

/** Manuelle Sperre aufheben (zurück in die Prüfung, nicht direkt freigegeben). */
export async function unblockClaim(db: DbOrTx, id: string, actor: string, now = new Date()): Promise<void> {
  const res = await db
    .update(claims)
    .set({ status: 'needs_verification', blockedReason: null, updatedAt: now })
    .where(and(eq(claims.id, id), eq(claims.status, 'blocked'), eq(claims.blockedReason, 'manual')))
    .returning({ id: claims.id });
  if (!res.length) throw new ClaimApprovalError('Nur manuell gesperrte Claims lassen sich entsperren.');
  await audit(db, { entity: 'claim', entityId: id, action: 'unblocked', actor, context: {} });
}

export type ClaimRow = typeof claims.$inferSelect;

export async function listClaims(db: DbOrTx = getDb()): Promise<ClaimRow[]> {
  return db
    .select()
    .from(claims)
    .orderBy(sql`CASE ${claims.status} WHEN 'needs_verification' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END`, asc(claims.id));
}

/**
 * Für Briefe nutzbare Claims: freigegeben, nicht abgelaufen, Deutschland, passende Branche.
 * Grundlage für Slot-Templates und Wahrheits-Check (L2).
 */
export async function usableClaims(
  db: DbOrTx,
  opts: { industry?: Industry; ids?: string[]; now?: Date } = {},
): Promise<ClaimRow[]> {
  const now = opts.now ?? new Date();
  const rows = await db
    .select()
    .from(claims)
    .where(
      and(
        eq(claims.status, 'approved'),
        eq(claims.scope, 'DE'),
        sql`${claims.expiresAt} > ${now}`,
        opts.ids?.length ? inArray(claims.id, opts.ids) : undefined,
        opts.industry ? sql`${opts.industry} = ANY(${claims.industries})` : undefined,
      ),
    )
    .orderBy(asc(claims.id));
  return rows;
}

/**
 * Claims für die öffentliche Quellenseite (B5.5): alles, was in Briefen steht oder gerade
 * verwendet werden darf (freigegeben und in einer aktiven Variante referenziert).
 */
export async function sourcesPageClaims(db: DbOrTx = getDb()): Promise<(ClaimRow & { inUse: boolean })[]> {
  const rows = await db.execute<{ id: string; in_use: boolean }>(sql`
    SELECT c.id,
           (c.status = 'approved' AND c.expires_at > now() AND EXISTS (
              SELECT 1 FROM variants v
              WHERE v.active AND v.status = 'active' AND v.slots_json::text LIKE '%{CLAIM:' || c.id || '}%'
           )) AS in_use
    FROM claims c
    WHERE EXISTS (SELECT 1 FROM claim_usages u WHERE u.claim_id = c.id)
       OR (c.status = 'approved' AND c.expires_at > now() AND EXISTS (
              SELECT 1 FROM variants v
              WHERE v.active AND v.status = 'active' AND v.slots_json::text LIKE '%{CLAIM:' || c.id || '}%'
           ))`);
  if (!rows.rows.length) return [];
  const inUse = new Map(rows.rows.map((r) => [r.id, r.in_use]));
  const full = await db
    .select()
    .from(claims)
    .where(inArray(claims.id, [...inUse.keys()]))
    .orderBy(asc(claims.id));
  return full.map((c) => ({ ...c, inUse: Boolean(inUse.get(c.id)) }));
}
