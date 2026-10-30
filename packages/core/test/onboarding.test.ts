import { industryDirection } from '@wbm/templates';
import { deflateSync } from 'node:zlib';
import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { budgetLedger, changeRequests, customers, demos, leads, orders, outboundEmails, sites } from '../src/db/schema';
import { getProviders, setProviders } from '../src/providers';
import { MockRegistrar } from '../src/providers/mock/registrar';
import type { PaymentProvider } from '../src/providers/types';
import { stopBoss } from '../src/queue';
import { closeBrowser } from '../src/render/browser';
import { buildSite, deploySite, liveCheck, liveCheckDelayMinutes } from '../src/render/site';
import { onboardingErrors, WEEK_DAYS, type OnboardingData } from '../src/sites/onboarding-data';
import { validateRevision } from '../src/sites/revision';
import { simulateMockPayment, startCheckout } from '../src/services/orders';
import { sendRenewalReminders } from '../src/services/renewals';
import { v4Offer } from '../src/services/offers-v4';
import { startBillingV4 } from '../src/services/billing-v4';
import {
  approveDomainPurchase,
  approvePreview,
  ensureSiteForCustomer,
  getOnboardingContext,
  getPreviewContext,
  handleSiteForm,
  requestChanges,
  saveOnboarding,
  saveUpload,
} from '../src/services/sites';
import { randomToken } from '../src/util/crypto';
import { addDays } from '../src/util/time';
import { resetDb } from './helpers';

/** Minimales gültiges PNG (w × h, einfarbig). */
function png(w = 8, h = 8): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer) => {
    let c = 0xffffffff;
    for (const x of b) c = crcTable[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.concat(Array.from({ length: h }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0x46)])));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function paidCustomer(withDesign = false) {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomToken(10),
      businessName: 'Malerbetrieb Beispiel',
      branch: 'maler',
      branchGroup: 'handwerk',
      city: 'Dortmund',
      street: 'Kampstraße',
      houseNumber: '5',
      postalCode: '44137',
      phone: '+49 231 123456',
      segmentKey: 'dortmund:handwerk:maler',
      trackToken: randomToken(24),
      openingHours: { days: [1, 2, 3, 4, 5].map((day) => ({ day, periods: [{ open: '08:00', close: '17:00' }] })) },
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
      publishedAt: new Date(),
      expiresAt: addDays(new Date(), 30),
      contentJson: {
        ...(withDesign ? { _meta: { artDirection: industryDirection('handwerk', 'maler') } } : {}),
        hero_headline: 'Malerarbeiten in Dortmund',
        hero_subline: 'Sauber geplant und ordentlich ausgeführt – für Wohnung, Haus und Gewerbe.',
        services: [
          { title: 'Innenanstrich', text: 'Wände und Decken in Wohnräumen streichen.', icon: 'roller' },
          { title: 'Fassade', text: 'Fassaden reinigen und neu beschichten.', icon: 'house' },
          { title: 'Tapezieren', text: 'Tapeten entfernen und neu tapezieren.', icon: 'wall' },
        ],
        about: 'Wir arbeiten sorgfältig und sauber.\n\nSprechen Sie uns an.',
        cta_text: 'Jetzt anrufen',
        seo_title: 'Malerbetrieb Beispiel – Maler in Dortmund',
        seo_description: 'Malerarbeiten in Dortmund: Innenanstrich, Fassade und Tapezieren. Rufen Sie uns an.',
        faq: [
          { q: 'Wie läuft ein Auftrag ab?', a: 'Wir besprechen Ihr Vorhaben und planen die Arbeiten gemeinsam.' },
          { q: 'Arbeiten Sie auch in bewohnten Räumen?', a: 'Ja, wir decken Möbel und Böden sorgfältig ab.' },
          { q: 'Wie bekomme ich ein Angebot?', a: 'Rufen Sie uns an oder schreiben Sie uns über das Formular.' },
        ],
      },
    })
    .returning();
  const res = await startCheckout(
    demo!.slug,
    {
      company: 'Malerbetrieb Beispiel GmbH',
      contactName: 'Erika Beispiel',
      email: 'erika@example.org',
      street: 'Kampstraße 5',
      postalCode: '44137',
      city: 'Dortmund',
      domain: 'malerbetrieb-beispiel.de',
      b2b: true,
      terms: true,
    },
    { ua: 'x', ipHash: 'h', isBot: false },
  );
  if (!res.ok) throw new Error(res.error);
  const order = await db.query.orders.findFirst({ where: eq(orders.id, res.orderId) });
  await simulateMockPayment(order!.stripeSessionId!, 'paid');
  const customer = (await db.query.customers.findFirst({ where: eq(customers.orderId, res.orderId) }))!;
  return { lead: lead!, demo: demo!, customer };
}

