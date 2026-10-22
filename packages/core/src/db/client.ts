import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getEnv } from '../config/env';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;
/** Transaktion oder Datenbank – beides hat dieselbe Query-API. */
export type DbOrTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

interface DbGlobal {
  __wbmPool?: pg.Pool;
  __wbmDb?: Db;
}
const g = globalThis as unknown as DbGlobal;

export function getPool(): pg.Pool {
  if (!g.__wbmPool) {
    g.__wbmPool = new pg.Pool({
      connectionString: getEnv().DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      application_name: process.env.APP_NAME ?? 'wbm',
    });
    g.__wbmPool.on('error', (err) => {
      // Fehler auf ungenutzten Verbindungen nicht den Prozess beenden lassen
      console.error(JSON.stringify({ level: 'error', msg: 'pg pool error', err: err.message }));
    });
  }
  return g.__wbmPool;
}

export function getDb(): Db {
  if (!g.__wbmDb) {
    g.__wbmDb = drizzle(getPool(), { schema });
  }
  return g.__wbmDb;
}

export async function closeDb(): Promise<void> {
  if (g.__wbmPool) {
    await g.__wbmPool.end();
    g.__wbmPool = undefined;
    g.__wbmDb = undefined;
  }
}

export { schema };
