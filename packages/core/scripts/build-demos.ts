/**
 * N Demos für qualifizierte Leads direkt bauen und prüfen (ohne Queue):
 *   pnpm --filter @wbm/core exec tsx scripts/build-demos.ts 10
 */
import { desc, eq, sql } from 'drizzle-orm';
import { closeDb, getDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { buildDemo, closeBrowser, qaDemo } from '../src/render';
import { stopBoss } from '../src/queue';

async function main(): Promise<void> {
  const n = Number(process.argv[2] ?? 10);
  const db = getDb();
  // Mischung aus Beauty und Handwerk
  const pool = await db.select().from(leads).where(eq(leads.status, 'qualified')).orderBy(desc(leads.score));
  const beauty = pool.filter((l) => l.branchGroup === 'beauty');
  const handwerk = pool.filter((l) => l.branchGroup === 'handwerk');
  const picked = [...handwerk.slice(0, Math.ceil(n / 2)), ...beauty].slice(0, n);
  const rows: { name: string; template: string; passed: boolean; failed: string[]; lighthouse?: string }[] = [];
  for (const lead of picked) {
    const demoId = await buildDemo(lead.id, { actor: 'admin:cli' });
    const r = await qaDemo(demoId, 'admin:cli', { lighthouse: true, llm: true });
    const d = await db.query.demos.findFirst({ where: eq(demos.id, demoId) });
    rows.push({
      name: lead.businessName,
      template: `${d!.templateId}/${d!.palette}`,
      passed: r.passed,
      failed: r.checks.filter((c) => !c.passed).map((c) => `${c.name}: ${c.details ?? ''}`),
      lighthouse: r.checks.find((c) => c.name === 'lighthouse')?.details,
    });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  const q = await db.execute(sql`SELECT status, count(*)::int AS n FROM demos GROUP BY status`);
  console.log(JSON.stringify(q.rows));
  await closeBrowser();
  await stopBoss();
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
