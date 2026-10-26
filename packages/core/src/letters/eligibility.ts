import { and, eq, isNull, ne, or } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { leads } from '../db/schema';
import type { AppConfig } from '../config/settings';
import { effectiveSwitches } from '../config/service';
import { businessHash, normalizeBusinessName } from '../leads/normalize';
import { isSuppressed } from '../services/suppression';

/** Re-run locally before rendering, approving and sending; no source refresh/API calls. */
export async function assertLetterLeadEligible(db: DbOrTx, lead: typeof leads.$inferSelect, cfg: AppConfig): Promise<void> {
  if (lead.anonymizedAt || ['suppressed', 'rejected', 'expired'].includes(lead.status))
    throw new Error('Betrieb gesperrt oder nicht mehr geeignet.');
  if (
    !lead.businessName.trim() ||
    !lead.street?.trim() ||
    !lead.houseNumber?.trim() ||
    !/^\d{5}$/.test(lead.postalCode ?? '') ||
    !lead.city.trim() ||
    lead.country !== 'DE'
  )
    throw new Error('Zustellanschrift unvollständig; manuelle Prüfung erforderlich.');
  if (await isSuppressed(db, { name: lead.businessName, ...lead })) throw new Error('Sperrlisteneintrag: kein weiterer Brief.');
  if (!lead.sourceId?.trim() || !['osm', 'google_places', 'mock'].includes(lead.source))
    throw new Error('Datenquelle nicht nachvollziehbar.');
  if (lead.source === 'google_places' && !cfg.leadSource.googleTextSearchApproval.trim())
    throw new Error('Freigabe für Google als gespeicherte Primärquelle fehlt.');
  if (lead.source === 'mock' && !effectiveSwitches(cfg).dryRun && process.env.NODE_ENV !== 'test')
    throw new Error('Fiktive Testdaten sind nicht für echten Versand zulässig.');
  if (lead.hasWebsite && !lead.socialOnly) throw new Error('Eigene Website vorhanden; Eignung erneut prüfen.');
  const sameArea = await db
    .select()
    .from(leads)
    .where(
      and(
        ne(leads.id, lead.id),
        isNull(leads.anonymizedAt),
        or(eq(leads.identityHash, businessHash(lead.businessName, lead)), eq(leads.postalCode, lead.postalCode!)),
      ),
    );
  if (
    sameArea.some(
      (other) =>
        businessHash(other.businessName, other) === businessHash(lead.businessName, lead) ||
        (normalizeBusinessName(other.businessName) === normalizeBusinessName(lead.businessName) &&
          other.street === lead.street &&
          other.houseNumber === lead.houseNumber),
    )
  )
    throw new Error('Mögliche Betriebsdublette: vor einem weiteren Brief zusammenführen und prüfen.');
}
