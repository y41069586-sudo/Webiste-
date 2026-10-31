import { eq, like, sql } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { customers, demos, leads, orders, outboundEmails, settings, sites } from '../src/db/schema';
import { getProviders } from '../src/providers';
import { stopBoss } from '../src/queue';
import {
  beginCheckoutDraft,
  checkoutPreparedDraft,
  cleanupCheckoutDrafts,
  getCheckoutDraft,
  readCheckoutUpload,
  saveCheckoutDraft,
  setupFingerprint,
  setupSnapshotKey,
  uploadCheckoutDraft,
  type CheckoutDraft,
} from '../src/services/checkout-drafts';
import { simulateMockPayment } from '../src/services/orders';
import { completePreparedOnboarding, ensureSiteForCustomer } from '../src/services/sites';
import { randomToken, sha256 } from '../src/util/crypto';
import { resetDb } from './helpers';

const meta = { ua: 'mobil/safari', ipHash: 'setup-tests', isBot: false };
const consent = { terms: true, b2b: true, subscription: true };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMwcAgAAAFkAMErqCR/AAAAAElFTkSuQmCC', 'base64');
async function seed() {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      trackToken: randomToken(24),
      businessName: 'Maler Test',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Testweg',
      houseNumber: '4',
      postalCode: '44137',
      phone: '0231 123456',
      segmentKey: 'dortmund:handwerk:maler',
      status: 'cta_clicked',
      domainSuggestion: 'maler-test.de',
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
      publishedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 86400_000),
      contentJson: {
        hero_headline: 'Malerarbeiten für Ihr Zuhause',
        hero_subline: 'Innenräume sorgfältig gestalten.',
        about: 'Wir streichen Ihre Räume.',
        services: [{ title: 'Innenanstrich', text: 'Wände und Decken streichen.' }],
      },
    })
    .returning();
  const token = (await beginCheckoutDraft(demo!.slug, '', meta))!;
  const d = (await getCheckoutDraft(demo!.slug, token))!;
  const data = {
    ...d.data,
    impressum: { ...d.data.impressum, legalForm: 'Einzelunternehmen', owner: 'Erika Test', email: 'erika@example.test' },
    privacyText:
      'Datenschutzerklärung\n' +
      'Wir verarbeiten Ihre Daten zur Bearbeitung Ihrer Anfrage gemäß den geltenden Bestimmungen. '.repeat(7),
    formTargetEmail: 'anfragen@example.test',
    confirmed: true,
  };
  await saveCheckoutDraft(d.slug, token, data, true);
  return { token, d: (await getCheckoutDraft(d.slug, token))!, lead: lead! };
}
function pay(d: CheckoutDraft, token: string, plan = 'basis', fingerprint = setupFingerprint(d.data, d.assetKeys)) {
  return checkoutPreparedDraft(d.slug, token, plan, consent, fingerprint, meta);
}
beforeEach(async () => {
  vi.restoreAllMocks();
  await resetDb();
  await updateConfig({ offers: { activeVersion: 'v4' } }, 'test');
});
afterAll(async () => {
  vi.restoreAllMocks();
  await stopBoss();
});

