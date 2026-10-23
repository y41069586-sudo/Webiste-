import { eq, inArray } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { demos, leads, suppressionList } from '../db/schema';
import { addressHash, businessHash, emailHash, sourceHash } from '../leads/normalize';
import { getProviders } from '../providers';
import type { Actor } from '../types';
import { audit } from './audit';
import { transitionLead } from './lead-state';

export interface SuppressionSubject {
  name: string;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  source?: string;
  sourceId?: string;
  email?: string | null;
}

/** Alle Hashes, unter denen ein Betrieb gesperrt wird bzw. geprüft werden muss. */
export function suppressionHashes(s: SuppressionSubject): { hash: string; kind: string }[] {
  const out: { hash: string; kind: string }[] = [{ hash: businessHash(s.name, s), kind: 'business' }];
  if (s.street && s.houseNumber && s.postalCode) out.push({ hash: addressHash(s), kind: 'address' });
  if (s.source && s.sourceId) out.push({ hash: sourceHash(s.source, s.sourceId), kind: 'source_id' });
  if (s.email) out.push({ hash: emailHash(s.email), kind: 'email' });
  return out;
}

export async function isSuppressed(db: DbOrTx, s: SuppressionSubject): Promise<boolean> {
  const hashes = suppressionHashes(s).map((h) => h.hash);
  const hit = await db
    .select({ id: suppressionList.id })
    .from(suppressionList)
    .where(inArray(suppressionList.hash, hashes))
    .limit(1);
  return hit.length > 0;
}

export async function addSuppression(db: DbOrTx, s: SuppressionSubject, reason: string): Promise<void> {
  for (const h of suppressionHashes(s)) {
    await db
      .insert(suppressionList)
      .values({ hash: h.hash, kind: h.kind, reason })
      .onConflictDoNothing({ target: suppressionList.hash });
  }
}

/**
 * Widerspruch (Art. 21 DSGVO): Lead sperren, Demo und Dateien löschen,
 * personenbezogene Felder anonymisieren. Danach existiert nur noch der Hash.
 */
export async function optOutLead(db: DbOrTx, leadId: string, actor: Actor | string, reason: string): Promise<boolean> {
  const lead = await db.query.leads.findFirst({ where: eq(leads.id, leadId) });
  if (!lead) return false;
  if (lead.status === 'suppressed' && lead.anonymizedAt) return true;
  await addSuppression(
    db,
    {
      name: lead.businessName,
      street: lead.street,
      houseNumber: lead.houseNumber,
      postalCode: lead.postalCode,
      source: lead.source,
      sourceId: lead.sourceId,
    },
    reason,
  );
  // Demo-Dateien löschen
  const storage = getProviders().storage;
  const leadDemos = await db.select().from(demos).where(eq(demos.leadId, leadId));
  for (const d of leadDemos) {
    await storage.deletePrefix(`demos/${d.id}/`);
    await db
      .update(demos)
      .set({
        status: 'deleted',
        deletedAt: new Date(),
        contentJson: null,
        htmlStorageKey: null,
        screenshotDesktopKey: null,
        screenshotMobileKey: null,
        compositeKey: null,
      })
      .where(eq(demos.id, d.id));
  }
  await storage.deletePrefix(`letters/${leadId}/`);
  if (lead.status !== 'suppressed') {
    await transitionLead(db, leadId, 'suppressed', { actor, reason, soft: true }).catch(() => false);
    // Falls der Wechsel nicht erlaubt war (z. B. bereits Kunde), trotzdem sperren
    await db.update(leads).set({ status: 'suppressed', statusReason: reason }).where(eq(leads.id, leadId));
  }
  await anonymizeLead(db, leadId);
  await audit(db, { entity: 'lead', entityId: leadId, action: 'opt_out', actor, context: { reason } });
  return true;
}

/** Personenbezogene Felder eines Leads entfernen (Zeile bleibt für Statistik). */
export async function anonymizeLead(db: DbOrTx, leadId: string): Promise<void> {
  await db
    .update(leads)
    .set({
      businessName: '[gelöscht]',
      street: null,
      houseNumber: null,
      postalCode: null,
      phone: null,
      openingHours: null,
      websiteUri: null,
      rating: null,
      ratingCount: null,
      domainSuggestion: null,
      sourceId: `deleted:${leadId}`,
      googlePlaceId: null,
      anonymizedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));
}

/** Nur eine E-Mail-Adresse sperren (z. B. Abmeldelink in der Erinnerungs-Mail). */
export async function suppressEmail(db: DbOrTx, email: string, reason: string): Promise<void> {
  await db
    .insert(suppressionList)
    .values({ hash: emailHash(email), kind: 'email', reason })
    .onConflictDoNothing({ target: suppressionList.hash });
}

export async function isEmailSuppressed(db: DbOrTx, email: string): Promise<boolean> {
  const hit = await db
    .select({ id: suppressionList.id })
    .from(suppressionList)
    .where(eq(suppressionList.hash, emailHash(email)))
    .limit(1);
  return hit.length > 0;
}
