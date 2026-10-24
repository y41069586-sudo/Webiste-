/** Generates an empty-project bootstrap from the EXISTING Drizzle migrations. Does not connect to any DB. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { DEFAULT_CONFIG, deepMerge } from '../packages/core/src/config/settings';
import { OPERATOR_PROFILE } from '../packages/core/src/config/operator';

const target = process.argv[2];
if (!target) throw new Error('Usage: tsx scripts/prepare-supabase.ts /path/to/bootstrap.sql');
const journal = JSON.parse(readFileSync('packages/core/drizzle/meta/_journal.json', 'utf8'));
const parts = [
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public') THEN RAISE EXCEPTION 'Bootstrap requires an empty public schema'; END IF; END $$;`,
  `CREATE SCHEMA IF NOT EXISTS drizzle; CREATE TABLE drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint);`,
];
for (const entry of journal.entries) {
  const sql = readFileSync(`packages/core/drizzle/${entry.tag}.sql`, 'utf8');
  parts.push(sql.replaceAll('--> statement-breakpoint', ''));
  const hash = createHash('sha256').update(sql).digest('hex');
  parts.push(`INSERT INTO drizzle.__drizzle_migrations(hash, created_at) VALUES ('${hash}', ${entry.when});`);
}
const cfg = deepMerge(DEFAULT_CONFIG, {
  sender: OPERATOR_PROFILE,
  switches: {
    dryRun: true,
    autoSend: false,
    autoReply: false,
    autoRegisterDomains: false,
    realLettersUnlocked: false,
    autoOptimize: false,
  },
});
const json = JSON.stringify(cfg).replaceAll("'", "''");
parts.push(`INSERT INTO public.settings(key, value, updated_by) VALUES ('app_config', '${json}'::jsonb, 'codex:setup');`);
parts.push(`
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
COMMENT ON SCHEMA public IS 'Seitenwerk: backend-only business data. Access via allowlisted Edge Functions; DRY_RUN remains true.';
`);
writeFileSync(target, parts.join('\n\n'));
console.log(`Generated ${journal.entries.length} existing migrations with Drizzle history and RLS; no connection performed.`);
