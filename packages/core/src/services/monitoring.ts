import { sql } from 'drizzle-orm';
import { getEnv } from '../config/env';
import { getDb, type DbOrTx } from '../db/client';
import { getProviders } from '../providers';
import { raiseAlert } from './budget';

export interface SystemHealth {
  status: 'ok' | 'degraded' | 'down';
  db: boolean;
  storage: boolean;
  /** Sekunden seit dem letzten erfolgreichen Pipeline-Takt (Worker-Herzschlag) */
  workerHeartbeatAgeSec: number | null;
  failedJobsLastHour: number | null;
  deadLettersLastDay: number | null;
  /** Jobs, die seit über 30 Minuten auf Abarbeitung warten */
  backlog: number | null;
  queueReadable: boolean;
  /** Letzter Wiederherstellungstest des Backups */
  backup: { status: string; at: string } | null;
  problems: string[];
}

/** Zustand von Datenbank, Speicher und Worker (für /api/health und den Watchdog). */
export async function systemHealth(db: DbOrTx = getDb()): Promise<SystemHealth> {
  const problems: string[] = [];
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    return {
      status: 'down',
      db: false,
      storage: false,
      workerHeartbeatAgeSec: null,
      failedJobsLastHour: null,
      deadLettersLastDay: null,
      backlog: null,
      queueReadable: false,
      backup: null,
      problems: ['Datenbank nicht erreichbar'],
    };
  }
  let storage = true;
  try {
    const s = getProviders().storage;
    await s.put('health/check.txt', new Date().toISOString(), 'text/plain');
    storage = Boolean(await s.get('health/check.txt'));
  } catch {
    storage = false;
  }
  if (!storage) problems.push('Datei-Speicher nicht beschreibbar');
  const q = await db
    .execute<{ heartbeat: number | null; failed: number; dead: number; backlog: number }>(
      sql`SELECT
        (SELECT extract(epoch FROM now() - max(completed_on))::int FROM pgboss.job WHERE name = 'pipeline-tick' AND state = 'completed') AS heartbeat,
        (SELECT count(*)::int FROM pgboss.job WHERE state = 'failed' AND completed_on > now() - interval '1 hour') AS failed,
        (SELECT count(*)::int FROM pgboss.job WHERE name = 'dead-letters' AND created_on > now() - interval '1 day') AS dead,
        (SELECT count(*)::int FROM pgboss.job WHERE state = 'created' AND start_after < now() - interval '30 minutes') AS backlog`,
    )
    .catch(() => null);
  const row = q?.rows[0] ?? null;
  if (!row) problems.push('Aufgabenwarteschlange nicht lesbar: Schema, Berechtigungen und Verbindung prüfen');
  const hb = row?.heartbeat == null ? null : Number(row.heartbeat);
  if (hb === null || hb > 15 * 60)
    problems.push(
      hb === null
        ? 'Worker hat noch keinen Pipeline-Takt abgeschlossen'
        : `Worker-Herzschlag seit ${Math.round(hb / 60)} Minuten aus`,
    );
  if (row && row.failed > 10) problems.push(`${row.failed} fehlgeschlagene Jobs in der letzten Stunde`);
  if (row && row.backlog > 50) problems.push(`${row.backlog} Jobs warten seit über 30 Minuten`);
  const b = await db
    .execute<{ value: { status: string; at: string } }>(sql`SELECT value FROM settings WHERE key = 'backup_status'`)
    .catch(() => null);
  if (!b) problems.push('Backup-Nachweis nicht lesbar');
  const backup = b?.rows[0]?.value ?? null;
  if (getEnv().NODE_ENV === 'production') {
    if (!backup) problems.push('Noch kein geprüftes Backup');
    else if (backup.status !== 'ok') problems.push('Letzter Backup-Wiederherstellungstest fehlgeschlagen');
    else if (
      !Number.isFinite(new Date(backup.at).getTime()) ||
      new Date(backup.at).getTime() > Date.now() ||
      Date.now() - new Date(backup.at).getTime() > 36 * 3600 * 1000
    )
      problems.push('Letztes geprüftes Backup älter als 36 Stunden');
  }
  return {
    status: problems.length ? 'degraded' : 'ok',
    db: true,
    storage,
    workerHeartbeatAgeSec: hb,
    queueReadable: Boolean(row),
    failedJobsLastHour: row?.failed ?? null,
    deadLettersLastDay: row?.dead ?? null,
    backlog: row?.backlog ?? null,
    backup,
    problems,
  };
}

/** Watchdog (läuft mit den Warn-Mails): Probleme als Meldung im Dashboard und per Mail. */
export async function watchdog(): Promise<SystemHealth> {
  const h = await systemHealth();
  for (const p of h.problems) {
    await raiseAlert(getDb(), { level: 'error', code: `watchdog_${p.replace(/\d+/g, 'n').slice(0, 40)}`, message: p });
  }
  return h;
}

/** Einfacher Datenbank-Ping (Worker-Healthcheck). */
export async function pingDb(): Promise<boolean> {
  try {
    await getDb().execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}
