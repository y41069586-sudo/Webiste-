/** Explicit correction of one private control input, using normal validation and QA. Never sends or approves. */
import { eq } from 'drizzle-orm';
import { getEnv } from '../src/config/env';
import { getSetting, setSetting } from '../src/config/service';
import { closeDb, getDb } from '../src/db/client';
import { demos } from '../src/db/schema';
import { reviseDemo } from '../src/demos/revise';
import type { DemoRevisionPatch } from '../src/demos/revision-types';
import { qaDemo } from '../src/render/demo-qa';
import { closeBrowser } from '../src/render/browser';
import { stopBoss } from '../src/queue';
try {
  const id = process.argv.find((a) => a.startsWith('--demo='))?.slice(7);
  if (
    !id ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    process.env.CONTROL_ACCEPTANCE_CONFIRM !== 'single-demo-no-send' ||
    !getEnv().DRY_RUN ||
    getEnv().STRIPE_MODE !== 'test'
  )
    throw Error('Einzelne Kontroll-Demo, Bestätigung und Testmodus erforderlich.');
  const input = await getSetting<{ expectedHash: string; patch: DemoRevisionPatch } | null>(`control-repair:${id}`, null);
  const demo = await getDb().query.demos.findFirst({ where: eq(demos.id, id) });
  if (!input || !demo || !['qa_failed', 'building', 'pending_review'].includes(demo.status) || !demo.reviewNote)
    throw Error('Privater Reparaturauftrag oder gesperrte Kontroll-Demo fehlt.');
  const appliedKey = `control-repair-applied:${id}`;
  if (!(await getSetting(appliedKey, false))) {
    if (demo.qaResultJson?.renderedAssets?.htmlHash !== input.expectedHash)
      throw Error('Entwurf inzwischen geändert; Reparatur neu prüfen.');
    const result = await reviseDemo({ demoId: id, patch: input.patch, actor: 'operator:control-repair' });
    if (result.state !== 'done') throw Error('Textkorrektur hat Inhaltsprüfung nicht bestanden.');
    await setSetting(appliedKey, true, 'operator:control-repair');
  }
  const fresh = await getDb().query.demos.findFirst({ where: eq(demos.id, id) });
  const qa =
    fresh?.qaResultJson ?? (await qaDemo(id, 'operator:control-repair', { lighthouse: true, llm: true, enqueueRebuild: false }));
  console.log(
    JSON.stringify({
      stage: 'awaiting_manual_review',
      demoId: id,
      technicalPassed: qa.passed,
      failed: qa.checks.filter((c) => !c.passed),
      letterSent: false,
      workerStarted: false,
    }),
  );
} catch (e) {
  console.error(
    JSON.stringify({
      stage: 'blocked',
      reason: e instanceof Error ? e.message.slice(0, 300) : 'Kontrollkorrektur fehlgeschlagen',
      workerStarted: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await closeBrowser();
  await stopBoss();
  await closeDb();
}
