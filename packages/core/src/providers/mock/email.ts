import { hmacSha256, randomToken } from '../../util/crypto';
import type { EmailProvider, InboundEmail, OutgoingEmail, StorageProvider } from '../types';

/** Legt ausgehende Mails im Storage ab (Dashboard → „Postausgang (Test)“). */
export class MockEmail implements EmailProvider {
  readonly name = 'mock';
  constructor(
    private readonly storage: StorageProvider,
    private readonly secret: string,
  ) {}

  async send(mail: OutgoingEmail): Promise<{ messageId: string }> {
    const messageId = `mock-${Date.now()}-${randomToken(8)}`;
    await this.storage.put(
      `outbox/${messageId}.json`,
      JSON.stringify(
        {
          messageId,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
          html: mail.html,
          replyTo: mail.replyTo,
          tag: mail.tag,
          headers: mail.headers ?? {},
          attachments: (mail.attachments ?? []).map((a) => ({
            filename: a.filename,
            contentType: a.contentType,
            size: a.content.length,
          })),
          sentAt: new Date().toISOString(),
        },
        null,
        2,
      ),
      'application/json',
    );
    return { messageId };
  }

  verifyInbound(rawBody: string, headers: Headers): boolean {
    const sig = headers.get('x-mock-signature');
    return Boolean(sig) && sig === hmacSha256(this.secret, rawBody);
  }

  async parseInbound(rawBody: string): Promise<InboundEmail | null> {
    const b = JSON.parse(rawBody) as Partial<InboundEmail> & { receivedAt?: string };
    if (!b.from || !b.text || !b.providerMessageId) return null;
    return {
      providerMessageId: b.providerMessageId,
      from: b.from,
      to: b.to ?? '',
      subject: b.subject ?? '',
      text: b.text,
      receivedAt: b.receivedAt ? new Date(b.receivedAt) : new Date(),
      inReplyTo: b.inReplyTo,
    };
  }
}
