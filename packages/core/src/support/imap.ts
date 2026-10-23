import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getEnv } from '../config/env';
import { errInfo, logger } from '../logger';
import { ingestInboundEmail } from '../services/support';

/**
 * Postfach per IMAP abrufen (anbieterunabhängig): ungelesene Nachrichten der INBOX einlesen,
 * als Support-Nachricht speichern (Duplikate über Message-ID) und als gelesen markieren.
 */
export async function pollImapInbox(limit = 50): Promise<{ fetched: number; created: number }> {
  const env = getEnv();
  if (!env.IMAP_HOST || !env.IMAP_USER || !env.IMAP_PASSWORD) return { fetched: 0, created: 0 };
  const client = new ImapFlow({
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    secure: env.IMAP_PORT === 993,
    auth: { user: env.IMAP_USER, pass: env.IMAP_PASSWORD },
    logger: false,
  });
  let fetched = 0;
  let created = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = ((await client.search({ seen: false }, { uid: true })) || []).slice(0, limit);
      for (const uid of uids) {
        const msg = await client.fetchOne(String(uid), { source: true, uid: true }, { uid: true });
        if (!msg || !msg.source) continue;
        fetched++;
        try {
          const parsed = await simpleParser(msg.source);
          const headers: Record<string, string> = {};
          for (const [k, v] of parsed.headers) headers[k] = typeof v === 'string' ? v : JSON.stringify(v);
          const from = parsed.from?.value[0]?.address ?? '';
          const to = Array.isArray(parsed.to) ? (parsed.to[0]?.value[0]?.address ?? '') : (parsed.to?.value[0]?.address ?? '');
          const res = await ingestInboundEmail({
            providerMessageId: parsed.messageId ?? `imap-${uid}-${parsed.date?.getTime() ?? Date.now()}`,
            from,
            to,
            subject: parsed.subject ?? '',
            text: parsed.text ?? '',
            receivedAt: parsed.date ?? new Date(),
            ...(parsed.inReplyTo ? { inReplyTo: parsed.inReplyTo } : {}),
            headers,
          });
          if (!res.duplicate) created++;
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
        } catch (err) {
          logger.warn({ uid, ...errInfo(err) }, 'IMAP: Nachricht konnte nicht verarbeitet werden');
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => undefined);
  }
  return { fetched, created };
}
