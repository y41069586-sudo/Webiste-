import { createHash } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import type { LetterSendOptions, LetterSendResult, LetterWebhookEvent, MailProvider, ProviderLetterStatus } from '../types';

/**
 * LetterXpress API v3 (geprüft 24.10.2026, Dokumentation „Stand Juli 2026“, docs/integrations.md).
 * - JSON, `auth: { username, apikey, mode }` in jedem Request – auch bei GET (Body bei GET, daher node:https)
 * - mode „test“: Aufträge landen nur in der Postbox (Status draft), werden nicht gedruckt, nach 7 Tagen gelöscht
 * - Limit 120 Requests/Minute, 50 MB pro Request; Aufträge nur 15 Minuten änderbar/löschbar
 * - keine Webhooks, keine Zustellbestätigung (Tracking nur bei Einschreiben), keine Postkarten
 * - nicht genutzt: Überweisungsträger, AGB-Seiten, Einschreiben, Serienbrief, SMART@MAIL
 */
export const LXP_BASE_URL = 'https://api.letterxpress.de/v3';

export interface LxpResponse<T> {
  status: number;
  message: string;
  data?: T;
}

export interface LxpItem {
  address?: string;
  pages?: number;
  amount?: number;
  vat?: number;
  status?: string;
  tracking_code?: string | null;
  tracking_status?: string | null;
}

export interface LxpPrintjob {
  id: number;
  status: string;
  notice: string | null;
  dispatch_date: string | null;
  created_at: string;
  updated_at: string;
  items?: LxpItem[];
}

/** Transportfunktion (in Tests ersetzbar) */
export type LxpTransport = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  body: Record<string, unknown>,
) => Promise<{ status: number; json: unknown }>;

export class LxpApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'LxpApiError';
  }
}

/** Sliding-Window-Limiter: höchstens `max` Aufrufe je `windowMs` (Puffer zum Anbieterlimit von 120/Minute). */
export class RateLimiter {
  private stamps: number[] = [];
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
    private readonly sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  ) {}

  async acquire(): Promise<void> {
    for (;;) {
      const t = this.now();
      this.stamps = this.stamps.filter((s) => t - s < this.windowMs);
      if (this.stamps.length < this.max) {
        this.stamps.push(t);
        return;
      }
      await this.sleep(this.windowMs - (t - this.stamps[0]!) + 5);
    }
  }
}

const httpsTransport: LxpTransport = (method, url, body) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = httpsRequest(
      url,
      {
        method,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
        timeout: 60_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json: unknown = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {
            json = { message: text.slice(0, 300) };
          }
          resolve({ status: res.statusCode ?? 0, json });
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('LetterXpress: Zeitüberschreitung')));
    req.on('error', reject);
    req.end(payload);
  });

/** Status eines Druckauftrags → unser Status. draft = Postbox (Testmodus), hold = angehalten. */
export function mapLxpStatus(job: Pick<LxpPrintjob, 'status' | 'items'>): ProviderLetterStatus {
  const item = job.items?.[0]?.status;
  if (job.status === 'canceled') return 'cancelled';
  if (job.status === 'done' || item === 'sent') return 'sent';
  if (job.status === 'queue' || job.status === 'hold' || job.status === 'draft') return 'queued';
  return 'unknown';
}

/** Kosten eines Auftrags in Cent: Positionen netto + USt. (als Kleinunternehmer ohne Vorsteuerabzug zählt brutto). */
export function lxpCostCents(job: Pick<LxpPrintjob, 'items'>): number | undefined {
  const items = job.items ?? [];
  if (!items.length || items.some((i) => typeof i.amount !== 'number')) return undefined;
  return Math.round(items.reduce((s, i) => s + (i.amount ?? 0) + (i.vat ?? 0), 0) * 100);
}

export interface LetterXpressOptions {
  username: string;
  apikey: string;
  mode: 'test' | 'live';
  baseUrl?: string;
  transport?: LxpTransport;
  limiter?: RateLimiter;
  /** Wartezeit zwischen Wiederholungen (Tests: 0) */
  retryDelayMs?: number;
}

export class LetterXpressMailProvider implements MailProvider {
  readonly name = 'letterxpress';
  readonly mode: 'test' | 'live';
  private readonly base: string;
  private readonly transport: LxpTransport;
  private readonly limiter: RateLimiter;
  private readonly retryDelayMs: number;

  constructor(private readonly o: LetterXpressOptions) {
    this.mode = o.mode;
    this.base = (o.baseUrl ?? LXP_BASE_URL).replace(/\/$/, '');
    this.transport = o.transport ?? httpsTransport;
    this.limiter = o.limiter ?? new RateLimiter(100, 60_000);
    this.retryDelayMs = o.retryDelayMs ?? 2000;
  }

