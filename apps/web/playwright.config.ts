import path from 'node:path';
import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;
const STATE = path.join(os.tmpdir(), 'wbm-e2e-state.json');
const STORAGE = path.join(os.tmpdir(), 'wbm-e2e-storage');

export const e2eEnv: Record<string, string> = {
  NODE_ENV: 'development',
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgres://wbm:wbm@localhost:5432/wbm_e2e',
  APP_URL: BASE,
  DEMO_DOMAIN: `localhost:${PORT}`,
  TRACK_DOMAIN: `localhost:${PORT}`,
  STORAGE_LOCAL_DIR: STORAGE,
  SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
  LLM_PROVIDER: 'mock',
  LEAD_SOURCE: 'mock',
  PAYMENT_PROVIDER: 'mock',
  EMAIL_PROVIDER: 'mock',
  MAIL_PROVIDER: 'mock',
  REGISTRAR_PROVIDER: 'mock',
  HOSTING_PROVIDER: 'mock',
  DRY_RUN: 'true',
  LOG_LEVEL: 'warn',
  E2E_STATE_FILE: STATE,
  WORKER_HEALTH_PORT: String(PORT + 1),
  RUN_MIGRATIONS: 'false',
  ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { CHROMIUM_EXECUTABLE_PATH: process.env.CHROMIUM_EXECUTABLE_PATH } : {}),
};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/warmup.ts',
  // Außerhalb des Projekts: Traces im Projektordner lösen sonst laufend Fast Refresh im Dev-Server aus
  outputDir: path.join(os.tmpdir(), 'wbm-e2e-results'),
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } } : {}),
  },
  // Reihenfolge: zuerst DB-Setup + Worker, dann Next.js
  webServer: [
    {
      command: 'pnpm --filter @wbm/core exec tsx scripts/e2e-setup.ts && pnpm --filter @wbm/worker exec tsx src/index.ts',
      url: `http://localhost:${PORT + 1}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: e2eEnv,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'pnpm exec next dev -p ' + PORT,
      url: `${BASE}/api/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: e2eEnv,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
