import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { updateConfig } from '../src/config/service';
import { getDb } from '../src/db/client';
import { customers, leads, orders, outboundEmails, sites } from '../src/db/schema';
import { getProviders, resetProviders, setProviders } from '../src/providers';
import type { OutgoingEmail } from '../src/providers/types';
import { handleSiteForm, siteFormInput, testSiteFormToOwnInbox } from '../src/services/sites';
import type { SiteStatus } from '../src/types';
import { randomToken } from '../src/util/crypto';
import { resetDb } from './helpers';

const own = 'owner@acceptance.test';
const meta = { ua: 'test-browser', ipHash: 'test-ip-hash', isBot: false };
const input = {
  name: 'Testbesucherin',
  email: 'visitor@request.test',
  phone: '0123 456789',
  message: 'Ich möchte einen Termin anfragen.',
  consent: true,
  honeypot: '',
  requestType: 'Terminanfrage',
  wish: 'Dienstag um 10 Uhr, Haarschnitt',
};
const sent: OutgoingEmail[] = [];
let fail = false;

beforeEach(async () => {
  await resetDb();
  resetEnvCache();
  resetProviders();
  sent.length = 0;
  fail = false;
  setProviders({
    email: {
      name: 'resend',
      async send(mail) {
        if (fail) throw new Error('Simulierter Anbieterfehler');
        sent.push(mail);
        return { messageId: `test-mail-${sent.length}` };
      },
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetEnvCache();
  resetProviders();
});

async function fixture(
  options: { target?: string; company?: string; status?: SiteStatus; sandbox?: boolean; acceptance?: boolean } = {},
) {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomUUID(),
      businessName: options.company ?? 'FIKTIVER TEST Salon A',
      branch: 'friseur',
      branchGroup: 'beauty',
      city: 'Testort',
      segmentKey: 'test',
      trackToken: randomToken(24),
    })
    .returning();
  const [order] = await db
    .insert(orders)
    .values({
      ...(options.acceptance ? { id: '4991f35d-0c23-465f-b4b1-0f320d5a5f91' } : {}),
      leadId: lead!.id,
      provider: 'stripe',
      paymentMode: options.sandbox ? 'test' : 'live',
      status: 'paid',
      amountCents: 59700,
      netCents: 59700,
      customerEmail: options.acceptance ? own : 'billing@client.test',
      customerCompany: options.company ?? 'FIKTIVER TEST Salon A',
      customerName: 'Testinhaber',
      billingAddressJson: { street: 'Testweg 1', postalCode: '12345', city: 'Testort', country: 'DE' },
    })
    .returning();
  const [customer] = await db
    .insert(customers)
    .values({
      orderId: order!.id,
      leadId: lead!.id,
      company: order!.customerCompany,
      contactName: 'Testinhaber',
      email: order!.customerEmail,
      accessToken: randomToken(32),
      domain: 'salon.example.test',
    })
    .returning();
  const [site] = await db
    .insert(sites)
    .values({
      customerId: customer!.id,
      templateId: 'beauty-soft',
      palette: 'salbei',
      contentJson: {},
      formKey: randomToken(24),
      formTargetEmail: options.target ?? (options.acceptance ? own : 'inbox-a@client.test'),
      status: options.status ?? 'live',
      productionUrl: 'https://salon.example.test/',
    })
    .returning();
  return { lead: lead!, order: order!, customer: customer!, site: site! };
}

it('routes two businesses to their own stored recipients and preserves the direct visitor Reply-To and appointment details', async () => {
  const a = await fixture();
  const b = await fixture({ target: 'inbox-b@client.test', company: 'FIKTIVER TEST Salon B' });
  expect(await handleSiteForm(a.site.formKey, input, meta)).toMatchObject({
    ok: true,
    redirect: 'https://salon.example.test/danke.html',
  });
  expect(await handleSiteForm(b.site.formKey, input, meta)).toMatchObject({ ok: true });
  expect(sent.map((mail) => mail.to)).toEqual(['inbox-a@client.test', 'inbox-b@client.test']);
  expect(sent[0]).toMatchObject({ replyTo: input.email, subject: 'Terminanfrage von Testbesucherin' });
  expect(sent[0]!.text).toContain('Dienstag um 10 Uhr, Haarschnitt');
  expect(sent[0]!.text).toContain('FIKTIVER TEST Salon A');
  expect(sent[0]!.text).toContain('keine bestätigte Buchung');
  expect(sent[1]!.text).not.toContain('Salon A');
  const rows = await getDb().select().from(outboundEmails);
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.toEmail).sort()).toEqual(['inbox-a@client.test', 'inbox-b@client.test']);
});

