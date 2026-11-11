import { confirmOptin, optinRequestByToken } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

/** Bestätigungslink aus der Link-Mail: erst eine Seite mit Knopf, damit Link-Scanner nichts bestätigen. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await optinRequestByToken(token)))
    return simplePage('Link ungültig', '<p>Dieser Bestätigungslink ist ungültig.</p>', 404);
  return simplePage(
    'Erinnerungen bestätigen',
    `<p>Mit einem Klick bestätigen Sie, dass wir Sie bis zum Ablauf Ihres Website-Entwurfs höchstens zweimal kurz per E-Mail erinnern dürfen. Abmelden können Sie sich jederzeit über den Link in jeder E-Mail.</p>
<form method="post"><button type="submit">Ja, bestätigen</button></form>`,
  );
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await confirmOptin(token, requestMetaFrom(req.headers))))
    return simplePage('Link ungültig', '<p>Dieser Bestätigungslink ist ungültig.</p>', 404);
  return simplePage('Bestätigt', '<p>Vielen Dank. Wir erinnern Sie höchstens zweimal kurz an Ihren Entwurf.</p>');
}
