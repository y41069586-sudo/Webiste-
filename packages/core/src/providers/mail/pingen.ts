import { safeEqual, hmacSha256 } from '../../util/crypto';
import { HttpError, withRetry } from '../../util/retry';
import type { LetterSendOptions, LetterSendResult, LetterWebhookEvent, MailProvider, ProviderLetterStatus } from '../types';

export interface PingenConfig {
  clientId: string;
  clientSecret: string;
  organisationId: string;
  env: 'staging' | 'production';
  webhookSecret?: string;
}

interface TokenCache {
  token: string;
  expiresAt: number;
}

const JSONAPI = 'application/vnd.api+json';

/** Pingen-Status → interner Status. Unbekannte Zwischenstände gelten als „queued“. */
export function mapPingenStatus(status: string | undefined | null): ProviderLetterStatus {
  switch ((status ?? '').toLowerCase()) {
    case 'sent':
      return 'sent';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
    case 'canceled':
      return 'cancelled';
    case 'undeliverable':
    case 'invalid':
    case 'action_required':
    case 'unprintable':
    case 'expired':
    case 'failed':
      return 'failed';
    case 'validating':
      return 'validating';
    default:
      return 'queued';
  }
}

const WEBHOOK_TYPE: Record<string, ProviderLetterStatus> = {
  webhook_sent: 'sent',
  webhook_dispatched: 'sent',
  webhook_delivered: 'delivered',
  webhook_undeliverable: 'failed',
  webhook_issues: 'failed',
};

/**
 * Pingen API v2 (https://api.pingen.com/documentation). Ablauf: Upload-URL holen,
 * PDF hochladen, Brief anlegen (auto_send). Idempotent über den Header Idempotency-Key.
 */
export class PingenMailProvider implements MailProvider {
  readonly name = 'pingen';
  private token?: TokenCache;
  private readonly api: string;
  private readonly identity: string;

