import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getDb } from '../src/db/client';
import { demos, leads, orders, outboundEmails, sites, webhookEvents } from '../src/db/schema';
import { getProviders, resetProviders, setProviders } from '../src/providers';
import type { MockPayment } from '../src/providers/mock/payment';
import type { EmailProvider, HostingProvider } from '../src/providers/types';
import { stopBoss } from '../src/queue';
import { deploySite } from '../src/render/site';
import { sendTransactionalEmail } from '../src/services/email';
import { processPaymentWebhook, startCheckout } from '../src/services/orders';
import { ensureSiteForCustomer } from '../src/services/sites';
import { systemHealth } from '../src/services/monitoring';
import { randomToken } from '../src/util/crypto';
import { HttpError, withRetry } from '../src/util/retry';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

describe('Fehlertoleranz', () => {
  beforeEach(async () => {
    await resetDb();
  });
  afterEach(() => {
    resetProviders();
  });
  afterAll(async () => {
    await stopBoss();
  });

  it('Wiederholung nur bei vorübergehenden Fehlern (429/5xx/Netz), nicht bei 4xx', async () => {
    let n = 0;
    const ok = await withRetry(
      async () => {
        if (++n < 3) throw new HttpError('busy', n === 1 ? 429 : 503);
        return 'ok';
      },
      { baseDelayMs: 1 },
    );
    expect([ok, n]).toEqual(['ok', 3]);
    let m = 0;
    await expect(
      withRetry(
        async () => {
          m++;
          throw new HttpError('bad', 400);
        },
        { baseDelayMs: 1 },
      ),
    ).rejects.toThrow('bad');
    expect(m).toBe(1);
  });

  it('E-Mail-Anbieter fällt aus: Versuch als „failed“, nächster Lauf sendet genau einmal', async () => {
    let calls = 0;
    const flaky: EmailProvider = {
      name: 'flaky',
      async send() {
        calls++;
        if (calls === 1) throw new HttpError('down', 503);
        return { messageId: `m${calls}` };
      },
    };
    setProviders({ email: flaky });
    const mail = { kind: 'test', idempotencyKey: 'flaky-1', to: 'a@example.org', subject: 's', text: 't', html: '' };
    await expect(sendTransactionalEmail(mail)).rejects.toThrow('down');
    expect((await getDb().select().from(outboundEmails))[0]!.status).toBe('failed');
    expect((await sendTransactionalEmail(mail)).status).toBe('sent');
    expect((await sendTransactionalEmail(mail)).status).toBe('duplicate');
    expect(calls).toBe(2);
  });

  it('Absturz mitten in der Webhook-Verarbeitung: erneute Zustellung wird verarbeitet (nicht als Duplikat verworfen)', async () => {
    const db = getDb();
    const [lead] = await db
      .insert(leads)
      .values({
        source: 'mock',
        sourceId: randomToken(8),
        businessName: 'Elektro Test',
        branch: 'elektriker',
        branchGroup: 'handwerk',
        city: 'Dortmund',
        street: 'A',
        houseNumber: '1',
        postalCode: '44137',
        segmentKey: 'dortmund:handwerk:elektriker',
        trackToken: randomToken(24),
        status: 'cta_clicked',
      })
      .returning();
    const [demo] = await db
      .insert(demos)
      .values({
        leadId: lead!.id,
        slug: randomToken(24),
        templateId: 'handwerk-klar',
        palette: 'werkblau',
        status: 'published',
        expiresAt: addDays(new Date(), 10),
      })
      .returning();
    const res = await startCheckout(
      demo!.slug,
      {
        company: 'Elektro Test',
        contactName: 'Max Test',
        email: 'm@example.org',
        street: 'Hauptweg 1',
        postalCode: '44137',
        city: 'Dortmund',
        domain: 'elektro-test-dortmund.de',
        b2b: true,
        terms: true,
      },
      { ua: 'x', ipHash: 'h', isBot: false },
    );
    if (!res.ok) throw new Error(res.error);
    const order = (await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) }))!;
    // Event wurde registriert, Verarbeitung brach ab (processedAt fehlt)
    await db
      .insert(webhookEvents)
      .values({ provider: 'mock', eventId: 'evt_crash', type: 'checkout.session.completed', error: 'Absturz' });
    const p = getProviders().payment as MockPayment;
    const raw = JSON.stringify({
      eventId: 'evt_crash',
      type: 'checkout.completed',
      rawType: 'checkout.session.completed',
      sessionId: order.stripeSessionId,
      paymentStatus: 'paid',
      amountTotal: 59000,
      currency: 'eur',
    });
    expect(await processPaymentWebhook(raw, p.sign(raw))).toMatchObject({ duplicate: false, result: 'paid' });
    expect((await db.query.orders.findFirst({ where: eq(orders.id, order.id) }))!.status).toBe('paid');
    expect(await processPaymentWebhook(raw, p.sign(raw))).toMatchObject({ duplicate: true });
  });

  it('Hosting fällt beim Deploy aus: Seite bleibt „deploying“, Wiederholung veröffentlicht', async () => {
    const db = getDb();
    const [lead] = await db
      .insert(leads)
      .values({
        source: 'mock',
        sourceId: randomToken(8),
        businessName: 'Maler Test',
        branch: 'maler',
        branchGroup: 'handwerk',
        city: 'Dortmund',
        street: 'A',
        houseNumber: '1',
        postalCode: '44137',
        segmentKey: 'dortmund:handwerk:maler',
        trackToken: randomToken(24),
        status: 'cta_clicked',
      })
      .returning();
    const [demo] = await db
      .insert(demos)
      .values({
        leadId: lead!.id,
        slug: randomToken(24),
        templateId: 'handwerk-klar',
        palette: 'werkblau',
        status: 'published',
        expiresAt: addDays(new Date(), 10),
        contentJson: {
          hero_headline: 'Maler',
          hero_subline: 'x',
          services: [{ title: 'A', text: 'B', icon: 'roller' }],
          about: 'x',
          cta_text: 'x',
          seo_title: 'x',
          seo_description: 'x',
          faq: [],
        },
      })
      .returning();
    const res = await startCheckout(
      demo!.slug,
      {
        company: 'Maler Test',
        contactName: 'Max Test',
        email: 'm@example.org',
        street: 'Hauptweg 1',
        postalCode: '44137',
        city: 'Dortmund',
        domain: 'maler-test-dortmund.de',
        b2b: true,
        terms: true,
      },
      { ua: 'x', ipHash: 'h', isBot: false },
    );
    if (!res.ok) throw new Error(res.error);
    const p = getProviders().payment as MockPayment;
    const order = (await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) }))!;
    const raw = JSON.stringify({
      eventId: 'evt_pay',
      type: 'checkout.completed',
      rawType: 'x',
      sessionId: order.stripeSessionId,
      paymentStatus: 'paid',
      amountTotal: 59000,
      currency: 'eur',
    });
    await processPaymentWebhook(raw, p.sign(raw));
    const customer = (await db.query.customers.findFirst())!;
    const site = await ensureSiteForCustomer(customer.id);
    await db.update(sites).set({ status: 'approved', version: 1 }).where(eq(sites.id, site.id));
    const real = getProviders().hosting;
    let fail = true;
    const flaky: HostingProvider = {
      name: real.name,
      ensureProject: (n) => real.ensureProject(n),
      deploy: async (id, files) => {
        if (fail) throw new HttpError('Hosting down', 502);
        return real.deploy(id, files);
      },
      attachDomain: (id, d) => real.attachDomain(id, d),
      getDomainStatus: (id, d) => real.getDomainStatus(id, d),
    };
    setProviders({ hosting: flaky });
    await expect(deploySite(site.id)).rejects.toThrow('Hosting down');
    expect((await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!.status).toBe('deploying');
    fail = false;
    expect(await deploySite(site.id)).toBe('deployed');
  }, 60_000);

  it('Health meldet Probleme (Worker ohne Herzschlag) statt zu scheitern', async () => {
    const h = await systemHealth();
    expect(h.db).toBe(true);
    expect(h.storage).toBe(true);
    expect(h.status).toBe('degraded');
    expect(h.problems.join(' ')).toMatch(/Worker/);
  });
});
