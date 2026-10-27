import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetEnvCache, type Env } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { auditLog, demos, leads, letters } from '../src/db/schema';
import { getProviders, resetProviders, setProviders } from '../src/providers';
import {
  EasyNovaApiError,
  EasyNovaMailProvider,
  easyNovaCostCents,
  mapEasyNovaStatus,
  type EasyNovaLetterStatus,
  type EasyNovaTransport,
} from '../src/providers/mail/easynova';
import { registry } from '../src/providers/registry';
import { stopBoss } from '../src/queue';
import { realLettersGate, sendLetter, submitProviderTestJob, syncLetterStatuses } from '../src/services/sending';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { OPERATOR_TEST_CONFIG, resetDb } from './helpers';

/** Nachbau der easyNova digiBrief-API V1 im Speicher (Felder laut OpenAPI, geprüft 27.10.2026). */
class FakeEasyNova {
  letters: (EasyNovaLetterStatus & { body: Record<string, unknown>; key?: string })[] = [];
  calls: { method: string; path: string; headers: Record<string, string>; body?: unknown }[] = [];
  balance = 42.5;
  logins = 0;
  tokens = new Set<string>();
  failNext: { status: number; retryAfterSeconds?: number }[] = [];
  nextId = 900001;
  transport: EasyNovaTransport = async (method, url, init) => {
    const path = url.replace('https://digibrief-api.easynova.de', '');
    this.calls.push({ method, path, headers: init.headers, body: init.body });
    if (path === '/api/Login') {
      const b = init.body as { ekp: string; password: string };
      if (b.ekp !== 'user@example.org' || b.password !== 'geheim')
        return { status: 400, json: { message: 'Anmeldung abgelehnt' } };
      const token = `t${++this.logins}`;
      this.tokens.add(token);
      return { status: 200, json: { token } };
    }
    if (!this.tokens.has(init.headers.authorization?.replace('Bearer ', '') ?? '')) return { status: 401, json: null };
    const fail = this.failNext.shift();
    if (fail) return { status: fail.status, json: { title: 'Fehler' }, retryAfterSeconds: fail.retryAfterSeconds };
    if (method === 'POST' && path === '/api/letter') {
      const key = init.headers['idempotency-key'];
      const known = key ? this.letters.find((l) => l.key === key) : undefined;
      if (known) return { status: 200, json: [{ fileName: known.fileName, letterID: known.letterID }] };
      const out = (init.body as Record<string, unknown>[]).map((b) => {
        const l = {
          letterID: this.nextId++,
          fileName: b.fileName as string,
          statusID: 1,
          testFlag: b.testFlag as boolean,
          body: b,
          key,
        };
        this.letters.push(l);
        return { fileName: l.fileName, letterID: l.letterID };
      });
      return { status: 200, json: out };
    }
    const m = /^\/api\/letter\/(\d+)$/.exec(path);
    if (method === 'GET' && m) {
      const l = this.letters.find((x) => x.letterID === Number(m[1]));
      return l ? { status: 200, json: l } : { status: 404, json: null };
    }
    if (method === 'POST' && path === '/api/pricePreview')
      return { status: 200, json: { pagesCount: 1, priceNet: 0.68, priceWithTax: 0.81 } };
    if (method === 'GET' && path === '/api/companyBilling')
      return { status: 200, json: { paymentMethod: 'Vorkasse', paymentBalance: this.balance, paymentRunning: 0 } };
    return { status: 404, json: null };
  };
}

function provider(fake: FakeEasyNova, mode: 'test' | 'live' = 'test', testEmail?: string) {
  return new EasyNovaMailProvider({
    username: 'user@example.org',
    password: 'geheim',
    mode,
    testEmail,
    transport: fake.transport,
    maxRetryDelayMs: 0,
  });
}

const sendOpts = {
  color: true,
  deliveryProduct: 'cheap',
  addressPosition: 'left' as const,
  recipientCountry: 'DE',
  pages: 1,
  idempotencyKey: 'l1',
  reference: 'wbm-l1',
};