it('shares HTTP field mapping and ignores forged recipient/acceptance/provider fields', async () => {
  const { site } = await fixture();
  const form = new FormData();
  for (const [key, value] of Object.entries({
    ...input,
    anliegen: input.requestType,
    wunsch: input.wish,
    consent: 'on',
    to: 'attacker@outside.test',
    acceptance: 'own-inbox',
    provider: 'resend',
  }))
    form.set(key, String(value));
  const parsed = siteFormInput(form);
  expect(parsed).not.toHaveProperty('to');
  expect(parsed).not.toHaveProperty('acceptance');
  expect(await handleSiteForm(site.formKey, parsed, meta)).toMatchObject({ ok: true });
  expect(sent[0]!.to).toBe(site.formTargetEmail);
});

it('returns unavailable without a success or outbox entry when the actual transport is mock', async () => {
  const { site } = await fixture();
  setProviders({ email: { name: 'mock', send: vi.fn() } });
  expect(await handleSiteForm(site.formKey, input, meta)).toMatchObject({ ok: false, reason: 'unavailable' });
  expect(await getDb().select().from(outboundEmails)).toHaveLength(0);
});

it.each([
  'onboarding',
  'generating',
  'preview',
  'changes_requested',
  'approved',
  'deploying',
  'failed',
  'suspended',
] as SiteStatus[])('blocks requests to a %s site', async (status) => {
  const { site } = await fixture({ status });
  expect(await handleSiteForm(site.formKey, input, meta)).toMatchObject({ ok: false, reason: 'not_found' });
  expect(sent).toHaveLength(0);
});

it('keeps public sandbox forms closed and rejects unpaid/refunded customers', async () => {
  const { site, order } = await fixture({ sandbox: true });
  expect(await handleSiteForm(site.formKey, input, meta)).toMatchObject({ ok: false, reason: 'not_found' });
  await getDb().update(orders).set({ paymentMode: 'live', status: 'refunded' }).where(eq(orders.id, order.id));
  expect(await handleSiteForm(site.formKey, input, meta)).toMatchObject({ ok: false, reason: 'not_found' });
  expect(sent).toHaveLength(0);
});

it.each([
  { consent: false },
  { name: 'x' },
  { email: 'invalid' },
  { message: '', wish: 'Ein langer Wunsch ersetzt keine Nachricht.' },
  { wish: 'x'.repeat(301) },
  { message: 'x'.repeat(4001) },
  { email: 'visitor@request.test\r\nBcc:other@outside.test' },
])('rejects invalid raw fields before sending, case %#', async (invalid) => {
  const { site } = await fixture();
  expect(await handleSiteForm(site.formKey, { ...input, ...invalid }, meta)).toMatchObject({ ok: false, reason: 'invalid' });
  expect(sent).toHaveLength(0);
});

it('does not send honeypot/link spam and limits repeated submissions', async () => {
  const { site } = await fixture();
  await handleSiteForm(site.formKey, { ...input, honeypot: 'bot' }, meta);
  await handleSiteForm(site.formKey, { ...input, message: 'https://a.test https://b.test https://c.test' }, meta);
  expect(sent).toHaveLength(0);
  for (let i = 0; i < 5; i++) await handleSiteForm(site.formKey, { ...input, message: `Echte Testanfrage Nummer ${i}` }, meta);
  expect(await handleSiteForm(site.formKey, input, meta)).toMatchObject({ ok: false, reason: 'rate_limited' });
  expect(sent).toHaveLength(5);
});

it('deduplicates an immediate repeat but permits a later identical legitimate request', async () => {
  const { site } = await fixture();
  const now = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
  await handleSiteForm(site.formKey, input, meta);
  await handleSiteForm(site.formKey, input, meta);
  expect(sent).toHaveLength(1);
  clock.mockReturnValue(now + 12 * 60_000);
  await handleSiteForm(site.formKey, input, meta);
  expect(sent).toHaveLength(2);
});

