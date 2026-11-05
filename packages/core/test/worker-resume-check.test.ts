import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG } from '../src/config/settings';
const state = vi.hoisted(() => ({
  cfg: undefined as typeof DEFAULT_CONFIG | undefined,
  env: { ANTHROPIC_API_KEY: 'fixture-only', LLM_PROVIDER: 'anthropic' },
  template: 'authored-handwerk',
  set: vi.fn(),
  audit: vi.fn(),
  close: vi.fn(),
  transaction: vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({ marker: 'tx-fixture' })),
}));
vi.mock('../src/config/service', () => ({
  getConfig: async () => state.cfg,
  effectiveSwitches: () => state.cfg!.switches,
  setSetting: state.set,
}));
vi.mock('../src/config/env', () => ({ getEnv: () => state.env }));
vi.mock('../src/db/client', () => ({ getDb: () => ({ transaction: state.transaction }), closeDb: state.close }));
vi.mock('../src/services/audit', () => ({ audit: state.audit }));
vi.mock('../src/demos/build', () => ({ chooseTemplate: () => ({ templateId: state.template }) }));
vi.mock('../src/services/llm', () => ({
  llmStructured: () => {
    throw Error('No model calls during resume');
  },
}));
import { checkWorkerResume } from '../scripts/worker-resume-check';

beforeEach(() => {
  state.cfg = structuredClone(DEFAULT_CONFIG);
  state.cfg.switches.dryRun = false;
  state.cfg.switches.killSwitch = false;
  state.cfg.switches.autoApproveDemos = false;
  state.cfg.review.qaLlm = true;
  state.cfg.review.qaLighthouse = true;
  state.env = { ANTHROPIC_API_KEY: 'fixture-only', LLM_PROVIDER: 'anthropic' };
  state.template = 'authored-handwerk';
  state.set.mockClear();
  state.audit.mockClear();
  state.close.mockClear();
  state.transaction.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ status: 'ok', db: true, queue: true })),
  );
});
afterEach(() => vi.unstubAllGlobals());
describe('Resume the regular worker without changing switches or spending tokens', () => {
  it('only reads configuration before starting and preserves the existing budget and manual gates', async () => {
    const before = JSON.stringify(state.cfg);
    expect(await checkWorkerResume()).toMatchObject({
      stage: 'worker_resume_preflight_passed',
      generator: 'design-studio-1',
      workerStarted: false,
      newAiCalls: 0,
      manualDemoApproval: true,
    });
    expect(JSON.stringify(state.cfg)).toBe(before);
    expect(state.set).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(state.close).toHaveBeenCalledOnce();
  });
  it('honors Not-Aus and refuses automatic approval, disabled QA, missing real generation or a template fallback', async () => {
    state.cfg!.switches.killSwitch = true;
    await expect(checkWorkerResume()).rejects.toThrow(/Not-Aus/);
    state.cfg!.switches.killSwitch = false;
    state.cfg!.switches.autoApproveDemos = true;
    await expect(checkWorkerResume()).rejects.toThrow(/manuelle Freigabe/);
    state.cfg!.switches.autoApproveDemos = false;
    state.cfg!.review.qaLlm = false;
    await expect(checkWorkerResume()).rejects.toThrow(/Prüfung/);
    state.cfg!.review.qaLlm = true;
    state.cfg!.review.qaLighthouse = false;
    await expect(checkWorkerResume()).rejects.toThrow(/Prüfung/);
    state.cfg!.review.qaLighthouse = true;
    state.env.LLM_PROVIDER = 'mock';
    await expect(checkWorkerResume()).rejects.toThrow(/Anthropic/);
    state.env.LLM_PROVIDER = 'anthropic';
    state.env.ANTHROPIC_API_KEY = '';
    await expect(checkWorkerResume()).rejects.toThrow(/Anthropic/);
    state.env.ANTHROPIC_API_KEY = 'fixture-only';
    state.template = 'handwerk-alt';
    await expect(checkWorkerResume()).rejects.toThrow(/frei gestalteten/);
    expect(state.set).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('records the observed running release only after a local DB/queue health confirmation', async () => {
    const release = 'a'.repeat(40);
    expect(await checkWorkerResume({ record: true, release })).toMatchObject({
      stage: 'worker_running_verified',
      workerStarted: true,
      healthVerified: true,
      release,
      newAiCalls: 0,
    });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:3001/health', expect.any(Object));
    expect(state.transaction).toHaveBeenCalledOnce();
    expect(state.set).toHaveBeenCalledWith(
      'worker-runtime-release',
      expect.objectContaining({ release, healthVerified: true }),
      'operator:studio-rollout',
      expect.any(Object),
    );
    expect(state.audit).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ action: 'resume_verified', entityId: release }),
    );
  });
  it('does not store a successful restart when health is unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ status: 'unavailable', db: false, queue: true }, { status: 503 })),
    );
    await expect(checkWorkerResume({ record: true, release: 'a'.repeat(40) })).rejects.toThrow(
      /keinen Erfolgsnachweis|kein Erfolgsnachweis/,
    );
    expect(state.set).not.toHaveBeenCalled();
    expect(state.audit).not.toHaveBeenCalled();
    expect(state.close).toHaveBeenCalledOnce();
  });
  it('requires the full pinned release before recording anything', async () => {
    await expect(checkWorkerResume({ record: true, release: 'short' })).rejects.toThrow(/Release-Commit/);
    expect(fetch).not.toHaveBeenCalled();
    expect(state.set).not.toHaveBeenCalled();
  });
});
