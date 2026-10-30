/** Private connection files for pg_dump on the EXISTING worker host. Never prints credentials. */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { getDatabaseConnectionConfig } from '../src/db/client';
import { sessionPoolerUrl } from '../src/services/worker-bootstrap';
const directory = process.argv[2];
if (!directory?.startsWith('/')) throw new Error('Privates absolutes Verzeichnis erforderlich.');
await mkdir(directory, { recursive: true, mode: 0o700 });
const appConnection = process.env.QUEUE_DATABASE_URL || process.env.DATABASE_URL;
const raw = process.env.BACKUP_DATABASE_URL || appConnection;
if (!raw) throw new Error('Datenbankzugang fehlt.');
const url = new URL(sessionPoolerUrl(raw));
if (process.env.BACKUP_DATABASE_URL && appConnection) {
  const application = new URL(sessionPoolerUrl(appConnection));
  const identity = (u: URL) => {
    const direct = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(u.hostname);
    const pooler = u.hostname.endsWith('.pooler.supabase.com') ? u.username.split('.').at(-1) : undefined;
    return `${direct?.[1] ?? pooler ?? u.hostname}/${u.pathname}`;
  };
  if (identity(url) !== identity(application)) throw new Error('Backup-Zugang gehört nicht zur App-Datenbank.');
}
const connection = getDatabaseConnectionConfig(url.toString());
const ssl = connection.ssl;
const external = !['localhost', '127.0.0.1', 'postgres'].includes(url.hostname);
const ca = ssl && typeof ssl === 'object' ? ssl.ca : undefined;
if (external && !ca) throw new Error('Verifizierte CA für externe Sicherung fehlt.');
const client = new pg.Client(connection);
try {
  await client.connect();
  const check = await client.query<{ blocked: number }>(`
    SELECT count(*)::int blocked FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','drizzle','pgboss') AND c.relkind IN ('r','p') AND (
      NOT has_table_privilege(c.oid,'SELECT') OR
      (c.relrowsecurity AND (c.relforcerowsecurity OR NOT pg_has_role(c.relowner,'USAGE'))
       AND NOT (SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user))
    )
  `);
  if (check.rows[0]!.blocked > 0)
    throw new Error(
      'App-Rolle reicht für ein vollständiges Backup nicht aus. BACKUP_DATABASE_URL mit berechtigter Rolle ausschließlich privat auf dem VPS setzen; keine RLS-Abschaltung.',
    );
} finally {
  await client.end();
}
if (ca) await writeFile(path.join(directory, 'source-ca.pem'), String(ca), { mode: 0o600, flag: 'wx' });
const values = {
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  ...(external ? { PGSSLMODE: 'verify-full', PGSSLROOTCERT: '/snapshot/source-ca.pem' } : {}),
};
if (Object.values(values).some((v) => /[\r\n]/.test(v))) throw new Error('Ungültige Zeilenumbrüche in Zugangsdaten.');
await writeFile(
  path.join(directory, 'source-pg.env'),
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
  { mode: 0o600, flag: 'wx' },
);
console.log(JSON.stringify({ privateConnectionPrepared: true, credentialsPrinted: false }));
