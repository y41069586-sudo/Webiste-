import type { LetterSendOptions, LetterSendResult, LetterWebhookEvent, MailProvider, ProviderLetterStatus } from '../types';

/**
 * easyNova digiBrief REST-API V1 (SIECOM IT-Systemhaus GmbH, Dresden; geprüft 27.10.2026,
 * OpenAPI https://digibrief-api.easynova.de/swagger/v1/swagger.json, docs/integrations.md).
 * - Anmeldung `POST /api/Login` (ekp = Benutzername/E-Mail, password) → Bearer-Token, 8 Stunden gültig,
 *   wiederverwenden; bei 401 einmal neu anmelden und wiederholen. Nur Login ist gedrosselt (429 + Retry-After).
 * - Einlieferung `POST /api/letter` (Array, PDF Base64): Zustelladresse wird NUR aus dem Adressfenster des PDFs
 *   gelesen; die Absenderzeile über dem Fenster ist Pflicht, sonst Status 99. JSON-Adressfelder sind Metadaten.
 * - Kopfzeile `Idempotency-Key`: gleiche Wiederholung liefert die ursprüngliche letterID, nichts doppelt gedruckt.
 *   503 + Retry-After heißt: nichts eingeliefert, gleichen Aufruf wiederholen.
 * - `testFlag: true` je Sendung: alle Prüfungen, kein Druck, keine Zustellung; Status bleibt dauerhaft 1.
 * - Status 1 Annahme, 2 Verarbeitung, 3 Einlieferung ins Druckzentrum, 4 Verarbeitung im Druckzentrum,
 *   99 Verarbeitungsfehler (Grund in errorList). Kein Storno-Endpunkt, keine Webhooks.
 * - Kosten: `priceNet`/`priceWithTax` erst nach Abrechnung durch den Druckdienstleister (vorher leer);
 *   Vorabschätzung `POST /api/pricePreview`, Guthaben `GET /api/companyBilling`.
 */
export const EASYNOVA_BASE_URL = 'https://digibrief-api.easynova.de';

/** Token vor Ablauf (8 h) erneuern */
const TOKEN_TTL_MS = 7.5 * 60 * 60 * 1000;

export interface EasyNovaLetterStatus {
  letterID: number;
  fileName: string;
  statusID: number;
  statusDetails?: string | null;
  processedDate?: string | null;
  testFlag?: boolean | null;
  errorList?: { level?: string; code?: string; description?: string }[] | null;
  priceNet?: number | null;
  priceWithTax?: number | null;
}

export interface EasyNovaResponse {
  status: number;
  json: unknown;
  retryAfterSeconds?: number;
}

/** Transportfunktion (in Tests ersetzbar) */
export type EasyNovaTransport = (
  method: 'GET' | 'POST',
  url: string,
  init: { headers: Record<string, string>; body?: unknown },
) => Promise<EasyNovaResponse>;

export class EasyNovaApiError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'EasyNovaApiError';
  }
}

const fetchTransport: EasyNovaTransport = async (method, url, init) => {
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text.slice(0, 300) };
  }
  const retry = Number(res.headers.get('retry-after'));
  return { status: res.status, json, retryAfterSeconds: Number.isFinite(retry) && retry > 0 ? retry : undefined };
};

/** easyNova-Status → unser Status. Testsendungen bleiben auf 1 (Sollzustand laut Anbieter). */
export function mapEasyNovaStatus(s: Pick<EasyNovaLetterStatus, 'statusID' | 'processedDate'>): ProviderLetterStatus {
  if (s.statusID === 99) return 'failed';
  if (s.statusID === 4 || s.processedDate) return 'sent';
  if (s.statusID === 1 || s.statusID === 2 || s.statusID === 3) return 'queued';
  return 'unknown';
}

/** Tatsächlich abgerechneter Betrag in Cent (brutto – als Kleinunternehmer ohne Vorsteuerabzug); vorher undefined. */
export function easyNovaCostCents(s: Pick<EasyNovaLetterStatus, 'priceWithTax'>): number | undefined {
  return typeof s.priceWithTax === 'number' ? Math.round(s.priceWithTax * 100) : undefined;
}

function messageOf(json: unknown): string {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    return String(o.message ?? o.detail ?? o.title ?? '').slice(0, 300);
  }
  return typeof json === 'string' ? json.slice(0, 300) : '';
}

export interface EasyNovaOptions {
  username: string;
  password: string;
  mode: 'test' | 'live';
  /** Im Testmodus: verarbeitetes PDF mit eingezeichneten Prüf- und Adressflächen an diese Adresse */
  testEmail?: string;
  baseUrl?: string;
  transport?: EasyNovaTransport;
  now?: () => number;
  /** Wartezeit-Obergrenze bei 503/Retry-After (Tests: 0) */
  maxRetryDelayMs?: number;
}

