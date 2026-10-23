import { and, asc, inArray, isNull } from 'drizzle-orm';
import { appUrl } from '../config/env';
import { getDb } from '../db/client';
import { alerts } from '../db/schema';
import { sha256 } from '../util/crypto';
import { notifyAdmin } from './email';

/** Neue Warnungen/Fehler als Sammel-Mail an den Betreiber (alle 15 Minuten, jede Meldung einmal). */
export async function sendAlertDigest(): Promise<number> {
  const db = getDb();
  const open = await db
    .select()
    .from(alerts)
    .where(and(isNull(alerts.emailedAt), isNull(alerts.acknowledgedAt), inArray(alerts.level, ['warn', 'error'])))
    .orderBy(asc(alerts.createdAt))
    .limit(50);
  if (!open.length) return 0;
  const errors = open.filter((a) => a.level === 'error').length;
  await notifyAdmin({
    key: `alerts:${sha256(open.map((a) => a.id).join(',')).slice(0, 24)}`,
    title: `${open.length} neue Meldung${open.length === 1 ? '' : 'en'}${errors ? ` (${errors} Fehler)` : ''}`,
    lines: open.map((a) => `[${a.level === 'error' ? 'FEHLER' : 'Warnung'}] ${a.message}`),
    link: appUrl('/admin'),
  });
  await db
    .update(alerts)
    .set({ emailedAt: new Date() })
    .where(inArray(alerts.id, open.map((a) => a.id)));
  return open.length;
}
