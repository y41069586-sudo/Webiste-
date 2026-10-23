import { HttpError, withRetry } from '../../util/retry';
import type { EmailProvider, OutgoingEmail } from '../types';

/**
 * Resend (POST https://api.resend.com/emails, Bearer-Token, Header Idempotency-Key ≤ 256 Zeichen,
 * 24 h gültig; Anhänge Base64 mit filename; max. 40 MB). Geprüft 23.10.2026, siehe docs/integrations.md.
 */
export class ResendEmail implements EmailProvider {
  readonly name = 'resend';
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async send(mail: OutgoingEmail): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = {
      from: this.from,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      ...(mail.html ? { html: mail.html } : {}),
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
      ...(mail.headers ? { headers: mail.headers } : {}),
      ...(mail.tag ? { tags: [{ name: 'kategorie', value: mail.tag.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 256) }] } : {}),
      ...(mail.attachments?.length
        ? { attachments: mail.attachments.map((a) => ({ filename: a.filename, content: a.content.toString('base64') })) }
        : {}),
    };
    return withRetry(
      async () => {
        const res = await this.fetchImpl('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${this.apiKey}`,
            'content-type': 'application/json',
            ...(mail.idempotencyKey ? { 'idempotency-key': mail.idempotencyKey.slice(0, 256) } : {}),
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        });
        const text = await res.text();
        if (!res.ok) throw new HttpError(`Resend HTTP ${res.status}`, res.status, text.slice(0, 500));
        const json = JSON.parse(text) as { id: string };
        return { messageId: json.id };
      },
      { retries: 3, baseDelayMs: 1_000, maxDelayMs: 15_000 },
    );
  }
}
