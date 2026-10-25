import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import { PostmarkEmail } from '../src/providers/email/postmark';
import { ResendEmail } from '../src/providers/email/resend';
import { StripePayment } from '../src/providers/payment/stripe';

interface Captured {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

function fakeFetch(responder: (c: Captured) => { status?: number; json: unknown }) {
  const calls: Captured[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    const c: Captured = {
      url: String(url),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(h.entries()),
      body: init?.body ? String(init.body) : '',
    };
    calls.push(c);
    const r = responder(c);
    return new Response(JSON.stringify(r.json), {
      status: r.status ?? 200,
      headers: { 'content-type': 'application/json', 'request-id': 'req_test' },
    });
  }) as typeof fetch;
  return { fn, calls };
}

const SESSION = {
  id: 'cs_test_123',
  object: 'checkout.session',
  url: 'https://checkout.stripe.com/c/pay/cs_test_123',
  status: 'open',
  payment_status: 'unpaid',
  client_reference_id: 'order-1',
  payment_intent: null,
  amount_total: 59000,
  currency: 'eur',
  metadata: { orderId: 'order-1' },
};

describe('Stripe', () => {
  it('Checkout-Session: Parameter, Idempotency-Key, Ablaufzeit', async () => {
    const { fn, calls } = fakeFetch(() => ({ json: SESSION }));
    const p = new StripePayment({
      secretKey: 'sk_test_abc',
      webhookSecret: 'whsec_test',
      httpClient: Stripe.createFetchHttpClient(fn),
    });
    const res = await p.createCheckoutSession({
      orderId: 'order-1',
      amountCents: 59000,
      currency: 'eur',
      productName: 'Website-Paket – beispiel.de',
      productDescription: 'Beschreibung',
      customerEmail: 'a@example.org',
      successUrl: 'https://app.example/checkout/x/erfolg?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example/checkout/x?abgebrochen=1',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'checkout-order-1',
      expiresInMinutes: 60,
    });
    expect(res).toEqual({ sessionId: 'cs_test_123', url: SESSION.url });
    expect(p.testMode).toBe(true);
    const c = calls[0]!;
    expect(c.url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect(c.headers['idempotency-key']).toBe('checkout-order-1');
    expect(c.headers.authorization).toBe('Bearer sk_test_abc');
    const body = new URLSearchParams(c.body);
    expect(body.get('mode')).toBe('payment');
    expect(body.get('locale')).toBe('de');
    expect(body.get('client_reference_id')).toBe('order-1');
    expect(body.get('line_items[0][price_data][unit_amount]')).toBe('59000');
    expect(body.get('line_items[0][price_data][currency]')).toBe('eur');
    expect(body.get('success_url')).toContain('{CHECKOUT_SESSION_ID}');
    const exp = Number(body.get('expires_at'));
    expect(exp - Math.floor(Date.now() / 1000)).toBeGreaterThanOrEqual(59 * 60);
  });

  it('Webhook: gültige Signatur → normalisiertes Event; falsche Signatur → Fehler', async () => {
    const p = new StripePayment({ secretKey: 'sk_test_abc', webhookSecret: 'whsec_test_secret' });
    const payload = JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: { object: { ...SESSION, status: 'complete', payment_status: 'paid', payment_intent: 'pi_123' } },
    });
    const ev = await p.parseWebhook(payload, p.testSignature(payload));
    expect(ev).toMatchObject({
      eventId: 'evt_1',
      type: 'checkout.completed',
      sessionId: 'cs_test_123',
      clientReferenceId: 'order-1',
      paymentStatus: 'paid',
      paymentIntentId: 'pi_123',
      amountTotal: 59000,
    });
    await expect(p.parseWebhook(payload, 't=1,v1=deadbeef')).rejects.toThrow();
    await expect(p.parseWebhook(payload.replace('59000', '1'), p.testSignature(payload))).rejects.toThrow();
  });

  it('Gehosteter Checkout: Stripe erfasst Firma, Name, Adresse, Telefon und eigene Felder; Webhook liefert sie', async () => {
    const { fn, calls } = fakeFetch(() => ({ json: SESSION }));
    const p = new StripePayment({
      secretKey: 'sk_test_abc',
      webhookSecret: 'whsec_test_secret',
      httpClient: Stripe.createFetchHttpClient(fn),
    });
    await p.createCheckoutSession({
      orderId: 'order-1',
      amountCents: 4900,
      currency: 'eur',
      productName: 'Website-Paket monatlich',
      productDescription: 'Beschreibung',
      collect: {
        domainDefault: 'beispiel.de',
        termsUrl: 'https://app.example/agb',
        termsVersion: 'v1',
        submitNote: 'Mindestlaufzeit 12 Monate.',
      },
      successUrl: 'https://app.example/checkout/x/erfolg?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://app.example/d/x#uebernehmen',
      metadata: { orderId: 'order-1' },
      idempotencyKey: 'checkout-order-1',
      recurring: { interval: 'month' },
    });
    const body = new URLSearchParams(calls[0]!.body);
    expect(body.get('mode')).toBe('subscription');
    expect(body.get('customer_email')).toBeNull();
    expect(body.get('billing_address_collection')).toBe('required');
    expect(body.get('name_collection[business][enabled]')).toBe('true');
    expect(body.get('name_collection[individual][enabled]')).toBe('true');
    expect(body.get('phone_number_collection[enabled]')).toBe('true');
    expect(body.get('custom_fields[0][key]')).toBe('wunschdomain');
    expect(body.get('custom_fields[0][text][default_value]')).toBe('beispiel.de');
    expect(body.get('custom_fields[1][key]')).toBe('unternehmer');
    expect(body.get('custom_fields[2][key]')).toBe('agb');
    expect(body.get('custom_text[submit][message]')).toContain('Mindestlaufzeit 12 Monate.');

    const payload = JSON.stringify({
      id: 'evt_3',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          ...SESSION,
          status: 'complete',
          payment_status: 'paid',
          collected_information: { business_name: 'Malerei GmbH', individual_name: 'Erika Beispiel', shipping_details: null },
          customer_details: {
            email: 'erika@example.org',
            name: 'Erika B.',
            phone: '+49231123',
            address: { line1: 'Kampstraße 5', line2: null, postal_code: '44137', city: 'Dortmund', country: 'DE', state: null },
          },
          custom_fields: [
            { key: 'wunschdomain', type: 'text', text: { value: 'malerei.de' } },
            { key: 'unternehmer', type: 'dropdown', dropdown: { value: 'ja' } },
            { key: 'agb', type: 'dropdown', dropdown: { value: 'ja' } },
          ],
        },
      },
    });
    const ev = await p.parseWebhook(payload, p.testSignature(payload));
    expect(ev.customer).toEqual({
      businessName: 'Malerei GmbH',
      name: 'Erika Beispiel',
      email: 'erika@example.org',
      phone: '+49231123',
      address: { line1: 'Kampstraße 5', line2: undefined, postalCode: '44137', city: 'Dortmund', country: 'DE' },
      customFields: { wunschdomain: 'malerei.de', unternehmer: 'ja', agb: 'ja' },
    });
  });

  it('Webhook: Erstattung', async () => {
    const http = fakeFetch(() => ({
      json: {
        object: 'list',
        data: [
          { id: 're_confirmed', status: 'succeeded', amount: 59000 },
          { id: 're_pending', status: 'pending', amount: 1000 },
        ],
        has_more: false,
      },
    }));
    const p = new StripePayment({
      secretKey: 'sk_test_abc',
      webhookSecret: 'whsec_test_secret',
      httpClient: Stripe.createFetchHttpClient(http.fn),
    });
    const payload = JSON.stringify({
      id: 'evt_2',
      object: 'event',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_1',
          object: 'charge',
          amount: 59000,
          amount_refunded: 59000,
          currency: 'eur',
          payment_intent: 'pi_123',
          metadata: {},
        },
      },
    });
    expect(await p.parseWebhook(payload, p.testSignature(payload))).toMatchObject({
      type: 'charge.refunded',
      paymentIntentId: 'pi_123',
      amountRefunded: 59000,
    });
  });
});

