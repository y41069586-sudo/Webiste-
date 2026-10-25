import { eq, sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { demos, events, leads, letters, orders } from '../src/db/schema';
import { stopBoss } from '../src/queue';
import { funnelRows, funnelStages, purchaseValueCents, refreshFunnel } from '../src/services/funnel';
import { markLetterUndeliverable, recordDemoEngagement, sanitizeEngagement, whatsappRedirect } from '../src/services/measurement';
import { simulateMockPayment, startCheckout, type CheckoutInput } from '../src/services/orders';
import { handleScan, recordEvent, type RequestMeta } from '../src/services/tracking';
import { DEFAULT_CONFIG } from '../src/config/settings';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { OPERATOR_TEST_CONFIG, resetDb } from './helpers';

const req: RequestMeta = { ua: 'mobil/safari', ipHash: 'abc123', isBot: false };

async function seedSentLetter(
  opts: { industry?: 'handwerk' | 'gastronomie'; segment?: 'neu' | 'etabliert'; sentDaysAgo?: number } = {},
) {
  const db = getDb();
  const sentAt = addDays(new Date(), -(opts.sentDaysAgo ?? 5));
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Café Pause',
      branch: opts.industry === 'gastronomie' ? 'cafe' : 'maler',
      branchGroup: opts.industry === 'gastronomie' ? 'gastronomie' : 'handwerk',
      industry: opts.industry ?? 'handwerk',
      leadSegment: opts.segment ?? 'etabliert',
      city: 'Dortmund',
      street: 'Kampstraße',
      houseNumber: '5',
      postalCode: '44137',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      shortCode: randomToken(6).toLowerCase(),
      domainSuggestion: 'cafe-pause.de',
      status: 'letter_delivered',
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
      publishedAt: sentAt,
      expiresAt: addDays(new Date(), 30),
    })
    .returning();
  const [letter] = await db
    .insert(letters)
    .values({
      leadId: lead!.id,
      demoId: demo!.id,
      sequence: 1,
      status: 'sent',
      provider: 'mock',
      providerLetterId: `mock_${randomToken(8)}`,
      sentAt,
      estimatedDeliveredAt: addDays(sentAt, 3),
      costCents: 81,
      industry: opts.industry ?? 'handwerk',
      truthCheckJson: { passed: true },
    })
    .returning();
  return { lead: lead!, demo: demo!, letter: letter! };
}

const checkoutInput: CheckoutInput = {
  company: 'Café Pause',
  contactName: 'Erika Beispiel',
  email: 'erika@example.org',
  phone: '0231 123456',
  street: 'Kampstraße 5',
  postalCode: '44137',
  city: 'Dortmund',
  domain: 'cafe-pause.de',
  b2b: true,
  terms: true,
};

