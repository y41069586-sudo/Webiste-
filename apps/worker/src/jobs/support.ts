import { processSupportMessage, sendAlertDigest, sendSupportReply } from '@wbm/core';
import { pollImapInbox } from '@wbm/core/render';
import { defineJob } from '../runtime';

/** Eingang: klassifizieren, Widerspruch umsetzen, Antwortentwurf erstellen. */
defineJob('support-inbound', async (data) => processSupportMessage(data.messageId), { concurrency: 2 });

/** Freigegebene Antwort senden. */
defineJob('support-send', async (data) => sendSupportReply(data.messageId));

/** Postfach per IMAP abrufen (falls konfiguriert). */
defineJob('imap-poll', async () => pollImapInbox());

/** Sammel-Mail mit neuen Warnungen an den Betreiber. */
defineJob('alert-mails', async () => ({ sent: await sendAlertDigest() }));
