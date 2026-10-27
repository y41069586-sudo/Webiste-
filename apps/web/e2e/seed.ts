import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { e2eEnv } from '../playwright.config';

export interface SeededDemo {
  slug: string;
  trackToken: string;
  leadId: string;
  demoId: string;
}

export function setOfferVersion(version: 'v4' | 'legacy'): void {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  execFileSync('pnpm', ['--silent', '--filter', '@wbm/core', 'exec', 'tsx', 'scripts/e2e-offer-version.ts', version], {
    cwd: root,
    env: { ...process.env, ...e2eEnv, LOG_LEVEL: 'silent' },
    encoding: 'utf8',
    timeout: 30_000,
  });
}

/** Legt über die Core-Services eine veröffentlichte Demo an (Mock-KI). */
export function seedPublishedDemo(profile?: { name: string; branch: string; city: string }): SeededDemo {
  return seedDemo(false, profile);
}

/** Fiktive Demo mit bestandener Technik, jedoch ohne erfundene manuelle Freigabe. */
export function seedPendingDemo(): SeededDemo {
  return seedDemo(true);
}

function seedDemo(pendingReview: boolean, profile?: { name: string; branch: string; city: string }): SeededDemo {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const out = execFileSync('pnpm', ['--silent', '--filter', '@wbm/core', 'exec', 'tsx', 'scripts/e2e-seed-demo.ts'], {
    cwd: root,
    env: {
      ...process.env,
      ...e2eEnv,
      LOG_LEVEL: 'silent',
      E2E_DEMO_PENDING: pendingReview ? '1' : '0',
      ...(profile ? { E2E_DEMO_PROFILE: JSON.stringify(profile) } : {}),
    },
    encoding: 'utf8',
    timeout: 180_000,
  });
  const json = out.slice(out.indexOf('{'));
  return JSON.parse(json) as SeededDemo;
}