describe('Einrichtung vor Zahlung', () => {
  it('speichert vollständige Daten und private Bilder ohne Bestellung, Kunde oder Versand', async () => {
    const payment = vi.spyOn(getProviders().payment, 'createCheckoutSession');
    const { token, d } = await seed();
    expect(d.data.impressum.owner).toBe('Erika Test');
    expect(await beginCheckoutDraft(d.slug, token, meta)).toBe(token);
    const upload = await uploadCheckoutDraft(d.slug, token, 'logo', png);
    expect(upload).toMatchObject({ id: 'logo' });
    expect((await readCheckoutUpload(d.slug, token, 'logo'))?.data).toEqual(png);
    expect(await getCheckoutDraft(d.slug, randomToken(48))).toBeNull();
    expect(await getCheckoutDraft(randomToken(24), token)).toBeNull();
    expect(await readCheckoutUpload(d.slug, '', 'logo')).toBeNull();
    expect(await uploadCheckoutDraft(d.slug, token, 'photo', Buffer.from('<svg/>'))).toHaveProperty('error');
    expect(await getDb().select().from(orders)).toHaveLength(0);
    expect(await getDb().select().from(customers)).toHaveLength(0);
    expect(await getDb().select().from(sites)).toHaveLength(0);
    expect(await getDb().select().from(outboundEmails)).toHaveLength(0);
    expect(payment).not.toHaveBeenCalled();
  });

  it('verlangt vollständige Einrichtung, Tarifwahl, aktuelle Zusammenfassung und Zustimmungen', async () => {
    const { token, d } = await seed();
    expect(await pay(d, token, '')).toMatchObject({ ok: false });
    expect(await pay(d, token, 'basis', 'alter-stand')).toMatchObject({ ok: false });
    expect(
      await checkoutPreparedDraft(
        d.slug,
        token,
        'basis',
        { ...consent, terms: false },
        setupFingerprint(d.data, d.assetKeys),
        meta,
      ),
    ).toMatchObject({ ok: false });
    await saveCheckoutDraft(d.slug, token, { ...d.data, privacyText: '' }, false);
    expect(await pay(d, token)).toMatchObject({ ok: false });
    expect(await getDb().select().from(orders)).toHaveLength(0);
  });

  it.each(['basis', 'care_plus'])(
    'übernimmt bei %s nach Zahlung exakt die bestätigten Daten und Bilder, ohne Go-Live',
    async (plan) => {
      const { token, d } = await seed();
      await uploadCheckoutDraft(d.slug, token, 'logo', png);
      const prepared = (await getCheckoutDraft(d.slug, token))!;
      const result = await pay(prepared, token, plan);
      expect(result?.ok).toBe(true);
      if (!result?.ok) throw new Error('Checkout fehlgeschlagen');
      const order = (await getDb().query.orders.findFirst({ where: eq(orders.id, result.orderId) }))!;
      expect(order.customerName).toBe('Erika Test');
      expect(order.amountCents).toBe(59700);
      expect(order.offerSnapshot?.monthlyCents).toBe(plan === 'basis' ? 1900 : 9900);
      expect(await getDb().select().from(sites)).toHaveLength(0);
      // Editing a draft after leaving the checkout cannot change the already bound order.
      await saveCheckoutDraft(d.slug, token, { ...d.data, formTargetEmail: 'neu@example.test' }, false);
      await simulateMockPayment(order.stripeSessionId!, 'paid');
      const customer = (await getDb().query.customers.findFirst({ where: eq(customers.orderId, order.id) }))!;
      const site = await ensureSiteForCustomer(customer.id);
      expect(site.onboardingJson).toMatchObject({
        formTargetEmail: 'anfragen@example.test',
        domain: 'maler-test.de',
        impressum: { owner: 'Erika Test' },
      });
      expect(site.assetKeys).toEqual(prepared.assetKeys);
      expect(site.formTargetEmail).toBe('anfragen@example.test');
      expect(site.status).toBe('generating');
      expect(site.onboardingSubmittedAt).not.toBeNull();
      expect(site.liveAt).toBeNull();
      expect(customer.domainStatus).not.toBe('registered');
      await completePreparedOnboarding(customer.id);
      await completePreparedOnboarding(customer.id);
      const builds = await getDb().execute<{ count: number }>(
        sql`SELECT count(*)::int AS count FROM pgboss.job WHERE name = 'build-site' AND data->>'siteId' = ${site.id} AND state IN ('created', 'retry', 'active')`,
      );
      expect(builds.rows[0]?.count).toBe(1);
    },
  );

  it('erstellt bei parallelen Doppelklicks nur eine Session; andere Inhalte erhalten einen neuen Bestellstand', async () => {
    const { token, d } = await seed();
    const payment = vi.spyOn(getProviders().payment, 'createCheckoutSession');
    const [a, b] = await Promise.all([pay(d, token), pay(d, token)]);
    expect(a?.ok && b?.ok && a.orderId === b.orderId).toBe(true);
    expect(payment).toHaveBeenCalledTimes(1);
    if (!a?.ok) throw new Error('Checkout fehlgeschlagen');
    await saveCheckoutDraft(d.slug, token, { ...d.data, formTargetEmail: 'neu@example.test' }, true);
    const changed = (await getCheckoutDraft(d.slug, token))!;
    const next = await pay(changed, token);
    expect(next?.ok && next.orderId !== a.orderId).toBe(true);
    const old = await getDb().query.settings.findFirst({ where: eq(settings.key, setupSnapshotKey(a.orderId)) });
    expect(old?.value).toMatchObject({ data: { formTargetEmail: 'anfragen@example.test' } });
  });

  it('behält Daten nach Providerfehler und erlaubt einen sicheren erneuten Versuch', async () => {
    const { token, d } = await seed();
    vi.spyOn(getProviders().payment, 'createCheckoutSession').mockRejectedValueOnce(new Error('test provider unavailable'));
    expect(await pay(d, token)).toMatchObject({ ok: false });
    expect((await getCheckoutDraft(d.slug, token))?.data).toEqual(d.data);
    expect(await pay(d, token)).toMatchObject({ ok: true });
  });

  it('verweigert abgelaufene oder gesperrte Entwürfe und entfernt unreferenzierte Uploads', async () => {
    const { token, d, lead } = await seed();
    await uploadCheckoutDraft(d.slug, token, 'logo', png);
    const current = (await getCheckoutDraft(d.slug, token))!;
    await getDb().update(leads).set({ status: 'suppressed' }).where(eq(leads.id, lead.id));
    expect(await getCheckoutDraft(d.slug, token)).toBeNull();
    expect(await pay(d, token)).toBeNull();
    await getDb()
      .update(settings)
      .set({ value: { ...current, expiresAt: new Date(0).toISOString() } })
      .where(eq(settings.key, `checkout-draft:${sha256(token)}`));
    await cleanupCheckoutDrafts();
    expect(await getProviders().storage.get(current.assetKeys.logo!)).toBeNull();
    expect(await getDb().select().from(settings).where(like(settings.key, 'checkout-draft:%'))).toHaveLength(0);
  });

  it('löscht abgelaufene Entwürfe, bewahrt aber übernommene Kundenbilder', async () => {
    const { token, d } = await seed();
    await uploadCheckoutDraft(d.slug, token, 'logo', png);
    const current = (await getCheckoutDraft(d.slug, token))!;
    const result = await pay(current, token);
    if (!result?.ok) throw new Error('Checkout fehlgeschlagen');
    const order = (await getDb().query.orders.findFirst({ where: eq(orders.id, result.orderId) }))!;
    await simulateMockPayment(order.stripeSessionId!, 'paid');
    await getDb()
      .update(settings)
      .set({ value: { ...current, expiresAt: new Date(0).toISOString() } })
      .where(eq(settings.key, `checkout-draft:${sha256(token)}`));
    await cleanupCheckoutDrafts();
    expect(await getProviders().storage.get(current.assetKeys.logo!)).toEqual(png);
    expect(await getDb().select().from(settings).where(like(settings.key, 'checkout-draft:%'))).toHaveLength(0);
    expect(await getDb().query.settings.findFirst({ where: eq(settings.key, setupSnapshotKey(order.id)) })).toBeUndefined();
  });
});