describe('Messung und Funnel (L4)', () => {
  beforeEach(async () => {
    await resetDb();
    await updateConfig({ ...OPERATOR_TEST_CONFIG }, 'test');
  });
  afterAll(stopBoss);
  afterEach(() => vi.unstubAllEnvs());

  it('Abnahme: simulierter Durchlauf Scan → Demo → Kauf erscheint vollständig im Funnel', async () => {
    vi.stubEnv('ENGAGEMENT_TRACKING_APPROVED', 'true');
    await updateConfig({ metrics: { engagementBeacon: true } }, 'test:explicit-approval');
    const db = getDb();
    const { lead, demo } = await seedSentLetter({ industry: 'gastronomie', segment: 'neu' });
    // Scan über die Kurz-URL (Kanal wird mitgespeichert)
    expect('redirect' in (await handleScan(lead.trackToken, req, 'kurz'))).toBe(true);
    await recordEvent(db, { leadId: lead.id, type: 'demo_view', req });
    expect(await recordDemoEngagement(demo.slug, { t: 74, s: 83, c: ['speisekarte', 'uebernehmen', 'BÖSE<script>'] }, req)).toBe(
      true,
    );
    expect(await whatsappRedirect(demo.slug, req)).toMatch(/^https:\/\/wa\.me\/491701234567\?text=/);
    await recordEvent(db, { leadId: lead.id, type: 'cta_click', meta: { plan: 'monthly' }, req });
    const res = await startCheckout(demo.slug, { ...checkoutInput, plan: 'monthly' } as CheckoutInput, req);
    expect(res.ok).toBe(true);
    const order = (await db.select().from(orders).where(eq(orders.leadId, lead.id)))[0]!;
    await simulateMockPayment(order.stripeSessionId!, 'paid');

    await refreshFunnel(db);
    const [row] = await funnelRows({ groupBy: ['industry', 'variant', 'segment', 'week'] });
    expect(row).toMatchObject({
      industry: 'gastronomie',
      segment: 'neu',
      letters: 1,
      delivered: 1,
      scans: 1,
      demo_views: 1,
      engaged: 1,
      cta_clicks: 1,
      whatsapp: 1,
      checkouts: 1,
      abandoned: 0,
      purchases: 1,
      purchases_monthly: 1,
      purchases_one_time: 0,
      cost_cents: 81,
    });
    expect(row!.revenueCents).toBe(purchaseValueCents(DEFAULT_CONFIG, 'monthly'));
    expect(row!.week).toMatch(/^\d{4}-KW\d{2}$/);
    // Kanal, Gerät und grobe Engagement-Werte stehen am Ereignis – ohne IP, ohne Cookies
    const ev = await db.select().from(events).where(eq(events.leadId, lead.id));
    expect(ev.find((e) => e.type === 'scan')!.metaJson).toMatchObject({ via: 'kurz', ua: 'mobil/safari' });
    expect(ev.find((e) => e.type === 'demo_engagement')!.metaJson).toMatchObject({
      seconds: 75,
      scroll: 80,
      sections: ['speisekarte', 'uebernehmen'],
    });
    expect(JSON.stringify(ev)).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
    const stages = funnelStages(row!);
    expect(stages.map((s) => s.count)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('Auswertungsfenster: Kauf zählt erst 45 Tage nach Zustellung in die Kaufrate; abgebrochener Checkout', async () => {
    const db = getDb();
    const fresh = await seedSentLetter({ sentDaysAgo: 5 });
    const old = await seedSentLetter({ sentDaysAgo: 60 });
    await db.insert(events).values([
      { leadId: fresh.lead.id, type: 'paid', metaJson: { plan: 'one_time' } },
      // innerhalb des Fensters des alten Briefs (Versand vor 60 Tagen)
      { leadId: old.lead.id, type: 'checkout_started', metaJson: {}, createdAt: addDays(new Date(), -50) },
      { leadId: old.lead.id, type: 'checkout_abandoned', metaJson: { plan: 'one_time' }, createdAt: addDays(new Date(), -50) },
      // außerhalb des Fensters: zählt nicht mehr
      { leadId: old.lead.id, type: 'paid', metaJson: { plan: 'monthly' } },
    ]);
    await refreshFunnel(db);
    const [t] = await funnelRows();
    expect(t).toMatchObject({ letters: 2, delivered: 2, evaluated: 1, purchases: 1, purchases_evaluated: 0, checkouts: 1 });
    // der späte Kauf liegt außerhalb des Fensters – der Abbruch im Fenster bleibt sichtbar
    expect(t!.abandoned).toBe(1);
  });

  it('Ereignisse vor dem Versand zählen nicht; Testbriefe und Folgebriefe sind keine eigenen Arme', async () => {
    const db = getDb();
    const { lead } = await seedSentLetter();
    await db.insert(events).values({ leadId: lead.id, type: 'scan', metaJson: {}, createdAt: addDays(new Date(), -30) });
    await refreshFunnel(db);
    expect((await funnelRows())[0]!.scans).toBe(0);
    await db.execute(sql`UPDATE letters SET is_test = true`);
    await refreshFunnel(db);
    expect((await funnelRows())[0]?.letters ?? 0).toBe(0);
  });

  it('Rücksendung „unzustellbar“: Brief markiert, Lead failed, im Funnel gezählt', async () => {
    const db = getDb();
    const { lead, letter } = await seedSentLetter();
    expect(await markLetterUndeliverable(letter.id, 'admin:test')).toBe(true);
    expect(await markLetterUndeliverable(letter.id, 'admin:test')).toBe(false);
    expect((await db.query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('failed');
    await refreshFunnel(db);
    expect((await funnelRows())[0]).toMatchObject({ undeliverable: 1, delivered: 0 });
  });

  it('Beacon-Daten werden begrenzt und vergröbert; Bots und unbekannte Entwürfe werden ignoriert', async () => {
    expect(sanitizeEngagement({ t: 99999, s: 250, c: Array.from({ length: 50 }, (_, i) => `s${i}`) })).toEqual({
      t: 1800,
      s: 100,
      c: Array.from({ length: 20 }, (_, i) => `s${i}`),
    });
    expect(sanitizeEngagement({ t: -1, s: 3 })).toBeNull();
    expect(sanitizeEngagement('x')).toBeNull();
    const { demo } = await seedSentLetter();
    expect(await recordDemoEngagement(demo.slug, { t: 10, s: 10, c: [] }, { ...req, isBot: true })).toBe(false);
    expect(await recordDemoEngagement('unbekanntunbekanntunbekannt', { t: 10, s: 10, c: [] }, req)).toBe(false);
  });
});