const PRIVACY =
  'Datenschutzerklärung\n\n' + 'Wir verarbeiten personenbezogene Daten nur im Rahmen der gesetzlichen Bestimmungen. '.repeat(8);

function complete(d: OnboardingData): OnboardingData {
  return {
    ...d,
    texts: {
      ...d.texts,
      about: 'Meisterbetrieb seit 1998 in Dortmund.\n\nWir streichen, tapezieren und gestalten Fassaden.',
      services: [
        { title: 'Innenanstrich', text: 'Wände und Decken streichen.' },
        { title: 'Fassade', text: 'Fassaden reinigen und streichen.' },
      ],
    },
    impressum: {
      ...d.impressum,
      legalForm: 'GmbH',
      register: 'Amtsgericht Dortmund',
      registerNumber: 'HRB 12345',
      phone: '0231 123456',
      professionalTitle: 'Malermeister (verliehen in Deutschland)',
      chamber: 'Handwerkskammer Dortmund',
    },
    privacyText: PRIVACY,
    confirmed: true,
  };
}

describe('Onboarding-Daten', () => {
  it('Pflichtangaben: Register bei GmbH, Datenschutztext, Bestätigung', () => {
    const base = {
      business: { name: 'X', phone: '', email: '', street: 'A', houseNumber: '1', postalCode: '44137', city: 'Dortmund' },
      texts: {
        headline: 'Überschrift',
        subline: 'Untertitel',
        about: 'Über uns',
        services: [{ title: 'A', text: 'B' }],
        wishes: '',
      },
      hours: {
        mode: 'appointment' as const,
        days: WEEK_DAYS.map(({ day }) => ({ day, closed: true, open: '', close: '', open2: '', close2: '' })),
      },
      impressum: {
        company: 'X',
        legalForm: 'GmbH',
        owner: 'Y',
        street: 'A 1',
        postalCode: '44137',
        city: 'Dortmund',
        phone: '0231',
        email: 'a@b.de',
        register: '',
        registerNumber: '',
        vatId: '',
        chamber: '',
        professionalTitle: '',
        supervisoryAuthority: '',
      },
      privacyText: 'zu kurz',
      formTargetEmail: 'a@b.de',
      domain: 'x.de',
      photoAlts: {},
      confirmed: false,
    };
    const e = onboardingErrors(base)!;
    expect(Object.keys(e).sort()).toEqual(['confirmed', 'impressum.register', 'impressum.registerNumber', 'privacyText']);
    expect(
      onboardingErrors({
        ...base,
        impressum: { ...base.impressum, legalForm: 'Einzelunternehmen' },
        privacyText: PRIVACY,
        confirmed: true,
      }),
    ).toBeNull();
    const fixed = {
      ...base,
      hours: {
        mode: 'fixed' as const,
        days: base.hours.days.map((d) => (d.day === 1 ? { ...d, closed: false, open: '18:00', close: '09:00' } : d)),
      },
    };
    expect(Object.keys(onboardingErrors(fixed)!)).toContain('hours.days.0');
  });

  it('Überarbeitung: Fakten nur, wenn der Inhaber sie genannt hat', () => {
    const c = {
      hero_headline: 'Malerarbeiten in Dortmund',
      hero_subline: 'Seit 1998 Ihr Meisterbetrieb für Farbe und Fassade.',
      services: [{ title: 'Innenanstrich', text: 'Wände streichen.', icon: 'roller' as const }],
      about: 'Wir sind ein Meisterbetrieb.\n\nMit 5 Jahren Garantie.',
      cta_text: 'Jetzt anrufen',
      seo_title: 'Maler in Dortmund',
      seo_description: 'Malerarbeiten in Dortmund – Innenanstrich und Fassade.',
      faq: [
        { q: 'Frage eins?', a: 'Antwort eins.' },
        { q: 'Frage zwei?', a: 'Antwort zwei.' },
      ],
    };
    const v = validateRevision(c, 'Meisterbetrieb seit 1998', ['Dortmund']);
    expect(v.map((x) => x.rule).sort()).toEqual(['Preise/Garantien', 'Zahlen']);
  });
});

