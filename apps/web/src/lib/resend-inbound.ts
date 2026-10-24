import { Resend, type WebhookEventPayload } from 'resend';

/** Verify the raw signed payload before trusting any address, ID or content. */
export function verifyResendEvent(raw: string, headers: Headers, secret: string): WebhookEventPayload {
  return new Resend().webhooks.verify({
    payload: raw,
    webhookSecret: secret,
    headers: {
      id: headers.get('svix-id') ?? '',
      timestamp: headers.get('svix-timestamp') ?? '',
      signature: headers.get('svix-signature') ?? '',
    },
  });
}

/** Only API-fetched plain text enters support. No attachments, remote HTML, AI or auto-reply. */
export async function readResendInbound(event: WebhookEventPayload, apiKey: string, inboxId: string, recipient: string) {
  const resend = new Resend(apiKey);
  const expected = recipient.toLowerCase();
  if (event.type !== 'email.received' && event.type !== 'inbox.email.received') return null;
  if (event.type === 'inbox.email.received' && event.data.inbox_id !== inboxId) return null;
  const result =
    event.type === 'inbox.email.received'
      ? await resend.inboxes.threads.emails.get({
          inboxId: event.data.inbox_id,
          threadId: event.data.thread_id,
          emailId: event.data.email_id,
        })
      : await resend.emails.receiving.get(event.data.email_id);
  if (result.error || !result.data) throw new Error('resend_message_unavailable');
  const mail = result.data;
  if (!mail.to.some((address) => address.toLowerCase() === expected || address.toLowerCase().endsWith(`<${expected}>`)))
    return null;
  if ('direction' in mail && mail.direction !== 'inbound') return null;
  return {
    from: mail.from,
    to: recipient,
    subject: mail.subject ?? '',
    text: mail.text?.slice(0, 20_000) || '[Nachricht ohne Textteil. Bitte im Resend-Postfach lesen.]',
    // Message-ID deduplicates standard receiving and inbox events for the same email.
    providerMessageId: mail.message_id || `resend:${event.data.email_id}`,
    receivedAt: new Date('received_at' in mail ? mail.received_at : mail.created_at),
  };
}
