import { eq } from 'drizzle-orm';
import { renderMaintenanceHtml } from '@wbm/templates';
import { getDb } from '../db/client';
import { customers, sites } from '../db/schema';
import { errInfo, logger } from '../logger';
import { getProviders } from '../providers';
import { enqueue, QUEUES } from '../queue';
import { audit } from './audit';

/** Warum eine Kundenseite pausiert ist (steht in `sites.status_reason` als `wartung:{grund}`). */
export type MaintenanceReason = 'payment' | 'guarantee' | 'cancelled' | 'admin';

const PREFIX = 'wartung:';

export function maintenanceReasonOf(statusReason: string | null | undefined): MaintenanceReason | null {
  if (!statusReason?.startsWith(PREFIX)) return null;
  return statusReason.slice(PREFIX.length) as MaintenanceReason;
}

/**
 * Seite in den Wartungsmodus versetzen bzw. wiederherstellen. Ist die Seite schon beim Hosting, wird
 * eine neutrale Ersatzseite ausgeliefert (ohne Grund); beim Wiederherstellen wird die aktuelle Version
 * neu veröffentlicht. Idempotent.
 */
export async function setSiteMaintenance(
  siteId: string,
  on: boolean,
  reason: MaintenanceReason,
  actor: string,
): Promise<'paused' | 'restored' | 'unchanged'> {
  const db = getDb();
  const site = await db.query.sites.findFirst({ where: eq(sites.id, siteId) });
  if (!site) throw new Error('Seite nicht gefunden');
  const current = site.status === 'suspended' ? maintenanceReasonOf(site.statusReason) : null;

  if (on) {
    if (site.status === 'suspended') return 'unchanged';
    const customer = await db.query.customers.findFirst({ where: eq(customers.id, site.customerId) });
    const hosting = getProviders().hosting;
    if (site.hostingProjectId && site.hostingProvider === hosting.name) {
      try {
        await hosting.deploy(site.hostingProjectId, [
          {
            path: '/index.html',
            content: renderMaintenanceHtml({ company: customer?.company ?? 'Website' }),
            contentType: 'text/html; charset=utf-8',
          },
        ]);
      } catch (err) {
        // Ohne Ersatzseite bleibt der Status unverändert, damit der Aufrufer (Job/Webhook) es erneut versucht
        logger.error({ siteId, ...errInfo(err) }, 'Wartungsseite konnte nicht veröffentlicht werden');
        throw err;
      }
    }
    await db
      .update(sites)
      .set({ status: 'suspended', statusReason: `${PREFIX}${reason}`, updatedAt: new Date() })
      .where(eq(sites.id, siteId));
    await audit(db, { entity: 'site', entityId: siteId, action: 'maintenance_on', actor, context: { reason } });
    return 'paused';
  }

  if (site.status !== 'suspended') return 'unchanged';
  // Nur den eigenen Grund aufheben (z. B. Zahlung wieder da ≠ Garantie-Rückabwicklung)
  if (current && current !== reason && reason !== 'admin') return 'unchanged';
  await db
    .update(sites)
    .set({ status: site.liveAt ? 'live' : 'preview', statusReason: null, updatedAt: new Date() })
    .where(eq(sites.id, siteId));
  await audit(db, { entity: 'site', entityId: siteId, action: 'maintenance_off', actor, context: { reason } });
  if (site.liveAt && site.hostingProjectId) {
    await enqueue(QUEUES.deploySite, { siteId }, { singletonKey: `deploy-${siteId}-${Date.now()}` });
  }
  return 'restored';
}