describe('Onboarding → Vorschau → Freigabe → Veröffentlichung', () => {
  beforeEach(async () => {
    process.env.DRY_RUN = 'false';
    resetEnvCache();
    await resetDb();
    await updateConfig({ switches: { dryRun: false, autoRegisterDomains: false } }, 'test');
  });
  afterAll(async () => {
    delete process.env.DRY_RUN;
    resetEnvCache();
    vi.unstubAllGlobals();
    await closeBrowser();
    await stopBoss();
  });

  it('behält die gekaufte Gestaltung über Onboarding und Textüberarbeitung', async () => {
    const { customer } = await paidCustomer(true);
    const ctx = await getOnboardingContext(customer.accessToken);
    expect(ctx.state).toBe('form');
    if (ctx.state !== 'form') return;
    await saveOnboarding(customer.accessToken, complete(ctx.data), { submit: true });
    const site = (await getDb().query.sites.findFirst({ where: eq(sites.customerId, customer.id) }))!;
    expect((site.contentJson?._meta as { artDirection: unknown }).artDirection).toEqual(industryDirection('handwerk', 'maler'));
    await buildSite(site.id);
    const revised = (await getDb().query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
    expect((revised.contentJson?._meta as { artDirection: unknown }).artDirection).toEqual(
      industryDirection('handwerk', 'maler'),
    );
    const html = (await getProviders().storage.get(revised.previewHtmlKey!))!.toString();
    expect(html).toContain('data-character="warm"');
    expect(html).not.toContain('KI-generiertes Beispielbild');
  });

  it('kompletter Ablauf mit Mock-Registrar und Mock-Hosting', async () => {
    const { customer, lead } = await paidCustomer();
    const db = getDb();
    const token = customer.accessToken;

    // Vorbelegung aus Lead/Bestellung/Demo
    const ctx = await getOnboardingContext(token);
    expect(ctx.state).toBe('form');
    if (ctx.state !== 'form') return;
    expect(ctx.data.business).toMatchObject({
      name: 'Malerbetrieb Beispiel',
      street: 'Kampstraße',
      houseNumber: '5',
      phone: '0231 123456',
    });
    expect(ctx.data.hours.mode).toBe('fixed');
    expect(ctx.data.hours.days.find((d) => d.day === 1)).toMatchObject({ closed: false, open: '08:00', close: '17:00' });
    expect(ctx.data.texts.services).toHaveLength(3);
    expect(ctx.data.impressum).toMatchObject({
      company: 'Malerbetrieb Beispiel GmbH',
      owner: 'Erika Beispiel',
      email: 'erika@example.org',
    });

    // Uploads: SVG/Text abgelehnt, PNG angenommen
    expect(await saveUpload(token, 'logo', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).toMatchObject({
      ok: false,
    });
    expect(await saveUpload(token, 'logo', png(120, 40))).toMatchObject({ ok: true });
    const photo = await saveUpload(token, 'photo', png(1600, 1200));
    expect(photo.ok).toBe(true);

    // Unvollständig absenden → Feldfehler, Entwurf bleibt gespeichert
    const draft = await saveOnboarding(token, { ...ctx.data, privacyText: 'kurz' }, { submit: true });
    expect(draft.ok).toBe(false);
    if (!draft.ok) expect(draft.fieldErrors).toHaveProperty('privacyText');

    const data = complete(ctx.data);
    if (photo.ok) data.photoAlts = { [photo.id]: 'Frisch gestrichenes Treppenhaus' };
    expect(await saveOnboarding(token, data, { submit: true })).toEqual({ ok: true, submitted: true });
    expect((await db.query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('onboarding');

    // Vorschau bauen (Mock-KI übernimmt die Angaben des Inhabers)
    const site = (await db.query.sites.findFirst({ where: eq(sites.customerId, customer.id) }))!;
    const built = await buildSite(site.id);
    expect(built).toMatchObject({ version: 1 });
    const s1 = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
    expect(s1.status).toBe('preview');
    const qa = (s1.contentJson as { _meta: { qa: { passed: boolean; checks: unknown[] } } })._meta.qa;
    expect(qa.checks.filter((c) => !(c as { passed: boolean }).passed)).toEqual([]);
    const preview = (await getProviders().storage.get(s1.previewHtmlKey!))!.toString('utf8');
    expect(preview).toContain('Meisterbetrieb seit 1998');
    expect(preview).toContain('noindex');
    expect(preview).toContain('aria-label="Vorschau"');
    expect(preview).toContain('alt="Frisch gestrichenes Treppenhaus"');
    expect(preview).toContain('data:image/jpeg;base64,');
    expect(preview).not.toContain('Beispiel-Leistungen');

    // Änderungsrunde
    expect(await requestChanges(token, 'Bitte die Überschrift ändern: Ihr Maler in Dortmund')).toEqual({
      ok: true,
      mode: 'round',
    });
    expect(await requestChanges(token, 'Noch etwas')).toMatchObject({ ok: false });
    const cr = (await db.select().from(changeRequests))[0]!;
    await buildSite(site.id, cr.id);
    const pv = await getPreviewContext(token);
    expect(pv.state).toBe('preview');
    if (pv.state === 'preview') expect(pv.roundsLeft).toBe(1);
    expect((await db.query.changeRequests.findFirst({ where: eq(changeRequests.id, cr.id) }))!.status).toBe('applied');

    // Freigabe → Deploy (Mock-Registrar registriert simuliert; echtes Hosting nicht beteiligt)
    expect(await approvePreview(token)).toEqual({ ok: true });
    expect(await deploySite(site.id)).toBe('deployed');
    const c2 = (await db.query.customers.findFirst({ where: eq(customers.id, customer.id) }))!;
    expect(c2.domainStatus).toBe('registered');
    expect(c2.registrarDomainId).toBe('mockdom_malerbetrieb-beispiel.de');
    expect((await db.select().from(budgetLedger)).some((b) => b.category === 'domain')).toBe(true);
    const s2 = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
    const storage = getProviders().storage;
    const files = await storage.list(`mock-hosting/${s2.hostingProjectId}/`);
    const names = files.map((f) => f.split('/').slice(2).join('/')).sort();
    expect(names).toEqual([
      '404.html',
      'assets/foto-1.jpg',
      'assets/logo.png',
      'danke.html',
      'datenschutz.html',
      'impressum.html',
      'index.html',
      'robots.txt',
      'sitemap.xml',
    ]);
    const live = (await storage.get(`mock-hosting/${s2.hostingProjectId}/index.html`))!.toString('utf8');
    expect(live).toContain('<meta name="robots" content="index, follow">');
    expect(live).not.toContain('Hinweis zum Entwurf');
    expect(live).toContain(`/api/forms/${s2.formKey}`);
    expect(live).toContain('src="assets/foto-1.jpg"');
    const imp = (await storage.get(`mock-hosting/${s2.hostingProjectId}/impressum.html`))!.toString('utf8');
    expect(imp).toContain('HRB 12345');
    expect(imp).toContain('Malermeister');

    // Live-Check gegen die (simulierte) Hosting-URL
    vi.stubGlobal('fetch', async (url: string | URL) => {
      const u = new URL(String(url));
      const key = `mock-hosting/${u.pathname.replace('/mock-hosting/', '')}`;
      const body = await storage.get(key);
      return new Response(body ? new Uint8Array(body) : 'nf', {
        status: body ? 200 : 404,
        headers: { 'content-type': 'text/html' },
      });
    });
    const res = await liveCheck(site.id, 0);
    vi.unstubAllGlobals();
    expect(res).toMatchObject({ ok: true });
    const s3 = (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!;
    expect(s3.status).toBe('live');
    const c3 = (await db.query.customers.findFirst({ where: eq(customers.id, customer.id) }))!;
    expect(c3.hostingUntil!.getTime()).toBeGreaterThan(addDays(new Date(), 360).getTime());
    expect((await db.query.leads.findFirst({ where: eq(leads.id, lead.id) }))!.status).toBe('live');
    const kinds = (await db.select().from(outboundEmails).where(eq(outboundEmails.customerId, customer.id)))
      .map((m) => m.kind)
      .sort();
    expect(kinds).toEqual(['live_handover', 'preview_ready', 'preview_ready']);

    // Kontaktformular der Live-Seite: Weiterleitung an den Kunden, Honeypot still verworfen
    const meta = { ua: 'x', ipHash: 'ip1', isBot: false };
    const ok = await handleSiteForm(
      s3.formKey,
      {
        name: 'Max Muster',
        email: 'max@example.net',
        phone: '',
        message: 'Bitte um Rückruf wegen Fassade.',
        consent: true,
        honeypot: '',
      },
      meta,
    );
    expect(ok).toMatchObject({ ok: true });
    if (ok.ok) expect(ok.redirect).toMatch(/danke\.html$/);
    await handleSiteForm(
      s3.formKey,
      { name: 'Bot', email: 'bot@example.net', phone: '', message: 'spam', consent: true, honeypot: 'x' },
      meta,
    );
    const forms = await db.select().from(outboundEmails).where(eq(outboundEmails.kind, 'site_form'));
    expect(forms).toHaveLength(1);
    expect(forms[0]!.toEmail).toBe('erika@example.org');

    // Erinnerung 30 Tage vor Ablauf (einmalig)
    await db
      .update(customers)
      .set({ hostingUntil: addDays(new Date(), 20) })
      .where(eq(customers.id, customer.id));
    expect(await sendRenewalReminders()).toBe(1);
    expect(await sendRenewalReminders()).toBe(0);
  });

  it.each(['basis', 'care_plus'] as const)(
    'Sandbox %s: vorhandene Domain anbinden, echte Prüfungen vor Monatsstart, kein Kauf',
    async (tier) => {
      const db = getDb();
      const { customer } = await paidCustomer();
      await updateConfig({ sender: { email: customer.email }, review: { qaLighthouse: false } }, 'test:sandbox');
      await db
        .update(orders)
        .set({
          provider: 'stripe',
          paymentMode: 'test',
          customerEmail: customer.email,
          customerCompany: 'Fiktiver TESTBETRIEB',
          offerSnapshot: v4Offer(tier, new Date().toISOString()),
        })
        .where(eq(orders.id, customer.orderId));
      await db
        .update(customers)
        .set({ domain: 'owned-fixture.test', domainStatus: 'registered' })
        .where(eq(customers.id, customer.id));
      const context = await getOnboardingContext(customer.accessToken);
      if (context.state !== 'form') throw new Error('Fixture');
      expect(
        await saveOnboarding(customer.accessToken, complete(context.data), {
          submit: true,
          enqueueBuild: false,
          actor: 'test:sandbox',
        }),
      ).toMatchObject({ ok: true });
      await buildSite(context.site.id);
      const built = (await db.query.sites.findFirst({ where: eq(sites.id, context.site.id) }))!;
      const qa = (built.contentJson as { _meta: { qa: { checks: { passed: boolean }[] } } })._meta.qa;
      expect(qa.checks.filter((c) => !c.passed)).toEqual([]);
      const original = getProviders();
      const files = new Map<string, string>();
      const attach = vi.fn(async () => ({ records: [] }));
      const register = vi.spyOn(original.registrar, 'registerDomain');
      const start = vi.fn<NonNullable<PaymentProvider['startSavedSubscription']>>(async (input) => ({
        id: `sub_fixture_${input.tier}`,
        status: 'active',
        priceId: `price_fixture_${input.tier}`,
        periodStart: new Date(),
        periodEnd: addDays(new Date(), 30),
      }));
      setProviders({
        hosting: {
          name: 'netlify',
          ensureProject: async () => ({ projectId: 'fixture_project', defaultUrl: 'https://owned-fixture.test/' }),
          deploy: async (_id, list) => {
            for (const f of list) files.set(f.path, String(f.content));
            return { deploymentId: 'fixture_deploy', url: 'https://owned-fixture.test/' };
          },
          attachDomain: attach,
          getDomainStatus: async (domain) => ({ domain, active: true, ssl: 'active' }),
          deleteProject: async () => {},
        },
        payment: {
          name: 'stripe',
          testMode: true,
          createCheckoutSession: original.payment.createCheckoutSession.bind(original.payment),
          parseWebhook: original.payment.parseWebhook.bind(original.payment),
          startSavedSubscription: start,
        },
      });
      try {
        await expect(startBillingV4(customer.orderId)).rejects.toThrow(/Go-Live/);
        expect(await approvePreview(customer.accessToken, { enqueueDeploy: false, actor: 'test:sandbox' })).toMatchObject({
          ok: true,
        });
        expect(await deploySite(context.site.id, 'test:sandbox', { enqueueLiveCheck: false })).toBe('deployed');
        expect(attach).toHaveBeenCalledWith('fixture_project', 'owned-fixture.test');
        expect(register).not.toHaveBeenCalled();
        expect((await db.select().from(budgetLedger)).filter((c) => c.category === 'domain')).toHaveLength(0);
        const originalHtml = files.get('index.html')!;
        expect(originalHtml).toContain('Fiktiver Sandbox-Test');
        expect(originalHtml).toContain('noindex');
        expect(originalHtml).not.toContain(customer.accessToken);
        expect(originalHtml).not.toContain(`/api/forms/${context.site.formKey}`);
        expect(files.get('robots.txt')).toContain('Disallow: /');
        expect(files.has('sitemap.xml')).toBe(false);
        // Staging protection must survive a later change of the operator's sender mailbox.
        await updateConfig({ sender: { email: 'changed@operator.test' } }, 'test:sandbox');
        vi.stubGlobal('fetch', async (url: string | URL) => {
          const key = new URL(String(url)).pathname.slice(1) || 'index.html',
            data = files.get(key);
          return new Response(data ?? 'not found', { status: data ? 200 : 404 });
        });
        files.set('index.html', originalHtml.replace('name="wbm-sandbox-test"', 'name="wrong-marker"'));
        expect(await liveCheck(context.site.id, 0, { scheduleRetry: false })).toMatchObject({ ok: false });
        expect(start).not.toHaveBeenCalled();
        files.set('index.html', originalHtml.replace(/content="noindex[^"]*"/g, 'content="index, follow"'));
        expect(await liveCheck(context.site.id, 0, { scheduleRetry: false })).toMatchObject({ ok: false });
        expect(start).not.toHaveBeenCalled();
        files.set('index.html', originalHtml);
        expect(await liveCheck(context.site.id, 0, { scheduleRetry: false })).toMatchObject({
          ok: true,
          checks: { indexable: false, indexPolicy: true, sandboxNotice: true },
        });
        expect((await db.query.sites.findFirst({ where: eq(sites.id, context.site.id) }))?.hostingProvider).toBe('netlify');
        expect((await db.query.customers.findFirst({ where: eq(customers.id, customer.id) }))?.domainExpiresAt).toBeNull();
        expect(start).toHaveBeenCalledOnce();
        expect(start.mock.calls[0]?.[0]).toMatchObject({ amountCents: tier === 'basis' ? 1900 : 9900 });
        await Promise.all([startBillingV4(customer.orderId), startBillingV4(customer.orderId)]);
        expect(start).toHaveBeenCalledOnce();
      } finally {
        vi.unstubAllGlobals();
        register.mockRestore();
        setProviders(original);
      }
    },
  );

  it('Stripe-Monatsstart blockiert einen Live-Status ohne tatsächlichen Hosting-Nachweis', async () => {
    const { customer } = await paidCustomer(),
      db = getDb(),
      previous = getProviders().payment;
    const site = await ensureSiteForCustomer(customer.id);
    await db
      .update(orders)
      .set({ provider: 'stripe', paymentMode: 'test', offerSnapshot: v4Offer('basis', new Date().toISOString()) })
      .where(eq(orders.id, customer.orderId));
    await db.update(sites).set({ status: 'live', liveAt: new Date() }).where(eq(sites.id, site.id));
    const start = vi.fn();
    setProviders({
      payment: {
        name: 'stripe',
        testMode: true,
        createCheckoutSession: previous.createCheckoutSession.bind(previous),
        parseWebhook: previous.parseWebhook.bind(previous),
        startSavedSubscription: start,
      },
    });
    try {
      await expect(startBillingV4(customer.orderId)).rejects.toThrow(/bestätigtes HTTPS-Hosting/);
      expect(start).not.toHaveBeenCalled();
    } finally {
      setProviders({ payment: previous });
    }
  });

  it('echter Registrar: ohne Freigabe kein Domainkauf; DRY_RUN registriert nie', async () => {
    const { customer } = await paidCustomer();
    const db = getDb();
    const fakeRegistrar = Object.assign(new MockRegistrar(), { name: 'inwx' });
    const register = vi.spyOn(fakeRegistrar, 'registerDomain');
    setProviders({ registrar: fakeRegistrar });
    try {
      const site = await ensureSiteForCustomer(customer.id);
      await db
        .update(sites)
        .set({
          status: 'approved',
          version: 1,
          contentJson: (await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!.contentJson,
        })
        .where(eq(sites.id, site.id));
      expect(await deploySite(site.id)).toBe('awaiting_domain_approval');
      expect(register).not.toHaveBeenCalled();
      expect((await db.query.sites.findFirst({ where: eq(sites.id, site.id) }))!.statusReason).toBe(
        'Domainkauf wartet auf Freigabe',
      );

      await approveDomainPurchase(customer.id, 'admin:test');
      await updateConfig({ switches: { dryRun: true } }, 'test');
      expect(await deploySite(site.id)).toBe('deployed');
      expect(register).not.toHaveBeenCalled();

      await updateConfig({ switches: { dryRun: false } }, 'test');
      expect(await deploySite(site.id)).toBe('deployed');
      expect(register).toHaveBeenCalledTimes(1);
    } finally {
      setProviders({ registrar: new MockRegistrar() });
    }
  });

  it('Live-Check: Abstände wachsen bis 60 Minuten', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(liveCheckDelayMinutes)).toEqual([2, 4, 8, 16, 32, 60, 60]);
  });
});