it('includes visitor/contact/destination details in deduplication, without treating different requests as one', async () => {
  const { site } = await fixture();
  await handleSiteForm(site.formKey, input, meta);
  await handleSiteForm(site.formKey, { ...input, name: 'Andere Besucherin' }, meta);
  await handleSiteForm(site.formKey, { ...input, wish: 'Mittwoch, 14 Uhr' }, meta);
  expect(sent).toHaveLength(3);
});

it('does not send two messages when the same request arrives concurrently', async () => {
  const { site } = await fixture();
  const results = await Promise.allSettled([
    handleSiteForm(site.formKey, input, meta),
    handleSiteForm(site.formKey, input, meta),
  ]);
  expect(results.some((result) => result.status === 'fulfilled' && result.value.ok)).toBe(true);
  expect(sent).toHaveLength(1);
  expect(await getDb().select().from(outboundEmails)).toHaveLength(1);
});

it('records a failed send and lets a retry deliver once instead of showing a false success', async () => {
  const { site } = await fixture();
  fail = true;
  await expect(handleSiteForm(site.formKey, input, meta)).rejects.toThrow('Simulierter Anbieterfehler');
  expect((await getDb().select().from(outboundEmails))[0]!.status).toBe('failed');
  fail = false;
  await handleSiteForm(site.formKey, input, meta);
  expect(sent).toHaveLength(1);
  expect(await getDb().select().from(outboundEmails)).toHaveLength(1);
});

it('sanitizes subject headers and does not trust an arbitrary request title', async () => {
  const { site } = await fixture();
  await handleSiteForm(site.formKey, { ...input, name: 'Test\r\nPerson', requestType: 'Bcc:other@outside.test\r\n' }, meta);
  expect(sent[0]!.subject).toBe('Kontaktanfrage von Test  Person');
  expect(sent[0]!.subject).not.toMatch(/[\r\n]/);
});

async function ownAcceptanceFixture() {
  vi.stubEnv('EMAIL_API_KEY', 'fake-key-never-used-on-network');
  vi.stubEnv('EMAIL_FROM', `Test <${own}>`);
  resetEnvCache();
  await updateConfig({ sender: { email: own } }, 'test:site-form');
  const data = await fixture({ sandbox: true, acceptance: true, status: 'preview' });
  const transport = vi.fn<typeof fetch>(async () => Response.json({ id: 'test-own-form-email' }));
  vi.stubGlobal('fetch', transport);
  setProviders({ email: { name: 'mock', send: vi.fn() } });
  return { ...data, transport };
}

it('sends one marked acceptance only to the own mailbox through the existing forwarder without activating public forms', async () => {
  const { site, transport } = await ownAcceptanceFixture();
  expect(await testSiteFormToOwnInbox('test:forms')).toMatchObject({
    status: 'sent',
    ownRecipient: true,
    deliveryVerified: false,
    globalProviderChanged: false,
    customerStateChanged: false,
  });
  expect(await testSiteFormToOwnInbox('test:forms')).toMatchObject({ status: 'duplicate' });
  expect(transport).toHaveBeenCalledTimes(1);
  const body = JSON.parse(String(transport.mock.calls[0]![1]?.body));
  expect(body.to).toEqual([own]);
  expect(body.reply_to).toBe(own);
  expect(body.subject).toContain('[TEST] Terminanfrage');
  expect(body.text).toContain('fiktiver Terminwunsch');
  expect(getProviders().email.name).toBe('mock');
  expect((await getDb().query.sites.findFirst({ where: eq(sites.id, site.id) }))!.status).toBe('preview');
  expect(await handleSiteForm(site.formKey, input, meta)).toMatchObject({ ok: false, reason: 'not_found' });
});

it('refuses the own-inbox acceptance if any stored recipient is external or the order is live', async () => {
  const { site, order, transport } = await ownAcceptanceFixture();
  await getDb().update(sites).set({ formTargetEmail: 'other@outside.test' }).where(eq(sites.id, site.id));
  await expect(testSiteFormToOwnInbox('test:forms')).rejects.toThrow(/eigene festgelegte/);
  await getDb().update(sites).set({ formTargetEmail: own }).where(eq(sites.id, site.id));
  await getDb().update(orders).set({ paymentMode: 'live' }).where(eq(orders.id, order.id));
  await expect(testSiteFormToOwnInbox('test:forms')).rejects.toThrow(/eigene festgelegte/);
  expect(transport).not.toHaveBeenCalled();
});