describe('easyNova-Provider (digiBrief-API V1)', () => {
  it('liefert PDF als Base64 mit testFlag, Referenz und Idempotency-Key ein; Token wird wiederverwendet', async () => {
    const fake = new FakeEasyNova();
    const p = provider(fake, 'test', 'betreiber@example.org');
    const res = await p.send(Buffer.from('%PDF-1.7 test'), {
      ...sendOpts,
      recipient: { name: 'Testbetrieb', street: 'Kampstraße', number: '5', zip: '44137', city: 'Dortmund', country: 'DE' },
    });
    expect(res).toEqual({ providerLetterId: '900001', status: 'queued' });
    const post = fake.calls.find((c) => c.path === '/api/letter')!;
    expect(post.headers['idempotency-key']).toBe('l1');
    const body = (post.body as Record<string, unknown>[])[0]!;
    expect(body).toMatchObject({
      fileName: 'wbm-l1.pdf',
      data: Buffer.from('%PDF-1.7 test').toString('base64'),
      isColor: true,
      isDuplex: false,
      testFlag: true,
      testEMail: 'betreiber@example.org',
      testShowRestrictedArea: true,
      custom1: 'wbm-l1',
      addressLine1: 'Testbetrieb',
      zipCode: '44137',
    });
    // keine Adresskorrektur: falsch sitzende Anschrift soll abgelehnt statt umgesetzt werden
    expect(body).not.toHaveProperty('addressCorrection');
    expect(body).not.toHaveProperty('registeredLetter');
    await p.getStatus(res.providerLetterId);
    await p.getBalance();
    expect(fake.logins).toBe(1);
  });

  it('live: kein testFlag, keine Test-E-Mail; Wiederholung mit gleichem Schlüssel druckt nichts doppelt', async () => {
    const fake = new FakeEasyNova();
    const p = provider(fake, 'live', 'betreiber@example.org');
    const a = await p.send(Buffer.from('%PDF a'), sendOpts);
    const b = await p.send(Buffer.from('%PDF a'), sendOpts);
    expect(b.providerLetterId).toBe(a.providerLetterId);
    expect(fake.letters).toHaveLength(1);
    const body = fake.letters[0]!.body;
    expect(body.testFlag).toBe(false);
    expect(body).not.toHaveProperty('testEMail');
  });

  it('Status, Kosten erst nach Abrechnung, Preisvorschau, Guthaben', async () => {
    const fake = new FakeEasyNova();
    const p = provider(fake, 'live');
    const { providerLetterId } = await p.send(Buffer.from('%PDF b'), sendOpts);
    expect(await p.getStatus(providerLetterId)).toEqual({ status: 'queued', costCents: undefined });
    Object.assign(fake.letters[0]!, { statusID: 4, processedDate: '2026-10-28T06:00:00', priceNet: 0.68, priceWithTax: 0.81 });
    expect(await p.getStatus(providerLetterId)).toEqual({ status: 'sent', costCents: 81 });
    Object.assign(fake.letters[0]!, { statusID: 99, errorList: [{ code: 'ADR', description: 'Adresse nicht lesbar' }] });
    expect((await p.getStatus(providerLetterId)).status).toBe('failed');
    expect(await p.estimateCost(Buffer.from('%PDF'), sendOpts)).toBe(81);
    expect((fake.calls.find((c) => c.path === '/api/pricePreview')!.body as Record<string, unknown>).countryIso).toBe('DE');
    expect(await p.getBalance()).toEqual({ balanceCents: 4250, currency: 'EUR' });
    expect(mapEasyNovaStatus({ statusID: 3 })).toBe('queued');
    expect(mapEasyNovaStatus({ statusID: 1, processedDate: '2026-10-28T06:00:00' })).toBe('sent');
    expect(easyNovaCostCents({ priceWithTax: null })).toBeUndefined();
    expect(p.verifyWebhook()).toBe(false);
  });

  it('401 → einmal neu anmelden und wiederholen; falsche Zugangsdaten sofort Fehler', async () => {
    const fake = new FakeEasyNova();
    const p = provider(fake);
    await p.getBalance();
    fake.tokens.clear(); // z. B. Kennwortwechsel beim Anbieter
    expect((await p.getBalance()).balanceCents).toBe(4250);
    expect(fake.logins).toBe(2);
    const bad = new EasyNovaMailProvider({
      username: 'user@example.org',
      password: 'falsch',
      mode: 'test',
      transport: fake.transport,
    });
    await expect(bad.getBalance()).rejects.toBeInstanceOf(EasyNovaApiError);
  });

  it('503 + Retry-After: Einlieferung mit Idempotency-Key wird wiederholt, ohne Schlüssel nicht', async () => {
    const fake = new FakeEasyNova();
    const p = provider(fake);
    fake.failNext = [{ status: 503, retryAfterSeconds: 1 }];
    const res = await p.send(Buffer.from('%PDF c'), { ...sendOpts, idempotencyKey: 'c' });
    expect(res.providerLetterId).toBe('900001');
    expect(fake.calls.filter((c) => c.path === '/api/letter')).toHaveLength(2);
    fake.failNext = [{ status: 400 }];
    await expect(p.send(Buffer.from('%PDF d'), { ...sendOpts, idempotencyKey: 'd' })).rejects.toThrow(/400/);
    expect(fake.letters).toHaveLength(1);
  });

  it('Registry: easyNova verlangt Zugangsdaten, Standard ist Testmodus', () => {
    const base = { EASYNOVA_MODE: 'test', APP_URL: 'https://seitenwerk.world' } as unknown as Env;
    expect(() => registry.mail('easynova', base)).toThrow(/EASYNOVA_USERNAME/);
    const p = registry.mail('easynova', { ...base, EASYNOVA_USERNAME: 'u', EASYNOVA_PASSWORD: 'k' } as Env)!;
    expect(p.name).toBe('easynova');
    expect(p.mode).toBe('test');
  });

  it('Freigabe-Reihenfolge wie bei LetterXpress: 3 Testaufträge → Testbrief → Freischaltung', () => {
    expect(realLettersGate('easynova', true, false, 'live', 2)).toMatch(/3 Testaufträge im easyNova-Testmodus/);
    expect(realLettersGate('easynova', true, false, 'live', 3)).toBeNull();
    expect(realLettersGate('easynova', false, false, 'live', 3)).toMatch(/gesperrt/);
    expect(realLettersGate('easynova', false, true, 'live', 3)).toBeNull();
    expect(realLettersGate('easynova', false, false, 'test', 0)).toBeNull();
  });
});

