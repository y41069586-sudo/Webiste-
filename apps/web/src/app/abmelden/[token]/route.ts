import { eq } from 'drizzle-orm';
import { audit, getDb, schema, suppressEmail, unsubscribeSignature } from '@wbm/core';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

async function resolve(token: string) {
  const m = /^([0-9a-f-]{36})\.([0-9a-f]{32})$/.exec(token);
  if (!m || unsubscribeSignature(m[1]!) !== m[2]) return null;
  const msg = await getDb().query.supportMessages.findFirst({ where: eq(schema.supportMessages.id, m[1]!) });
  return msg?.fromEmail ? msg : null;
}

/** Abmeldelink der Erinnerungs-Mail: Bestätigungsseite (Link-Scanner lösen nichts aus). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await resolve(token))) return simplePage('Link ungültig', '<p>Dieser Abmeldelink ist ungültig.</p>', 404);
  return simplePage(
    'Keine E-Mails mehr erhalten',
    `<p>Mit einem Klick tragen wir Ihre Adresse aus – Sie erhalten dann keine Erinnerungen mehr von uns.</p>
<form method="post"><button type="submit">Abmelden</button></form>`,
  );
}

/** Abmeldung (auch One-Click nach RFC 8058 über List-Unsubscribe-Post). */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const msg = await resolve(token);
  if (!msg) return simplePage('Link ungültig', '<p>Dieser Abmeldelink ist ungültig.</p>', 404);
  const db = getDb();
  await suppressEmail(db, msg.fromEmail!, 'Abmeldelink Erinnerungs-Mail');
  await audit(db, { entity: 'lead', entityId: msg.leadId ?? msg.id, action: 'email_unsubscribed', actor: 'public:unsubscribe' });
  return simplePage('Abgemeldet', '<p>Sie erhalten keine E-Mails mehr von uns. Vielen Dank für Ihre Rückmeldung.</p>');
}