describe('E-Mail-Anbieter', () => {
  const mail = {
    to: 'kunde@example.org',
    subject: 'Rechnung',
    text: 'Text',
    html: '<p>Text</p>',
    replyTo: 'hallo@example.com',
    tag: 'invoice',
    idempotencyKey: 'invoice:1',
    attachments: [{ filename: 'Rechnung.pdf', content: Buffer.from('%PDF'), contentType: 'application/pdf' }],
  };

  it('Resend: Bearer, Idempotency-Key, Base64-Anhang', async () => {
    const { fn, calls } = fakeFetch(() => ({ json: { id: 'msg_1' } }));
    const r = await new ResendEmail('re_key', 'Absender <a@example.com>', fn).send(mail);
    expect(r.messageId).toBe('msg_1');
    const c = calls[0]!;
    expect(c.url).toBe('https://api.resend.com/emails');
    expect(c.headers.authorization).toBe('Bearer re_key');
    expect(c.headers['idempotency-key']).toBe('invoice:1');
    const b = JSON.parse(c.body);
    expect(b).toMatchObject({
      from: 'Absender <a@example.com>',
      to: ['kunde@example.org'],
      reply_to: 'hallo@example.com',
      subject: 'Rechnung',
    });
    expect(b.attachments[0]).toEqual({ filename: 'Rechnung.pdf', content: Buffer.from('%PDF').toString('base64') });
  });

  it('Postmark: Server-Token, Anhang, kein Tracking; Fehlercode wird erkannt', async () => {
    const { fn, calls } = fakeFetch(() => ({ json: { MessageID: 'pm_1', ErrorCode: 0, Message: 'OK' } }));
    expect((await new PostmarkEmail('pm_token', 'a@example.com', fn).send(mail)).messageId).toBe('pm_1');
    const c = calls[0]!;
    expect(c.headers['x-postmark-server-token']).toBe('pm_token');
    const b = JSON.parse(c.body);
    expect(b).toMatchObject({
      From: 'a@example.com',
      To: 'kunde@example.org',
      TrackOpens: false,
      TrackLinks: 'None',
      MessageStream: 'outbound',
      Tag: 'invoice',
    });
    expect(b.Attachments[0]).toMatchObject({ Name: 'Rechnung.pdf', ContentType: 'application/pdf' });
    const bad = fakeFetch(() => ({ status: 422, json: { ErrorCode: 406, Message: 'Inactive recipient' } }));
    await expect(new PostmarkEmail('pm_token', 'a@example.com', bad.fn).send(mail)).rejects.toThrow(/406/);
    expect(bad.calls).toHaveLength(1); // 422 wird nicht wiederholt
  });
});
