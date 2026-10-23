import { errInfo, handleSiteForm, logger } from '@wbm/core';
import { simplePage } from '@/lib/public-page';
import { requestMetaFrom } from '@/lib/request';

export const dynamic = 'force-dynamic';

/**
 * Kontaktformular der Kundenseiten (statische Seiten posten hierher). Wir leiten die Nachricht
 * per E-Mail an den Kunden weiter und speichern den Inhalt nicht. Spam: Honeypot, Link-Grenze, Ratenlimit.
 */
export async function POST(req: Request, { params }: { params: Promise<{ formKey: string }> }) {
  const { formKey } = await params;
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return simplePage('Ungültige Anfrage', '<p>Das Formular konnte nicht gelesen werden.</p>', 400);
  }
  try {
    const res = await handleSiteForm(
      formKey,
      {
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        phone: String(form.get('phone') ?? ''),
        message: String(form.get('message') ?? ''),
        consent: form.get('consent') === 'on',
        honeypot: String(form.get('website') ?? ''),
      },
      requestMetaFrom(req.headers),
    );
    if (res.ok) return new Response(null, { status: 303, headers: { location: res.redirect } });
    if (res.reason === 'not_found')
      return simplePage('Formular nicht gefunden', '<p>Dieses Kontaktformular ist nicht (mehr) aktiv.</p>', 404);
    const back = res.back ? `<p><a href="${res.back}#frage">Zurück zur Website</a></p>` : '';
    const msg =
      res.reason === 'rate_limited'
        ? 'Sie haben in kurzer Zeit mehrere Nachrichten gesendet. Bitte versuchen Sie es später erneut.'
        : 'Bitte füllen Sie Name, E-Mail und Nachricht aus und bestätigen Sie den Datenschutzhinweis.';
    return simplePage('Nachricht nicht gesendet', `<p>${msg}</p>${back}`, 400);
  } catch (err) {
    logger.error({ ...errInfo(err) }, 'Kontaktformular fehlgeschlagen');
    return simplePage(
      'Nachricht nicht gesendet',
      '<p>Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder rufen Sie uns an.</p>',
      502,
    );
  }
}