  constructor(
    private readonly cfg: PingenConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    const staging = cfg.env === 'staging';
    this.api = staging ? 'https://api-staging.pingen.com' : 'https://api.pingen.com';
    this.identity = staging ? 'https://identity-staging.pingen.com' : 'https://identity.pingen.com';
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.token;
    const res = await this.fetchImpl(`${this.identity}/auth/access-tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.cfg.clientId,
        client_secret: this.cfg.clientSecret,
      }).toString(),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    if (!res.ok) throw new HttpError(`Pingen-Token HTTP ${res.status}`, res.status, text.slice(0, 300));
    const json = JSON.parse(text) as { access_token: string; expires_in: number };
    this.token = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
    return json.access_token;
  }

  private async call<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    return withRetry(
      async () => {
        const res = await this.fetchImpl(`${this.api}${path}`, {
          method,
          headers: {
            authorization: `Bearer ${await this.accessToken()}`,
            accept: JSONAPI,
            ...(body ? { 'content-type': JSONAPI } : {}),
            ...(idempotencyKey ? { 'idempotency-key': idempotencyKey.slice(0, 64) } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(60_000),
        });
        const text = await res.text();
        if (res.status === 401) this.token = undefined;
        if (!res.ok)
          throw new HttpError(`Pingen ${method} ${path.split('?')[0]} HTTP ${res.status}`, res.status, text.slice(0, 1000));
        return (text ? JSON.parse(text) : {}) as T;
      },
      { retries: 4, baseDelayMs: 1_000, maxDelayMs: 20_000 },
    );
  }

  private org(path: string): string {
    return `/organisations/${encodeURIComponent(this.cfg.organisationId)}${path}`;
  }

  async estimateCost(
    pdf: Buffer,
    opts: Omit<LetterSendOptions, 'idempotencyKey' | 'reference' | 'recipient' | 'sender'>,
  ): Promise<number | null> {
    void pdf;
    const pages = Math.max(1, opts.pages ?? 1);
    const res = await this.call<{ data: { attributes: { price: number; currency: string } } }>(
      'POST',
      this.org('/deliveries/letters/price-calculator'),
      {
        data: {
          type: 'letter_price_calculator',
          attributes: {
            country: opts.recipientCountry,
            paper_types: Array.from({ length: pages }, () => 'normal'),
            print_mode: pages > 1 ? 'duplex' : 'simplex',
            print_spectrum: opts.color ? 'color' : 'grayscale',
            delivery_product: opts.deliveryProduct,
          },
        },
      },
    );
    const a = res.data.attributes;
    if (a.currency && a.currency.toUpperCase() !== 'EUR') return null;
    return Math.round(a.price * 100);
  }

  async send(pdf: Buffer, opts: LetterSendOptions): Promise<LetterSendResult> {
    // 1) Upload-URL
    const upload = await this.call<{ data: { attributes: { url: string; url_signature: string } } }>('GET', '/file-upload');
    // 2) PDF hochladen (vorsignierte URL, ohne Auth-Header)
    await withRetry(async () => {
      const res = await this.fetchImpl(upload.data.attributes.url, {
        method: 'PUT',
        body: new Uint8Array(pdf),
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) throw new HttpError(`Pingen-Upload HTTP ${res.status}`, res.status);
    });
    // 3) Brief anlegen und automatisch absenden
    const pages = Math.max(1, opts.pages ?? 1);
    const attributes: Record<string, unknown> = {
      file_original_name: `${opts.reference}.pdf`,
      file_url: upload.data.attributes.url,
      file_url_signature: upload.data.attributes.url_signature,
      address_position: opts.addressPosition,
      auto_send: true,
      delivery_product: opts.deliveryProduct,
      print_mode: pages > 1 ? 'duplex' : 'simplex',
      print_spectrum: opts.color ? 'color' : 'grayscale',
    };
    if (opts.recipient && opts.sender) {
      const party = (p: NonNullable<LetterSendOptions['recipient']>) => ({
        name: p.name.slice(0, 45),
        street: p.street.slice(0, 40),
        pobox: '',
        number: p.number.slice(0, 10),
        zip: p.zip.slice(0, 8),
        city: p.city.slice(0, 25),
        country: p.country,
      });
      attributes.meta_data = { recipient: party(opts.recipient), sender: party(opts.sender) };
    }
    const created = await this.call<{ data: { id: string; attributes: { status?: string; price_value?: number | null } } }>(
      'POST',
      this.org('/deliveries/letters'),
      { data: { type: 'letters', attributes } },
      opts.idempotencyKey,
    );
    const price = created.data.attributes.price_value;
    return {
      providerLetterId: created.data.id,
      status: mapPingenStatus(created.data.attributes.status),
      ...(typeof price === 'number' ? { costCents: Math.round(price * 100) } : {}),
    };
  }

  async getStatus(providerLetterId: string): Promise<{ status: ProviderLetterStatus; costCents?: number }> {
    const res = await this.call<{ data: { attributes: { status?: string; price_value?: number | null } } }>(
      'GET',
      this.org(`/deliveries/letters/${encodeURIComponent(providerLetterId)}`),
    );
    const price = res.data.attributes.price_value;
    return {
      status: mapPingenStatus(res.data.attributes.status),
      ...(typeof price === 'number' ? { costCents: Math.round(price * 100) } : {}),
    };
  }

  async cancel(providerLetterId: string): Promise<void> {
    await this.call(
      'PATCH',
      this.org(`/deliveries/letters/${encodeURIComponent(providerLetterId)}/cancel`),
      undefined,
      `cancel-${providerLetterId}`,
    );
  }

  /** Webhooks für alle Brief-Ereignisse anlegen (einmalig bei der Einrichtung). */
  async registerWebhooks(url: string, signingKey: string): Promise<string[]> {
    if (signingKey.length < 20 || signingKey.length > 32) throw new Error('PINGEN_WEBHOOK_SECRET muss 20–32 Zeichen lang sein.');
    const ids: string[] = [];
    for (const category of ['sent', 'delivered', 'undeliverable', 'issues']) {
      const res = await this.call<{ data: { id: string } }>(
        'POST',
        this.org('/webhooks'),
        { data: { type: 'webhooks', attributes: { event_category: category, url, signing_key: signingKey } } },
        `webhook-${category}-${url}`.slice(0, 64),
      );
      ids.push(res.data.id);
    }
    return ids;
  }

  /** Header „Signature“ = HMAC-SHA256 (hex) über den unveränderten Body. */
  verifyWebhook(rawBody: string, headers: Headers): boolean {
    const sig = headers.get('signature');
    if (!sig || !this.cfg.webhookSecret) return false;
    return safeEqual(sig.trim().toLowerCase(), hmacSha256(this.cfg.webhookSecret, rawBody));
  }

  parseWebhook(rawBody: string): LetterWebhookEvent[] {
    const body = JSON.parse(rawBody) as {
      data?: {
        id?: string;
        type?: string;
        attributes?: { created_at?: string };
        relationships?: { deliverable?: { data?: { id?: string; type?: string } }; event?: { data?: { id?: string } } };
      };
      included?: {
        id?: string;
        type?: string;
        attributes?: { code?: string; name?: string; emitted_at?: string; status?: string };
      }[];
    };
    const d = body.data;
    const letterId = d?.relationships?.deliverable?.data?.id;
    if (!d?.id || !letterId || (d.relationships?.deliverable?.data?.type && d.relationships.deliverable.data.type !== 'letters'))
      return [];
    const eventId = d.relationships?.event?.data?.id;
    const ev = body.included?.find((i) => i.id === eventId || i.type?.endsWith('events'));
    const status = WEBHOOK_TYPE[d.type ?? ''] ?? mapPingenStatus(ev?.attributes?.code);
    return [
      {
        eventId: d.id,
        providerLetterId: letterId,
        status,
        occurredAt: new Date(ev?.attributes?.emitted_at ?? d.attributes?.created_at ?? Date.now()),
        ...(ev?.attributes?.name ? { reason: `${ev.attributes.code ?? ''} ${ev.attributes.name}`.trim() } : {}),
      },
    ];
  }
}
