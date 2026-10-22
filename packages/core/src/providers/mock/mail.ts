import { hmacSha256, sha256 } from '../../util/crypto';
import type { LetterSendOptions, LetterSendResult, LetterWebhookEvent, MailProvider, ProviderLetterStatus } from '../types';

/** Simulierter Briefversand – verschickt nichts. */
export class MockMailProvider implements MailProvider {
  readonly name = 'mock';
  constructor(private readonly secret: string) {}

  async estimateCost(pdf: Buffer, opts: { color: boolean }): Promise<number | null> {
    // grob an realistische Preise angelehnt (Farbe teurer), unabhängig von der Seitenzahl
    void pdf;
    return opts.color ? 135 : 115;
  }

  async send(pdf: Buffer, opts: LetterSendOptions): Promise<LetterSendResult> {
    void pdf;
    const id = `mock_${Date.now()}_${sha256(opts.idempotencyKey).slice(0, 12)}`;
    return { providerLetterId: id, status: 'queued', costCents: opts.color ? 135 : 115 };
  }

  async getStatus(providerLetterId: string): Promise<{ status: ProviderLetterStatus }> {
    const ts = Number(providerLetterId.split('_')[1] ?? 0);
    const age = Date.now() - ts;
    if (age > 2 * 60_000) return { status: 'delivered' };
    if (age > 10_000) return { status: 'sent' };
    return { status: 'queued' };
  }

  verifyWebhook(rawBody: string, headers: Headers): boolean {
    const sig = headers.get('x-mock-signature');
    return Boolean(sig) && sig === hmacSha256(this.secret, rawBody);
  }

  parseWebhook(rawBody: string): LetterWebhookEvent[] {
    const body = JSON.parse(rawBody) as { id: string; letterId: string; status: ProviderLetterStatus; at?: string; reason?: string };
    return [
      {
        eventId: body.id,
        providerLetterId: body.letterId,
        status: body.status,
        occurredAt: body.at ? new Date(body.at) : new Date(),
        reason: body.reason,
      },
    ];
  }
}
