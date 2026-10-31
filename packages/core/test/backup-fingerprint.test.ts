import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, expect, it } from 'vitest';

interface Fingerprint {
  table: string;
  rows: number;
  digest: string;
}

const base = new URL(process.env.TEST_DATABASE_URL!);
const prefix = `wbm_restore_sort_${randomBytes(5).toString('hex')}`;
const sourceName = `${prefix}_source_test`,
  restoredName = `${prefix}_restored_test`;
let admin: pg.Client,
  source: pg.Client,
  restored: pg.Client,
  sourceCreated = false,
  restoredCreated = false;
let sql: string;

async function fingerprints(client: pg.Client): Promise<Fingerprint[]> {
  await client.query("SET timezone = 'UTC'");
  const query = sql.slice(sql.indexOf('SELECT format('), sql.indexOf('\\gexec'));
  const generated = await client.query<{ format: string }>(query);
  const results: Fingerprint[] = [];
  for (const row of generated.rows) {
    const result = await client.query<{ json_build_object: Fingerprint }>(row.format);
    results.push(result.rows[0]!.json_build_object);
  }
  return results;
}

beforeAll(async () => {
  if (!['localhost', '127.0.0.1'].includes(base.hostname) || !/test|e2e/.test(base.pathname))
    throw new Error('Only explicitly named local disposable test databases are allowed.');
  const administrator = new URL(base);
  administrator.pathname = '/postgres';
  admin = new pg.Client({ connectionString: administrator.toString() });
  await admin.connect();
  // Two local disposable databases, intentionally different default sort rules.
  await admin.query(`CREATE DATABASE ${sourceName} TEMPLATE template0 ENCODING 'UTF8'
    LOCALE_PROVIDER icu ICU_LOCALE 'en-US' LC_COLLATE 'C' LC_CTYPE 'C'`);
  sourceCreated = true;
  await admin.query(`CREATE DATABASE ${restoredName} TEMPLATE template0 ENCODING 'UTF8'
    LOCALE_PROVIDER libc LC_COLLATE 'C' LC_CTYPE 'C'`);
  restoredCreated = true;
  const connect = async (name: string) => {
    const url = new URL(base);
    url.pathname = `/${name}`;
    const client = new pg.Client({ connectionString: url.toString() });
    await client.connect();
    return client;
  };
  source = await connect(sourceName);
  restored = await connect(restoredName);
  sql = await readFile(new URL('../../../infra/backup/fingerprint.sql', import.meta.url), 'utf8');
  const names = ['a', 'ä', 'A', 'z', '_entry', 'a-1', 'a_1', 'Ö', 'ü', 'alpha', 'Alpha', 'beta'];
  for (const client of [source, restored]) {
    await client.query(`CREATE TABLE claims (id text NOT NULL, body jsonb NOT NULL);
      CREATE TABLE a_b (value text); CREATE TABLE ab (value text);
      CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations (id integer);`);
    for (const name of client === source ? names : [...names].reverse())
      await client.query('INSERT INTO claims VALUES ($1,$2)', [
        name,
        JSON.stringify({ text: 'Fiktiver Prüfwert', nested: [1, null] }),
      ]);
  }
});

afterAll(async () => {
  await source?.end();
  await restored?.end();
  // Drop only the random local targets that this test actually created.
  if (sourceCreated) await admin.query(`DROP DATABASE ${sourceName}`);
  if (restoredCreated) await admin.query(`DROP DATABASE ${restoredName}`);
  await admin?.end();
});

it('reproduces the old false mismatch and compares the complete rows equally across locales', async () => {
  const old = `SELECT md5(string_agg(row_to_json(t)::text,E'\\n' ORDER BY row_to_json(t)::text)) AS digest FROM claims t`;
  expect((await source.query(old)).rows[0].digest).not.toBe((await restored.query(old)).rows[0].digest);
  expect(await fingerprints(restored)).toEqual(await fingerprints(source));
});

it('still rejects a changed value with the same row count', async () => {
  await restored.query(`UPDATE claims SET body='{"text":"verändert"}' WHERE id='beta'`);
  try {
    const before = (await fingerprints(source)).find((x) => x.table === 'public.claims')!;
    const after = (await fingerprints(restored)).find((x) => x.table === 'public.claims')!;
    expect(after.rows).toBe(before.rows);
    expect(after.digest).not.toBe(before.digest);
  } finally {
    await restored.query('UPDATE claims SET body=$1 WHERE id=$2', [
      JSON.stringify({ text: 'Fiktiver Prüfwert', nested: [1, null] }),
      'beta',
    ]);
  }
});

it('still rejects a lost row', async () => {
  await restored.query("DELETE FROM claims WHERE id='beta'");
  try {
    expect(await fingerprints(restored)).not.toEqual(await fingerprints(source));
  } finally {
    await restored.query('INSERT INTO claims VALUES ($1,$2)', [
      'beta',
      JSON.stringify({ text: 'Fiktiver Prüfwert', nested: [1, null] }),
    ]);
  }
});

it('still rejects a missing empty table', async () => {
  await restored.query('DROP TABLE a_b');
  try {
    expect(await fingerprints(restored)).not.toEqual(await fingerprints(source));
  } finally {
    await restored.query('CREATE TABLE a_b (value text)');
  }
});
