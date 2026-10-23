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

/** Legt über die Core-Services eine veröffentlichte Demo an (Mock-KI). */
export function seedPublishedDemo(): SeededDemo {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const out = execFileSync('pnpm', ['--silent', '--filter', '@wbm/core', 'exec', 'tsx', 'scripts/e2e-seed-demo.ts'], {
    cwd: root,
    env: { ...process.env, ...e2eEnv, LOG_LEVEL: 'silent' },
    encoding: 'utf8',
  });
  const json = out.slice(out.indexOf('{'));
  return JSON.parse(json) as SeededDemo;
}
