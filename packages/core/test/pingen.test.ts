import { describe, expect, it } from 'vitest';
import { PingenMailProvider, mapPingenStatus } from '../src/providers/mail/pingen';
import { hmacSha256 } from '../src/util/crypto';

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function fakeFetch(calls: Call[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    calls.push({ url, method: init?.method ?? 'GET', headers, body: init?.body });
    const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
    if (url.endsWith('/auth/access-tokens')) return json({ token_type: 'Bearer', expires_in: 43200, access_token: 'tok123' });
    if (url.endsWith('/file-upload')) return json({ data: { id: 'u1', type: 'file_uploads', attributes: { url: 'https://s3.example/upload?sig=1', url_signature: '$2y$sig', expires_at: '2026-10-23T10:00:00+0200' } } });
    if (url.startsWith('https://s3.example')) return new Response('', { status: 200 });
    if (url.endsWith('/price-calculator')) return json({ data: { id: 'p', type: 'letter_price_calculator', attributes: { currency: 'EUR', price: 1.07 } } });
    if (url.endsWith('/deliveries/letters') && init?.method === 'POST') return json({ data: { id: 'L-1', type: 'letters', attributes: { status: 'validating', price_value: null } } }, 201);
    if (url.includes('/deliveries/letters/L-1')) return json({ data: { id: 'L-1', type: 'letters', attributes: { status: 'sent', price_value: 1.07 } } });
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

const cfg = { clientId: 'cid', clientSecret: 'secret', organisationId: 'org-1', env: 'staging' as const, webhookSecret: 'whsec_0123456789abcdefghij' };

describe('Pingen-Provider (gegen nachgebildete API v2)', () => {
  it('Preisrechner mit Seitenzahl, Druckmodus und Farbe', async () => {
    const calls: Call[] = [];
    const p = new PingenMailProvider(cfg, fakeFetch(calls));
    const cents = await p.estimateCost(Buffer.from('%PDF'), { color: true, deliveryProduct: 'cheap', addressPosition: 'left', recipientCountry: 'DE', pages: 2 });
    expect(cents).toBe(107);
    expect(calls[0]!.url).toBe('https://identity-staging.pingen.com/auth/access-tokens');
    expect(String(calls[0]!.body)).toContain('grant_type=client_credentials');
    const priceCall = calls[1]!;
    expect(priceCall.url).toBe('https://api-staging.pingen.com/organisations/org-1/deliveries/letters/price-calculator');
    expect(priceCall.headers.authorization).toBe('Bearer tok123');
    expect(priceCall.headers['content-type']).toBe('application/vnd.api+json');
    expect(JSON.parse(String(priceCall.body))).toEqual({
      data: { type: 'letter_price_calculator', attributes: { country: 'DE', paper_types: ['normal', 'normal'], print_mode: 'duplex', print_spectrum: 'color', delivery_product: 'cheap' } },
    });
  });

  it('Versand: Upload-URL, PUT, Brief mit auto_send und Idempotency-Key', async () => {
    const calls: Call[] = [];
    const p = new PingenMailProvider(cfg, fakeFetch(calls));
    const res = await p.send(Buffer.from('%PDF-1.7'), {
      color: false,
      deliveryProduct: 'cheap',
      addressPosition: 'left',
      recipientCountry: 'DE',
      idempotencyKey: '11111111-2222-3333-4444-555555555555',
      reference: 'wbm-abc',
      pages: 1,
      recipient: { name: 'An das Team von Testbetrieb', street: 'Kampstraße', number: '5', zip: '44137', city: 'Dortmund', country: 'DE' },
      sender: { name: 'Website-Brief', street: 'Musterstraße', number: '1', zip: '44135', city: 'Dortmund', country: 'DE' },
    });
    expect(res).toEqual({ providerLetterId: 'L-1', status: 'validating' });
    const upload = calls.find((c) => c.url.startsWith('https://s3.example'))!;
    expect(upload.method).toBe('PUT');
    expect(upload.headers.authorization).toBeUndefined();
    const create = calls.find((c) => c.url.endsWith('/organisations/org-1/deliveries/letters'))!;
    expect(create.headers['idempotency-key']).toBe('11111111-2222-3333-4444-555555555555');
    const body = JSON.parse(String(create.body));
    expect(body.data.type).toBe('letters');
    expect(body.data.attributes).toMatchObject({
      file_original_name: 'wbm-abc.pdf',
      file_url: 'https://s3.example/upload?sig=1',
      file_url_signature: '$2y$sig',
      address_position: 'left',
      auto_send: true,
      delivery_product: 'cheap',
      print_mode: 'simplex',
      print_spectrum: 'grayscale',
    });
    expect(body.data.attributes.meta_data.recipient.zip).toBe('44137');
    // Token wird wiederverwendet
    expect(calls.filter((c) => c.url.endsWith('/auth/access-tokens'))).toHaveLength(1);
  });

  it('Statusabfrage und Statuszuordnung', async () => {
    const p = new PingenMailProvider(cfg, fakeFetch([]));
    expect(await p.getStatus('L-1')).toEqual({ status: 'sent', costCents: 107 });
    expect(mapPingenStatus('undeliverable')).toBe('failed');
    expect(mapPingenStatus('action_required')).toBe('failed');
    expect(mapPingenStatus('validating')).toBe('validating');
    expect(mapPingenStatus('submitted')).toBe('queued');
  });

  it('Webhook: HMAC-SHA256-Signatur prüfen und Ereignis lesen', () => {
    const p = new PingenMailProvider(cfg, fakeFetch([]));
    const raw = JSON.stringify({
      data: {
        id: 'wh-1',
        type: 'webhook_sent',
        attributes: { url: 'https://x', created_at: '2026-10-23T09:00:00+0200' },
        relationships: { organisation: { data: { id: 'org-1', type: 'organisations' } }, deliverable: { data: { id: 'L-1', type: 'letters' } }, event: { data: { id: 'ev-1', type: 'letters_events' } } },
      },
      included: [{ id: 'ev-1', type: 'letters_events', attributes: { code: 'sent', name: 'Letter sent', emitted_at: '2026-10-23T08:59:00+0200' } }],
    });
    const h = new Headers({ signature: hmacSha256(cfg.webhookSecret, raw) });
    expect(p.verifyWebhook(raw, h)).toBe(true);
    expect(p.verifyWebhook(raw + ' ', h)).toBe(false);
    expect(p.verifyWebhook(raw, new Headers({ signature: 'abc' }))).toBe(false);
    const [ev] = p.parseWebhook(raw);
    expect(ev).toMatchObject({ eventId: 'wh-1', providerLetterId: 'L-1', status: 'sent' });
    expect(ev!.occurredAt.toISOString()).toBe('2026-10-23T06:59:00.000Z');
  });
});
