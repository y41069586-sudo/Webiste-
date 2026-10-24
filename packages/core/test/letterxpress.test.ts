import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { resetEnvCache, type Env } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { auditLog, demos, leads, letters } from '../src/db/schema';
import { getProviders, resetProviders, setProviders } from '../src/providers';
import {
  LetterXpressMailProvider,
  LxpApiError,
  lxpCostCents,
  mapLxpStatus,
  RateLimiter,
  type LxpPrintjob,
  type LxpTransport,
} from '../src/providers/mail/letterxpress';
import { registry } from '../src/providers/registry';
import { stopBoss } from '../src/queue';
import {
  balanceGuard,
  realLettersGate,
  sendApprovedLetters,
  sendLetter,
  submitLxpTestJob,
  syncLetterStatuses,
} from '../src/services/sending';
import { correctDeliveryEstimate, observedTransit } from '../src/services/tracking';
import { randomToken } from '../src/util/crypto';
import { addBusinessDays, addDays } from '../src/util/time';
import { OPERATOR_TEST_CONFIG, resetDb } from './helpers';

/** Nachbau der LetterXpress-API v3 im Speicher (Felder laut Dokumentation Juli 2026). */
class FakeLxp {
  jobs: LxpPrintjob[] = [];
  calls: { method: string; path: string; body: Record<string, unknown> }[] = [];
  balance = 54.89;
  failNext: number[] = [];
  nextId = 6035143;
  transport: LxpTransport = async (method, url, body) => {
    const path = url.replace('https://api.letterxpress.de/v3', '');
    this.calls.push({ method, path, body });
    const auth = body.auth as { username: string; apikey: string; mode: string };
    if (auth.apikey !== 'key') return { status: 401, json: { message: 'Unauthorized.' } };
    const fail = this.failNext.shift();
    if (fail) return { status: fail, json: { message: 'Fehler' } };
    if (method === 'GET' && path === '/balance')
      return { status: 200, json: { status: 200, message: 'OK', data: { balance: this.balance, currency: 'EUR' } } };
    if (method === 'GET' && path === '/price')
      return { status: 200, json: { status: 200, message: 'OK', data: { price: 0.81 } } };
    if (method === 'GET' && path.startsWith('/printjobs?filter=')) {
      const f = path.split('=')[1];
      return {
        status: 200,
        json: { status: 200, message: 'OK', data: { printjobs: this.jobs.filter((j) => j.status === f).reverse() } },
      };
    }
    if (method === 'POST' && path === '/printjobs') {
      const l = body.letter as Record<string, unknown>;
      const b64 = l.base64_file as string;
      if (createHash('md5').update(b64).digest('hex') !== l.base64_file_checksum)
        return { status: 400, json: { message: 'Checksum' } };
      const job: LxpPrintjob = {
        id: this.nextId++,
        status: auth.mode === 'test' ? 'draft' : 'queue',
        notice: (l.notice as string) ?? null,
        dispatch_date: null,
        created_at: '2026-10-24 10:00:00',
        updated_at: '2026-10-24 10:00:00',
        items: [{ address: 'Testbetrieb, Kampstraße 5, 44137 Dortmund', pages: 1, amount: 0.68, vat: 0.13, status: 'queue' }],
      };
      this.jobs.push(job);
      return { status: 200, json: { status: 200, message: 'OK', data: job } };
    }
    const m = /^\/printjobs\/(\d+)$/.exec(path);
    if (m) {
      const job = this.jobs.find((j) => j.id === Number(m[1]));
      if (!job) return { status: 404, json: { message: 'Not Found' } };
      if (method === 'GET') return { status: 200, json: { status: 200, message: 'OK', data: job } };
      if (method === 'DELETE') {
        job.status = 'canceled';
        return { status: 200, json: { status: 200, message: 'Print job deleted successfully' } };
      }
    }
    return { status: 405, json: { message: 'Method Not Allowed' } };
  };
}

