import { eq } from 'drizzle-orm';
import { getDb, type DbOrTx } from '../db/client';
import { settings } from '../db/schema';
import { audit } from '../services/audit';
import { getEnv } from './env';
import { appConfigSchema, DEFAULT_CONFIG, deepMerge, type AppConfig, type AppConfigPatch } from './settings';

const CONFIG_KEY = 'app_config';
const CACHE_MS = 3_000;

let cache: { at: number; value: AppConfig } | undefined;

/** Standardwerte inklusive der Schalter-Startwerte aus der Umgebung. */
export function baseConfig(): AppConfig {
  const env = getEnv();
  return deepMerge(DEFAULT_CONFIG, {
    switches: {
      dryRun: env.DRY_RUN,
      autoSend: env.AUTO_SEND,
      autoApproveDemos: env.AUTO_APPROVE_DEMOS,
      autoReply: env.AUTO_REPLY,
      followupEnabled: env.FOLLOWUP_ENABLED,
      autoOptimize: env.AUTO_OPTIMIZE,
      useRatingInLetter: env.USE_RATING_IN_LETTER,
    },
  });
}

export async function getStoredPatch(db: DbOrTx = getDb()): Promise<AppConfigPatch> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, CONFIG_KEY) });
  return (row?.value as AppConfigPatch | undefined) ?? {};
}

export async function getConfig(opts: { fresh?: boolean; db?: DbOrTx } = {}): Promise<AppConfig> {
  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  const patch = await getStoredPatch(opts.db);
  const merged = deepMerge(baseConfig(), patch);
  const parsed = appConfigSchema.safeParse(merged);
  // Ungültige gespeicherte Werte dürfen das System nicht lahmlegen: Standardwerte verwenden
  const value = parsed.success ? parsed.data : baseConfig();
  cache = { at: Date.now(), value };
  return value;
}

export function invalidateConfigCache(): void {
  cache = undefined;
}

/**
 * Speichert eine Änderung. Validiert das Gesamtergebnis, bevor gespeichert wird.
 * Gibt die neue, gültige Konfiguration zurück.
 */
export async function updateConfig(patch: AppConfigPatch, actor: string, db: DbOrTx = getDb()): Promise<AppConfig> {
  const current = await getStoredPatch(db);
  const nextPatch = deepMerge(current, patch);
  const merged = deepMerge(baseConfig(), nextPatch);
  const parsed = appConfigSchema.parse(merged);
  await db
    .insert(settings)
    .values({ key: CONFIG_KEY, value: nextPatch, updatedBy: actor })
    .onConflictDoUpdate({ target: settings.key, set: { value: nextPatch, updatedBy: actor, updatedAt: new Date() } });
  await audit(db, {
    entity: 'settings',
    entityId: CONFIG_KEY,
    action: 'update',
    actor,
    context: { changedKeys: flattenKeys(patch) },
  });
  invalidateConfigCache();
  return parsed;
}

function flattenKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return prefix ? [prefix] : [];
  return Object.entries(obj).flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k));
}

export interface EffectiveSwitches {
  dryRun: boolean;
  /** true, wenn DRY_RUN in der Umgebung gesetzt ist (im Dashboard nicht abschaltbar) */
  dryRunLockedByEnv: boolean;
  autoSend: boolean;
  autoApproveDemos: boolean;
  autoReply: boolean;
  followupEnabled: boolean;
  autoOptimize: boolean;
  useRatingInLetter: boolean;
  killSwitch: boolean;
  realLettersUnlocked: boolean;
  autoRegisterDomains: boolean;
}

/**
 * Wirksame Schalter. Sicherheitsregel: Ist `DRY_RUN=true` in der Umgebung gesetzt,
 * bleibt DRY_RUN wirksam, egal was im Dashboard steht (Zwei-Schlüssel-Prinzip).
 */
export function effectiveSwitches(cfg: AppConfig): EffectiveSwitches {
  const env = getEnv();
  return {
    ...cfg.switches,
    dryRun: env.DRY_RUN || cfg.switches.dryRun,
    dryRunLockedByEnv: env.DRY_RUN,
  };
}

/** Generische Key/Value-Settings (z. B. Zähler für Review-Pflicht, letzte Läufe). */
export async function getSetting<T>(key: string, fallback: T, db: DbOrTx = getDb()): Promise<T> {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, key) });
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown, actor: string, db: DbOrTx = getDb()): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value, updatedBy: actor })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: actor, updatedAt: new Date() } });
}
