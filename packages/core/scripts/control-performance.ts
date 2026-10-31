/** Free, read-only-to-demo diagnostic. No AI, approval, publication, mail, or daemon startup. */
import { availableParallelism, loadavg } from 'node:os';
import { readFile } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { renderSite } from '@wbm/templates';
import { getEnv } from '../src/config/env';
import { getConfig, setSetting } from '../src/config/service';
import { getDb, closeDb } from '../src/db/client';
import { demos, leads } from '../src/db/schema';
import { leadToFacts, storedContent } from '../src/demos/build';
import { lighthouseCheck } from '../src/render/qa';
import { sha256 } from '../src/util/crypto';
try {
  const id = process.argv.find((a) => a.startsWith('--demo='))?.slice(7);
  if (!id || !/^[a-f0-9-]{36}$/.test(id) || !getEnv().DRY_RUN || process.env.CONTROL_ACCEPTANCE_CONFIRM !== 'single-demo-no-send')
    throw Error('Einzelner Kontrollfall und DRY_RUN erforderlich.');
  const demo = await getDb().query.demos.findFirst({ where: eq(demos.id, id) });
  const lead = demo ? await getDb().query.leads.findFirst({ where: eq(leads.id, demo.leadId) }) : null;
  const content = storedContent(demo?.contentJson);
  if (!demo || !lead || !content || !demo.reviewNote || lead.source !== 'public_profile') throw Error('Kontrolldemo fehlt.');
  const html = renderSite({
    templateId: demo.templateId,
    palette: demo.palette,
    mode: 'live',
    content,
    facts: leadToFacts(lead, await getConfig()),
    live: {
      formAction: '/api/forms/qa',
      imprintPath: 'impressum.html',
      privacyPath: 'datenschutz.html',
      canonicalUrl: 'http://127.0.0.1/',
    },
  });
  const result = await lighthouseCheck(html);
  const report = {
    at: new Date().toISOString(),
    htmlHash: sha256(html),
    result,
    environment: {
      availableParallelism: availableParallelism(),
      loadAverage: loadavg(),
      cpuMax: await readFile('/sys/fs/cgroup/cpu.max', 'utf8').catch(() => null),
    },
  };
  await setSetting(`control-performance:${id}`, report, 'operator:free-performance-diagnostic');
  console.log(
    JSON.stringify({
      stage: 'performance_diagnostic',
      ...report,
      aiCalled: false,
      workerStarted: false,
      demoApprovalChanged: false,
    }),
  );
} catch (e) {
  console.error(JSON.stringify({ stage: 'blocked', reason: e instanceof Error ? e.message : 'Diagnose fehlgeschlagen' }));
  process.exitCode = 1;
} finally {
  await closeDb();
}