function provider(fake: FakeLxp, mode: 'test' | 'live' = 'test') {
  return new LetterXpressMailProvider({
    username: 'user',
    apikey: 'key',
    mode,
    transport: fake.transport,
    retryDelayMs: 0,
    limiter: new RateLimiter(1000, 60_000),
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

describe('LetterXpress-Provider (API v3)', () => {
  it('überträgt PDF mit MD5-Prüfsumme, Spezifikation und Referenz im Feld notice; auth bei jedem Request', async () => {
    const fake = new FakeLxp();
    const p = provider(fake);
    const res = await p.send(Buffer.from('%PDF-1.7 test'), sendOpts);
    expect(res).toEqual({ providerLetterId: '6035143', status: 'queued', costCents: 81 });
    const post = fake.calls.find((c) => c.method === 'POST')!;
    const letter = post.body.letter as Record<string, unknown>;
    expect(letter.specification).toEqual({ color: '4', mode: 'simplex', shipping: 'national' });
    expect(letter.notice).toBe('wbm-l1');
    expect(letter).not.toHaveProperty('bank_form');
    expect(letter).not.toHaveProperty('terms_and_conditions');
    expect(letter).not.toHaveProperty('registered');
    for (const c of fake.calls) expect(c.body.auth).toEqual({ username: 'user', apikey: 'key', mode: 'test' });
    // GET mit Body (Dokumentation verlangt auth auch bei GET)
    expect(fake.calls[0]).toMatchObject({ method: 'GET', path: '/printjobs?filter=draft' });
  });

  it('idempotent: Auftrag mit gleicher Referenz wird gefunden statt neu übertragen', async () => {
    const fake = new FakeLxp();
    const p = provider(fake);
    const a = await p.send(Buffer.from('%PDF a'), sendOpts);
    const b = await p.send(Buffer.from('%PDF a'), sendOpts);
    expect(b.providerLetterId).toBe(a.providerLetterId);
    expect(fake.calls.filter((c) => c.method === 'POST')).toHaveLength(1);
  });

  it('Status, Kosten, Preis, Guthaben, Storno', async () => {
    const fake = new FakeLxp();
    const p = provider(fake, 'live');
    const { providerLetterId } = await p.send(Buffer.from('%PDF b'), sendOpts);
    expect((await p.getStatus(providerLetterId)).status).toBe('queued');
    fake.jobs[0]!.status = 'done';
    expect(await p.getStatus(providerLetterId)).toEqual({ status: 'sent', costCents: 81 });
    expect(await p.estimateCost(Buffer.from(''), { ...sendOpts })).toBe(81);
    expect((fake.calls.find((c) => c.path === '/price')!.body.letter as { specification: unknown }).specification).toEqual({
      pages: 1,
      color: '4',
      mode: 'simplex',
      shipping: 'national',
    });
    expect(await p.getBalance()).toEqual({ balanceCents: 5489, currency: 'EUR' });
    await p.cancel(providerLetterId);
    expect(mapLxpStatus(fake.jobs[0]!)).toBe('cancelled');
    expect(mapLxpStatus({ status: 'hold' })).toBe('queued');
    expect(lxpCostCents({ items: [] })).toBeUndefined();
    expect(p.verifyWebhook()).toBe(false);
  });

  it('Wiederholung bei 429/5xx für Abfragen, nie für POST; 401 sofort', async () => {
    const fake = new FakeLxp();
    const p = provider(fake);
    fake.failNext = [500, 429];
    expect((await p.getBalance()).balanceCents).toBe(5489);
    fake.failNext = [];
    await p.listPrintjobs('draft');
    fake.failNext = [500];
    // erster Aufruf (Duplikatsuche) scheitert einmal und wird wiederholt, POST läuft einmal
    await p.send(Buffer.from('%PDF c'), { ...sendOpts, reference: 'wbm-c' });
    fake.failNext = [];
    const posts = () => fake.calls.filter((c) => c.method === 'POST').length;
    const before = posts();
    const bad = provider(fake);
    (bad as unknown as { o: { apikey: string } }).o.apikey = 'falsch';
    await expect(bad.getBalance()).rejects.toBeInstanceOf(LxpApiError);
    fake.failNext = [503];
    // Duplikatsuche ok, POST 503 → kein zweiter POST
    fake.failNext = [];
    const p2 = provider(fake);
    const origin = fake.transport;
    let postCount = 0;
    fake.transport = async (m, u, b) =>
      m === 'POST' && ++postCount === 1 ? { status: 503, json: { message: 'x' } } : origin(m, u, b);
    const p3 = new LetterXpressMailProvider({
      username: 'user',
      apikey: 'key',
      mode: 'test',
      transport: fake.transport,
      retryDelayMs: 0,
    });
    await expect(p3.send(Buffer.from('%PDF d'), { ...sendOpts, reference: 'wbm-d' })).rejects.toThrow(/503/);
    expect(postCount).toBe(1);
    expect(posts()).toBe(before);
    void p2;
  });

  it('Rate-Limiter lässt höchstens N Aufrufe je Fenster durch', async () => {
    let t = 0;
    const waits: number[] = [];
    const l = new RateLimiter(
      2,
      1000,
      () => t,
      async (ms) => {
        waits.push(ms);
        t += ms;
      },
    );
    await l.acquire();
    await l.acquire();
    await l.acquire();
    expect(waits.length).toBe(1);
    expect(t).toBeGreaterThanOrEqual(1000);
  });

  it('Registry: LetterXpress verlangt Zugangsdaten, Standard ist Testmodus', () => {
    const base = { LXP_MODE: 'test', APP_URL: 'https://seitenwerk.world' } as unknown as Env;
    expect(() => registry.mail('letterxpress', base)).toThrow(/LXP_USERNAME/);
    const p = registry.mail('letterxpress', { ...base, LXP_USERNAME: 'u', LXP_APIKEY: 'k' } as Env)!;
    expect(p.name).toBe('letterxpress');
    expect(p.mode).toBe('test');
  });

  it('Freigabe-Reihenfolge: 3 Testaufträge → Testbrief live → erst nach Freischaltung echte Leads', () => {
    expect(realLettersGate('letterxpress', true, false, 'live', 2)).toMatch(/3 Testaufträge/);
    expect(realLettersGate('letterxpress', true, false, 'live', 3)).toBeNull();
    expect(realLettersGate('letterxpress', false, false, 'live', 3)).toMatch(/gesperrt/);
    expect(realLettersGate('letterxpress', false, true, 'live', 3)).toBeNull();
    // Testmodus: nichts wird gedruckt
    expect(realLettersGate('letterxpress', false, false, 'test', 0)).toBeNull();
  });
});

describe('LetterXpress im Versandablauf', () => {
  let fake: FakeLxp;
  beforeEach(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    await resetDb();
    await getDb().execute(sql`DELETE FROM counters WHERE name = 'lxp_test_jobs'`);
    fake = new FakeLxp();
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

  async function seedLetter(truthPassed = true) {
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
        truthCheckJson: { passed: truthPassed },
      })
      .returning();
    return { lead: lead!, letter: letter! };
  }

  it('Testauftrag auch bei DRY_RUN: Postbox, Zähler, Brief unverändert; ohne Wahrheits-Check verweigert', async () => {
    const { letter } = await seedLetter();
    const r = await submitLxpTestJob(letter.id, 'admin:test');
    expect(r.status).toBe('queued');
    expect(r.count).toBe(1);
    expect(fake.jobs[0]!.status).toBe('draft');
    expect((await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!.status).toBe('approved');
    const audits = await getDb().select().from(auditLog).where(eq(auditLog.action, 'lxp_test_job'));
    expect(audits).toHaveLength(1);
    await submitLxpTestJob(letter.id, 'admin:test');
    expect(fake.jobs).toHaveLength(2); // eigene Referenz je Testauftrag
    const { letter: unchecked } = await seedLetter(false);
    await expect(submitLxpTestJob(unchecked.id, 'admin:test')).rejects.toThrow(/Wahrheits-Check/);
    // DRY_RUN: normaler Versand überträgt nichts
    expect((await sendLetter(letter.id, 'admin:test')).state).toBe('dry_run');
    expect(fake.jobs).toHaveLength(2);
  });

  it('Live-Modus ohne 3 Testaufträge: auch kein Versand bei DRY_RUN=false', async () => {
    setProviders({ mail: provider(fake, 'live') });
    await liveSwitches();
    const { letter } = await seedLetter();
    await expect(sendLetter(letter.id, 'admin:test')).rejects.toThrow(/3 Testaufträge/);
    expect(fake.jobs).toHaveLength(0);
  });

  /** Echter Versand im Test: DRY_RUN in Umgebung und Einstellungen aufheben (wie in sending.test.ts) */
  async function liveSwitches(): Promise<void> {
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    await updateConfig({ switches: { dryRun: false, killSwitch: false } }, 'test');
  }

  it('Guthaben-Wächter stoppt die Charge und meldet', async () => {
    await liveSwitches();
    const { letter } = await seedLetter();
    fake.balance = 0.5;
    expect(await balanceGuard(getDb(), [letter.id])).not.toBeNull();
    const res = await sendApprovedLetters('admin:test');
    expect(res.stoppedBy).toBe('BalanceTooLow');
    expect(fake.jobs).toHaveLength(0);
    const alerts = await getDb().execute(sql`SELECT code FROM alerts`);
    expect(alerts.rows.map((r) => r.code)).toContain('mail_balance_low');
    fake.balance = 50;
    expect(await balanceGuard(getDb(), [letter.id])).toBeNull();
  });

  it('Polling: queue → sent setzt Versanddatum und geschätzte Zustellung; Scan vorher korrigiert die Schätzung', async () => {
    await liveSwitches();
    const { letter, lead } = await seedLetter();
    expect((await sendLetter(letter.id, 'admin:test')).state).toBe('sent');
    let l = (await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!;
    expect(l.status).toBe('queued');
    expect(l.provider).toBe('letterxpress');
    expect(l.costCents).toBe(81);
    fake.jobs[0]!.status = 'done';
    await syncLetterStatuses();
    l = (await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!;
    expect(l.status).toBe('sent');
    expect(l.sentAt).not.toBeNull();
    const expected = addBusinessDays(l.sentAt!, 3);
    expect(Math.abs(l.estimatedDeliveredAt!.getTime() - expected.getTime())).toBeLessThan(1000);
    // Scan einen Werktag nach dem Versand → Brief ist angekommen
    const scanAt = addBusinessDays(l.sentAt!, 1);
    expect(await correctDeliveryEstimate(getDb(), lead.id, scanAt)).toBe(true);
    l = (await getDb().query.letters.findFirst({ where: eq(letters.id, letter.id) }))!;
    expect(l.status).toBe('delivered');
    expect(l.deliveryCorrectedAt).toEqual(scanAt);
    expect(l.estimatedDeliveredAt).toEqual(scanAt);
    expect((await observedTransit()).samples).toBe(1);
  });
});