export class EasyNovaMailProvider implements MailProvider {
  readonly name = 'easynova';
  readonly mode: 'test' | 'live';
  private readonly base: string;
  private readonly transport: EasyNovaTransport;
  private readonly now: () => number;
  private readonly maxRetryDelayMs: number;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly o: EasyNovaOptions) {
    this.mode = o.mode;
    this.base = (o.baseUrl ?? EASYNOVA_BASE_URL).replace(/\/$/, '');
    this.transport = o.transport ?? fetchTransport;
    this.now = o.now ?? Date.now;
    this.maxRetryDelayMs = o.maxRetryDelayMs ?? 30_000;
  }

  private async login(): Promise<string> {
    const res = await this.transport('POST', `${this.base}/api/Login`, {
      headers: {},
      body: { ekp: this.o.username, password: this.o.password },
    });
    const token = (res.json as { token?: string } | null)?.token;
    if (res.status === 200 && token) {
      this.token = { value: token, expiresAt: this.now() + TOKEN_TTL_MS };
      return token;
    }
    // 400 = Zugangsdaten abgelehnt, 429 = zu viele Anmeldungen: nicht wiederholen
    throw new EasyNovaApiError(`easyNova-Anmeldung: ${res.status} ${messageOf(res.json)}`.trim(), res.status);
  }

  private async bearer(): Promise<string> {
    if (this.token && this.token.expiresAt > this.now()) return this.token.value;
    return this.login();
  }

  /**
   * Aufruf mit Token; bei 401 einmal neu anmelden. 503 nur wiederholen, wenn der Aufruf ohne Doppelversand
   * wiederholbar ist (GET oder POST mit Idempotency-Key).
   */
  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const repeatable = method === 'GET' || Boolean(idempotencyKey);
    let relogged = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const headers: Record<string, string> = { authorization: `Bearer ${await this.bearer()}` };
      if (idempotencyKey) headers['idempotency-key'] = idempotencyKey.slice(0, 180);
      const res = await this.transport(method, `${this.base}${path}`, { headers, body });
      if (res.status >= 200 && res.status < 300) return res.json as T;
      if (res.status === 401 && !relogged) {
        relogged = true;
        this.token = null;
        attempt--;
        continue;
      }
      const err = new EasyNovaApiError(`easyNova ${method} ${path}: ${res.status} ${messageOf(res.json)}`.trim(), res.status);
      if (res.status !== 503 || !repeatable || attempt === 2) throw err;
      const waitMs = Math.min((res.retryAfterSeconds ?? 5) * 1000, this.maxRetryDelayMs);
      if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
    }
    throw new EasyNovaApiError(`easyNova ${method} ${path}: nicht erreichbar`, 503);
  }

  /** Voraussichtlicher Bruttopreis in Cent (Momentaufnahme, nicht verbindlich). */
  async estimateCost(
    pdf: Buffer,
    opts: Omit<LetterSendOptions, 'idempotencyKey' | 'reference' | 'recipient' | 'sender'>,
  ): Promise<number | null> {
    const res = await this.call<{ priceWithTax?: number | null }>('POST', '/api/pricePreview', {
      data: pdf.toString('base64'),
      isColor: opts.color,
      isDuplex: false,
      countryIso: opts.recipientCountry || 'DE',
    });
    return typeof res?.priceWithTax === 'number' ? Math.round(res.priceWithTax * 100) : null;
  }

  async send(pdf: Buffer, opts: LetterSendOptions): Promise<LetterSendResult> {
    const test = this.mode === 'test';
    const r = opts.recipient;
    const letter: Record<string, unknown> = {
      fileName: `${opts.reference}.pdf`,
      data: pdf.toString('base64'),
      isColor: opts.color,
      isDuplex: false,
      testFlag: test,
      // Keine Adresskorrektur: eine falsch sitzende Anschrift soll abgelehnt (Status 99), nicht umgesetzt werden
      custom1: opts.reference.slice(0, 200),
      ...(r
        ? {
            addressLine1: r.name,
            addressLine2: `${r.street} ${r.number}`.trim(),
            zipCode: r.zip,
            city: r.city,
            country: r.country,
          }
        : {}),
      ...(test && this.o.testEmail ? { testEMail: this.o.testEmail, testShowRestrictedArea: true } : {}),
    };
    const res = await this.call<{ letterID?: number; fileName: string }[]>('POST', '/api/letter', [letter], opts.idempotencyKey);
    const id = Array.isArray(res) ? res[0]?.letterID : undefined;
    if (!id) throw new EasyNovaApiError('easyNova: Antwort ohne letterID', 200);
    return { providerLetterId: String(id), status: 'queued' };
  }

  async getStatus(providerLetterId: string): Promise<{ status: ProviderLetterStatus; costCents?: number }> {
    const s = await this.call<EasyNovaLetterStatus | null>('GET', `/api/letter/${encodeURIComponent(providerLetterId)}`);
    if (!s) return { status: 'unknown' };
    return { status: mapEasyNovaStatus(s), costCents: easyNovaCostCents(s) };
  }

  /** Guthaben (Vorkasse) in Cent; Momentaufnahme laut Anbieter. */
  async getBalance(): Promise<{ balanceCents: number; currency: string }> {
    const res = await this.call<{ paymentBalance?: number | null }>('GET', '/api/companyBilling');
    if (typeof res?.paymentBalance !== 'number') throw new EasyNovaApiError('easyNova: Guthaben nicht lesbar', 200);
    return { balanceCents: Math.round(res.paymentBalance * 100), currency: 'EUR' };
  }

  /** Keine Webhooks – Status kommt über den Abgleich (der Anbieter empfiehlt mehrmals täglich). */
  verifyWebhook(): boolean {
    return false;
  }

  parseWebhook(): LetterWebhookEvent[] {
    return [];
  }
}