describe('easyNova im Versandablauf', () => {
  let fake: FakeEasyNova;
  beforeEach(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    await resetDb();
    fake = new FakeEasyNova();
    resetProviders();
    setProviders({ mail: provider(fake) });
    await updateConfig(OPERATOR_TEST_CONFIG, 'test');
  });
  afterAll(async () => {
    delete process.env.DRY_RUN;
    resetProviders();
    resetEnvCache();
    await stopBoss();
  });

  async function seedLetter() {
    const db = getDb();
    const [lead] = await db
      .insert(leads)
      .values({
        source: 'mock',
        sourceId: randomToken(10),
        businessName: 'Testbetrieb',
        branch: 'maler',
        branchGroup: 'handwerk',
        city: 'Dortmund',
        street: 'Kampstraße',
        houseNumber: '5',
        postalCode: '44137',
        segmentKey: 'dortmund:handwerk:maler',
        trackToken: randomToken(24),
        status: 'letter_approved',
      })
      .returning();
    const [demo] = await db
      .insert(demos)
      .values({
        leadId: lead!.id,
        slug: randomToken(24),
        templateId: 'handwerk-solid',
        palette: 'werkblau',
        status: 'published',
        publishedAt: new Date(),
        expiresAt: addDays(new Date(), 30),
      })
      .returning();
    const key = `letters/${lead!.id}/x.pdf`;
    await getProviders().storage.put(key, Buffer.from('%PDF-1.7 test'));
    const [letter] = await db
      .insert(letters)
      .values({
        leadId: lead!.id,
        demoId: demo!.id,
        sequence: 1,
        pdfStorageKey: key,
        status: 'approved',
        estimatedCostCents: 81,
        truthCheckJson: { passed: true },
      })
      .returning();
    return letter!;
  }

  it('Testauftrag auch bei DRY_RUN: Testsendung mit eigenem Schlüssel, Zähler, Brief unverändert', async () => {
    const letter = await seedLetter();
    const r = await submitProviderTestJob(letter.id, 'admin:test');
    expect(r).toMatchObject({ status: 'queued', count: 1 });
    expect(fake.letters[0]!.testFlag).toBe(true);
    await submitProviderTestJob(letter.id, 'admin:test');
    expect(fake.letters).toHaveLength(2);
    expect(new Set(fake.letters.map((l) => l.key)).size).toBe(2);
    const counter = await getDb().execute<{ value: number }>(sql`SELECT value FROM counters WHERE name = 'easynova_test_jobs'`);
    expect(Number(counter.rows[0]!.value)).toBe(2);
    expect(await getDb().select().from(auditLog).where(eq(auditLog.action, 'easynova_test_job'))).toHaveLength(2);
    expect((await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!.status).toBe('approved');
    expect((await sendLetter(letter.id, 'admin:test')).state).toBe('dry_run');
    expect(fake.letters).toHaveLength(2);
  });

  it('Live ohne 3 Testaufträge gesperrt; danach Versand und Statusabgleich bis gedruckt', async () => {
    setProviders({ mail: provider(fake, 'live') });
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    // Testbrief an den Betreiber ist erledigt und echte Briefe sind freigeschaltet – nur die Testaufträge fehlen
    await updateConfig({ switches: { dryRun: false, killSwitch: false, realLettersUnlocked: true } }, 'test');
    const letter = await seedLetter();
    await expect(sendLetter(letter.id, 'admin:test')).rejects.toThrow(/3 Testaufträge im easyNova-Testmodus/);
    expect(fake.letters).toHaveLength(0);
    await getDb().execute(sql`INSERT INTO counters (name, value) VALUES ('easynova_test_jobs', 3)
      ON CONFLICT (name) DO UPDATE SET value = 3`);
    expect((await sendLetter(letter.id, 'admin:test')).state).toBe('sent');
    expect(fake.letters[0]!.testFlag).toBe(false);
    expect(fake.letters[0]!.key).toBe(letter.id);
    let l = (await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!;
    expect(l).toMatchObject({ status: 'queued', provider: 'easynova', providerLetterId: '900001' });
    Object.assign(fake.letters[0]!, { statusID: 4, processedDate: '2026-10-28T06:00:00', priceWithTax: 0.81 });
    await syncLetterStatuses();
    l = (await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!;
    expect(l.status).toBe('sent');
    expect(l.costCents).toBe(81);
  });
});