  private async call<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    extra: Record<string, unknown> = {},
  ): Promise<LxpResponse<T>> {
    const body = { auth: { username: this.o.username, apikey: this.o.apikey, mode: this.o.mode }, ...extra };
    // POST nicht automatisch wiederholen (Doppelversand); Wiederholung über die Idempotenzprüfung in send()
    const attempts = method === 'POST' ? 1 : 3;
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      await this.limiter.acquire();
      try {
        const res = await this.transport(method, `${this.base}${path}`, body);
        const json = (res.json ?? {}) as LxpResponse<T>;
        if (res.status >= 200 && res.status < 300) return json;
        const err = new LxpApiError(`LetterXpress ${method} ${path}: ${res.status} ${json.message ?? ''}`.trim(), res.status);
        if (res.status === 429 || res.status >= 500) {
          lastErr = err;
        } else {
          throw err;
        }
      } catch (err) {
        if (err instanceof LxpApiError && err.httpStatus < 500 && err.httpStatus !== 429) throw err;
        lastErr = err;
      }
      if (i < attempts - 1 && this.retryDelayMs > 0) await new Promise((r) => setTimeout(r, this.retryDelayMs * 2 ** i));
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private spec(opts: { color: boolean; pages?: number }, withPages: boolean): Record<string, unknown> {
    return {
      ...(withPages ? { pages: opts.pages ?? 1 } : {}),
      color: opts.color ? '4' : '1',
      mode: 'simplex',
      shipping: 'national',
    };
  }

  /** Preisabfrage (Euro laut Anbieter; ob brutto oder netto ist nicht dokumentiert → docs/integrations.md). */
  async estimateCost(
    _pdf: Buffer,
    opts: Omit<LetterSendOptions, 'idempotencyKey' | 'reference' | 'recipient' | 'sender'>,
  ): Promise<number | null> {
    const res = await this.call<{ price: number }>('GET', '/price', { letter: { specification: this.spec(opts, true) } });
    return typeof res.data?.price === 'number' ? Math.round(res.data.price * 100) : null;
  }

  /** Neueste Aufträge eines Status (erste Seite, neu → alt). */
  async listPrintjobs(filter: 'queue' | 'hold' | 'done' | 'canceled' | 'draft'): Promise<LxpPrintjob[]> {
    const res = await this.call<{ printjobs: LxpPrintjob[] }>('GET', `/printjobs?filter=${filter}`);
    return res.data?.printjobs ?? [];
  }

  /** Bereits übertragener Auftrag mit unserer Referenz im Feld `notice`? (Absturz zwischen Übertragung und Speichern) */
  async findByReference(reference: string): Promise<LxpPrintjob | null> {
    const filters = this.mode === 'test' ? (['draft'] as const) : (['queue', 'hold', 'done'] as const);
    for (const f of filters) {
      const hit = (await this.listPrintjobs(f)).find((j) => j.notice === reference);
      if (hit) return hit;
    }
    return null;
  }

  async send(pdf: Buffer, opts: LetterSendOptions): Promise<LetterSendResult> {
    const existing = await this.findByReference(opts.reference);
    if (existing) {
      return { providerLetterId: String(existing.id), status: mapLxpStatus(existing), costCents: lxpCostCents(existing) };
    }
    const b64 = pdf.toString('base64');
    const res = await this.call<LxpPrintjob>('POST', '/printjobs', {
      letter: {
        base64_file: b64,
        base64_file_checksum: createHash('md5').update(b64).digest('hex'),
        specification: this.spec(opts, false),
        filename_original: `${opts.reference}.pdf`,
        notice: opts.reference.slice(0, 255),
      },
    });
    const job = res.data;
    if (!job?.id) throw new LxpApiError('LetterXpress: Antwort ohne Auftrags-ID', 200);
    return { providerLetterId: String(job.id), status: mapLxpStatus(job), costCents: lxpCostCents(job) };
  }

  async getStatus(providerLetterId: string): Promise<{ status: ProviderLetterStatus; costCents?: number }> {
    const res = await this.call<LxpPrintjob>('GET', `/printjobs/${encodeURIComponent(providerLetterId)}`);
    if (!res.data) return { status: 'unknown' };
    return { status: mapLxpStatus(res.data), costCents: lxpCostCents(res.data) };
  }

  /** Nur innerhalb von 15 Minuten nach der Übertragung möglich (danach Fehler des Anbieters). */
  async cancel(providerLetterId: string): Promise<void> {
    await this.call('DELETE', `/printjobs/${encodeURIComponent(providerLetterId)}`);
  }

  async getBalance(): Promise<{ balanceCents: number; currency: string }> {
    const res = await this.call<{ balance: number; currency: string }>('GET', '/balance');
    if (typeof res.data?.balance !== 'number') throw new LxpApiError('LetterXpress: Guthaben nicht lesbar', 200);
    return { balanceCents: Math.round(res.data.balance * 100), currency: res.data.currency ?? 'EUR' };
  }

  /** LetterXpress bietet keine Webhooks – Status kommt über den Abgleich (alle 30 Minuten). */
  verifyWebhook(): boolean {
    return false;
  }

  parseWebhook(): LetterWebhookEvent[] {
    return [];
  }
}
