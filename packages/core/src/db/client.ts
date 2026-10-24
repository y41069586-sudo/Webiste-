import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getEnv } from '../config/env';
import * as schema from './schema';

// Public CA from https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
// Supabase Root 2021 CA, valid until 2031-04-26. Never disable peer/hostname verification.
const SUPABASE_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

export type Db = NodePgDatabase<typeof schema>;
/** Transaktion oder Datenbank – beides hat dieselbe Query-API. */
export type DbOrTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];

interface DbGlobal {
  __wbmPool?: pg.Pool;
  __wbmDb?: Db;
}
const g = globalThis as unknown as DbGlobal;

/** Shared TLS settings for application queries and the pg-boss connection. */
export function getDatabaseConnectionConfig(): Pick<pg.PoolConfig, 'connectionString' | 'ssl'> {
  let connectionString = getEnv().DATABASE_URL;
  const host = new URL(connectionString).hostname;
  const isSupabase = /^(?:db\.[a-z0-9]+\.supabase\.co|[a-z0-9-]+\.pooler\.supabase\.com)$/.test(host);
  const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, '\n') ?? (isSupabase ? SUPABASE_ROOT_CA : undefined);
  if (ca) {
    // pg otherwise replaces the explicit TLS options with URL SSL parameters.
    const url = new URL(connectionString);
    for (const key of ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat']) {
      url.searchParams.delete(key);
    }
    connectionString = url.toString();
  }
  return { connectionString, ...(ca ? { ssl: { ca, rejectUnauthorized: true } } : {}) };
}

export function getPool(): pg.Pool {
  if (!g.__wbmPool) {
    g.__wbmPool = new pg.Pool({
      ...getDatabaseConnectionConfig(),
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
