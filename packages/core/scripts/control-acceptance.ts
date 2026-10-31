/** One bounded control demo, no daemon, no publication/approval, no letters, no domain purchase or email. */
import { getEnv } from '../src/config/env';
import { getSetting } from '../src/config/service';
import { getDb, closeDb } from '../src/db/client';
import { demos } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { importProfileControl } from '../src/services/control-case';
import { saveLeadResearch } from '../src/services/lead-research';
import type { LeadResearch } from '../src/leads/acquisition';
import { buildDemo } from '../src/demos/build';
import { qaDemo } from '../src/render/demo-qa';
import { closeBrowser } from '../src/render/browser';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';

try {
  const name = process.argv.find((a) => a.startsWith('--case='))?.slice(7);
  if (!name || !/^[a-z0-9-]{4,60}$/.test(name) || process.env.CONTROL_ACCEPTANCE_CONFIRM !== 'single-demo-no-send')
    throw new Error('Einzelner Kontrollfall und ausdrückliche Testbestätigung erforderlich.');
  if (!getEnv().DRY_RUN || getEnv().STRIPE_MODE !== 'test' || getProviders().llm.name !== 'anthropic')
    throw new Error('Kontrolllauf erfordert DRY_RUN, Stripe-Testmodus und bestehenden echten KI-Provider.');
  const input = await getSetting<{
    profile: unknown;
    research: Omit<LeadResearch, 'version' | 'identityHash' | 'checkedAt'>;
  } | null>(`control-case:${name}`, null);
  if (!input) throw new Error('Privater überprüfter Kontrollfall fehlt.');
  const actor = 'operator:controlled-demo-no-send';
  const leadId = await importProfileControl(input.profile, actor);
  const assessment = await saveLeadResearch(leadId, input.research, actor);
  if (assessment.state !== 'ready')
    throw new Error(`Recherche nicht freigabefähig: ${[...assessment.exclusions, ...assessment.missing].join('; ')}`);
  const demoId = await buildDemo(leadId, {
    actor,
    reviewNote: 'Kontrollstrecke: tatsächliche manuelle Fakten-/Desktop-/Mobil-/Bild-/Textprüfung erforderlich.',
    enqueueQa: false,
  });
  const prior = await getDb().query.demos.findFirst({ where: eq(demos.id, demoId) });
  // Re-running the command must not silently spend money on the same completed QA again.
  const qa = prior?.qaResultJson ?? (await qaDemo(demoId, actor, { lighthouse: true, llm: true, enqueueRebuild: false }));
  console.log(
    JSON.stringify({
      stage: 'awaiting_manual_review',
      leadId,
      demoId,
      technicalPassed: qa.passed,
      manualQualityApproved: qa.quality?.passed ?? false,
      adminPath: `/admin/demos/${demoId}`,
      letterSent: false,
      emailSent: false,
      domainPurchased: false,
      workerStarted: false,
    }),
  );
} catch (err) {
  console.error(
    JSON.stringify({
      stage: 'blocked',
      reason: err instanceof Error ? err.message.slice(0, 300) : 'Kontrolllauf fehlgeschlagen',
      workerStarted: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await closeBrowser();
  await stopBoss();
  await closeDb();
}
