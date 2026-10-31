\set ON_ERROR_STOP on
SET timezone = 'UTC';
-- Hash every complete row in byte order, independent of the source/restore OS language rules.
SELECT format('SELECT json_build_object(''table'',%L,''rows'',count(*),''digest'',md5(coalesce(string_agg(row_to_json(t)::text,E''\n'' ORDER BY row_to_json(t)::text COLLATE "C"),''''))) FROM %I.%I t;', n.nspname||'.'||c.relname,n.nspname,c.relname)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','drizzle') ORDER BY n.nspname COLLATE "C",c.relname COLLATE "C"
\gexec
