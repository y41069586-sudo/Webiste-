import { HttpError, withRetry } from '../../util/retry';
import type { EmailProvider, OutgoingEmail } from '../types';

/**
 * Postmark (POST https://api.postmarkapp.com/email, Header X-Postmark-Server-Token,
 * Anhänge [{Name, Content (Base64), ContentType}], Headers [{Name, Value}], Stream „outbound“).
 * Postmark kennt keinen Idempotenz-Header – Doppelversand verhindert die Tabelle outbound_emails.
 * Geprüft 23.10.2026, siehe docs/integrations.md.
 */
export class PostmarkEmail implements EmailProvider {
  readonly name = 'postmark';
  constructor(
    private readonly serverToken: string,
    private readonly from: string,
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly messageStream = 'outbound',
  ) {}

  async send(mail: OutgoingEmail): Promise<{ messageId: string }> {
    const body: Record<string, unknown> = {
      From: this.from,
      To: mail.to,
      Subject: mail.subject,
      TextBody: mail.text,
      ...(mail.html ? { HtmlBody: mail.html } : {}),
      ...(mail.replyTo ? { ReplyTo: mail.replyTo } : {}),
      ...(mail.tag ? { Tag: mail.tag.slice(0, 1000) } : {}),
      ...(mail.headers ? { Headers: Object.entries(mail.headers).map(([Name, Value]) => ({ Name, Value })) } : {}),
      ...(mail.attachments?.length
        ? {
            Attachments: mail.attachments.map((a) => ({
              Name: a.filename,
              Content: a.content.toString('base64'),
              ContentType: a.contentType,
            })),
          }
        : {}),
      TrackOpens: false,
      TrackLinks: 'None',
      MessageStream: this.messageStream,
    };
    return withRetry(
      async () => {
        const res = await this.fetchImpl('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'x-postmark-server-token': this.serverToken,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30_000),
        });
        const text = await res.text();
        const json = (text ? JSON.parse(text) : {}) as { MessageID?: string; ErrorCode?: number; Message?: string };
        if (!res.ok || (json.ErrorCode ?? 0) !== 0 || !json.MessageID) {
          // 422 = inhaltlicher Fehler (z. B. inaktiver Empfänger) → nicht wiederholen
          throw new HttpError(
            `Postmark HTTP ${res.status} (Code ${json.ErrorCode ?? '?'}): ${json.Message ?? ''}`.trim(),
            res.status,
            text.slice(0, 500),
          );
        }
        return { messageId: json.MessageID };
      },
      { retries: 3, baseDelayMs: 1_000, maxDelayMs: 15_000 },
    );
  }
}
