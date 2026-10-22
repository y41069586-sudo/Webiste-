import type { DbOrTx } from '../db/client';
import { auditLog } from '../db/schema';
import type { Actor } from '../types';

export interface AuditEntry {
  entity: string;
  entityId: string;
  action: string;
  actor: Actor | string;
  context?: Record<string, unknown>;
}

/** Schreibt einen Eintrag ins Audit-Log. Kontext darf keine Klartext-PII enthalten. */
export async function audit(db: DbOrTx, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    actor: entry.actor,
    contextJson: entry.context ?? {},
  });
}
