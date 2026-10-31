BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SELECT pg_export_snapshot() \g /snapshot/source-snapshot.id
-- Container lifetime is bounded by the parent backup and the systemd service timeout.
\! sleep 2700
ROLLBACK;
