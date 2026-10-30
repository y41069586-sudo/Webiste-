import { expect, it, vi } from 'vitest';

interface Call {
  url: string;
  method: string;
  domain?: unknown;
}

/** Actual CLI module with a fake transport: no DB, subprocess or network. */
async function run(args: string[], overrides: Record<string, string | undefined> = {}) {
  const originalArgv = process.argv;
  const originalExitCode = process.exitCode;
  const calls: Call[] = [];
  vi.resetModules();
  const logs = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const env = {
    NODE_ENV: 'test',
    DRY_RUN: 'true',
    REGISTRAR_PROVIDER: 'mock',
    REGISTRAR_ENV: 'sandbox',
    REGISTRAR_USER: 'private-user',
    REGISTRAR_PASSWORD: 'test-secret-password',
    REGISTRAR_TOTP_SECRET: '',
    REGISTRAR_CHECK_CONFIRM: '',
    INWX_TEST_RESPONSE: '',
    ...overrides,
  };
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init) => {
      const rpc = JSON.parse(init.body);
      calls.push({ url: String(url), method: rpc.method, domain: rpc.params?.domain });
      const mode = env.INWX_TEST_RESPONSE;
      if (rpc.method === 'account.login') {
        return new Response(
          JSON.stringify(
            mode === 'login-error'
              ? { code: 2200, msg: 'private-user test-secret-password' }
              : { code: 1000, resData: { tfa: mode === '2fa' ? '1' : '0' } },
          ),
          { headers: { 'set-cookie': 'domrobot=test-only; path=/; HttpOnly' } },
        );
      }
      if (rpc.method === 'account.unlock') return Response.json({ code: 1000 });
      if (rpc.method !== 'domain.check') throw new Error('Unexpected method; no real transport exists');
      if (mode === 'read-error') return Response.json({ code: 2400, msg: 'private-user test-secret-password' });
      return Response.json({ code: 1000, resData: { domain: mode === 'empty' ? [] : [{ domain: 'example.org', avail: 0 }] } });
    }),
  );
  process.argv = [process.execPath, 'registrar-preflight.ts', ...args];
  process.exitCode = 0;
  try {
    await import('../scripts/registrar-preflight');
    const stdout = logs.mock.calls.map((call) => String(call[0])).join('\n');
    const stderr = errors.mock.calls.map((call) => String(call[0])).join('\n');
    expect(`${stdout}${stderr}`).not.toContain('test-secret-password');
    expect(`${stdout}${stderr}`).not.toContain('private-user');
    return {
      code: Number(process.exitCode),
      lines: stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line)),
      error: stderr ? JSON.parse(stderr) : null,
      calls,
    };
  } finally {
    process.argv = originalArgv;
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
}

it.each([{ args: [] }, { args: ['--production-read-only'] }])(
  'does not contact a provider without --check: $args',
  async ({ args }) => {
    const result = await run(args);
    expect(result.code).toBe(0);
    expect(result.lines[0]).toMatchObject({ stage: 'configuration', providerCalls: false, configuredEnvironment: 'sandbox' });
    expect(result.calls).toEqual([]);
  },
);

it.each([
  { args: ['--check'], env: {} },
  { args: ['--check', '--production-read-only'], env: { REGISTRAR_CHECK_CONFIRM: 'read-only' } },
  { args: ['--check'], env: { REGISTRAR_CHECK_CONFIRM: 'production-read-only' } },
  { args: ['--check', '--unknown'], env: { REGISTRAR_CHECK_CONFIRM: 'read-only' } },
  { args: ['--check'], env: { DRY_RUN: 'false', REGISTRAR_CHECK_CONFIRM: 'read-only' } },
  { args: ['--check', '--production-read-only'], env: { DRY_RUN: 'false', REGISTRAR_CHECK_CONFIRM: 'production-read-only' } },
  {
    args: ['--check', '--production-read-only'],
    env: { REGISTRAR_ENV: 'production', REGISTRAR_CHECK_CONFIRM: 'production-read-only' },
  },
  {
    args: ['--check', '--production-read-only'],
    env: { REGISTRAR_PROVIDER: 'inwx', REGISTRAR_CHECK_CONFIRM: 'production-read-only' },
  },
  {
    args: ['--check', '--production-read-only'],
    env: { REGISTRAR_PASSWORD: '', REGISTRAR_CHECK_CONFIRM: 'production-read-only' },
  },
])('blocks unsafe/unconfirmed configuration before all provider calls: $env', async ({ args, env }) => {
  const result = await run(args, env);
  expect(result.code).toBe(1);
  expect(result.error).toMatchObject({ stage: 'blocked' });
  expect(result.calls).toEqual([]);
});

it.each(['sandbox', 'production'])(
  'uses only authenticated reads in %s without changing global configuration',
  async (environment) => {
    const production = environment === 'production';
    const result = await run(['--check', ...(production ? ['--production-read-only'] : [])], {
      REGISTRAR_CHECK_CONFIRM: production ? 'production-read-only' : 'read-only',
    });
    expect(result.code).toBe(0);
    expect(result.lines[0]).toMatchObject({
      stage: 'result',
      environment,
      configuredEnvironment: 'sandbox',
      authenticatedRead: true,
      globalProviderChanged: false,
      domainPurchased: false,
      dnsChanged: false,
    });
    expect(result.calls.map((call: { method: string }) => call.method)).toEqual(['account.login', 'domain.check']);
    expect(
      result.calls.every(
        (call: { url: string }) =>
          call.url === (production ? 'https://api.domrobot.com/jsonrpc/' : 'https://api.ote.domrobot.com/jsonrpc/'),
      ),
    ).toBe(true);
    expect(result.calls[1]!.domain).toEqual(['example.org']);
  },
);

it.each([
  { response: 'login-error', code: 2200, method: 'account.login' },
  { response: 'read-error', code: 2400, method: 'domain.check' },
  { response: 'empty', code: null, method: null },
])('does not certify rejected login/read or an empty reply: $response', async ({ response, code, method }) => {
  const result = await run(['--check', '--production-read-only'], {
    REGISTRAR_CHECK_CONFIRM: 'production-read-only',
    INWX_TEST_RESPONSE: response,
  });
  expect(result.code).toBe(1);
  expect(result.error).toMatchObject({ stage: 'blocked', environment: 'production', code, method });
  expect(result.lines.some((line) => line.authenticatedRead === true)).toBe(false);
});

it('requires 2FA when the account requests it and unlocks only with a configured test secret', async () => {
  const env = { REGISTRAR_CHECK_CONFIRM: 'production-read-only', INWX_TEST_RESPONSE: '2fa' };
  const blocked = await run(['--check', '--production-read-only'], env);
  expect(blocked.code).toBe(1);
  expect(blocked.calls.map((call: { method: string }) => call.method)).toEqual(['account.login']);
  const result = await run(['--check', '--production-read-only'], { ...env, REGISTRAR_TOTP_SECRET: 'JBSWY3DPEHPK3PXP' });
  expect(result.code).toBe(0);
  expect(result.calls.map((call: { method: string }) => call.method)).toEqual([
    'account.login',
    'account.unlock',
    'domain.check',
  ]);
});
