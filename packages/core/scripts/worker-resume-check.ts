/** Read-only rollout check; --record logs an observed healthy running container, never changes operating switches. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authoredTemplateId } from '@wbm/templates';
import { getConfig, effectiveSwitches, setSetting } from '../src/config/service';
import type { AppConfig } from '../src/config/settings';
import { getEnv } from '../src/config/env';
import { closeDb } from '../src/db/client';
import { audit } from '../src/services/audit';
import { getDb } from '../src/db/client';
import { chooseTemplate } from '../src/demos/build';
import { STUDIO_VERSION } from '../src/demos/studio';

export function assertWorkerResumeConfig(
  cfg: AppConfig,
  killSwitch: boolean,
  env: { ANTHROPIC_API_KEY?: string; LLM_PROVIDER?: string },
) {
  if (killSwitch) throw Error('Not-Aus ist aktiv; kein automatischer Neustart. Im bestehenden Admin prüfen.');
  if (cfg.switches.autoApproveDemos)
    throw Error('Automatische Demo-Freigabe ist aktiv; gewünschte manuelle Freigabe nicht bestätigt.');
  if (!cfg.review.qaLlm || !cfg.review.qaLighthouse)
    throw Error('Die reguläre KI-/Lighthouse-Prüfung muss eingeschaltet bleiben.');
  if (!env.ANTHROPIC_API_KEY || env.LLM_PROVIDER === 'mock')
    throw Error('Anthropic-Generator nicht eingerichtet; kein regulärer Neustart.');
  if (chooseTemplate({ id: 'studio-rollout-check', branchGroup: 'handwerk' }).templateId !== authoredTemplateId('handwerk'))
    throw Error('Normaler Demo-Bau verwendet nicht den frei gestalteten Generator.');
}

export async function checkWorkerResume(options: { record?: boolean; release?: string } = {}) {
  try {
    if (options.record && !/^[a-f0-9]{40}$/.test(options.release ?? ''))
      throw Error('Vollständiger Release-Commit erforderlich.');
    const cfg = await getConfig({ fresh: true });
    const env = getEnv();
    const sw = effectiveSwitches(cfg);
    assertWorkerResumeConfig(cfg, sw.killSwitch, env);
    const report = {
      stage: options.record ? 'worker_running_verified' : 'worker_resume_preflight_passed',
      generator: STUDIO_VERSION,
      manualDemoApproval: true,
      manualLetterApproval: true,
      qaLlm: cfg.review.qaLlm,
      qaLighthouse: cfg.review.qaLighthouse,
      weeklyLlmBudgetCents: cfg.budget.weeklyLlmBudgetCents,
      dryRun: sw.dryRun,
      killSwitch: sw.killSwitch,
      checkedAt: new Date().toISOString(),
      workerStarted: Boolean(options.record),
      newAiCalls: 0,
    };
    if (options.record) {
      // Called via compose exec in the actual running container after Docker's health check.
      const response = await fetch('http://127.0.0.1:3001/health', { signal: AbortSignal.timeout(10000) });
      const health = (await response.json()) as { status?: string; db?: boolean; queue?: boolean };
      if (!response.ok || health.status !== 'ok' || health.db !== true || health.queue !== true)
        throw Error('Laufender Worker bestätigt Datenbank/Queue nicht; kein Erfolgsnachweis gespeichert.');
      const db = getDb();
      await db.transaction(async (tx) => {
        await setSetting(
          'worker-runtime-release',
          { ...report, release: options.release, healthVerified: true },
          'operator:studio-rollout',
          tx,
        );
        await audit(tx, {
          entity: 'worker',
          entityId: options.release!,
          action: 'resume_verified',
          actor: 'operator:studio-rollout',
          context: { ...report, release: options.release, healthVerified: true },
        });
      });
    }
    return { ...report, ...(options.record ? { release: options.release, healthVerified: true } : {}) };
  } finally {
    await closeDb();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkWorkerResume({
    record: process.argv.includes('--record'),
    release: process.argv.find((arg) => arg.startsWith('--release='))?.slice(10),
  })
    .then((report) => console.log(JSON.stringify(report)))
    .catch((error) => {
      console.error(
        JSON.stringify({
          stage: 'worker_resume_blocked',
          reason: error instanceof Error ? error.message : 'Worker-Prüfung fehlgeschlagen',
        }),
      );
      process.exitCode = 1;
    });
}
