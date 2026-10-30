import { esc, handleSiteForm, logger, siteFormInput } from '@wbm/core';
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
    const res = await handleSiteForm(formKey, siteFormInput(form), requestMetaFrom(req.headers));
    if (res.ok) return new Response(null, { status: 303, headers: { location: res.redirect } });
    if (res.reason === 'not_found')
      return simplePage('Formular nicht gefunden', '<p>Dieses Kontaktformular ist nicht (mehr) aktiv.</p>', 404);
    const back = res.back ? `<p><a href="${esc(res.back)}#frage">Zurück zur Website</a></p>` : '';
    if (res.reason === 'unavailable')
      return simplePage(
        'Anfrage nicht gesendet',
        `<p>Die Weiterleitung ist gerade nicht verfügbar. Ihre Anfrage wurde nicht versendet. Bitte kontaktieren Sie den Betrieb direkt.</p>${back}`,
        503,
      );
    const msg =
      res.reason === 'rate_limited'
        ? 'Sie haben in kurzer Zeit mehrere Nachrichten gesendet. Bitte versuchen Sie es später erneut.'
        : 'Bitte füllen Sie Name, E-Mail und Nachricht aus und bestätigen Sie den Datenschutzhinweis.';
    return simplePage('Nachricht nicht gesendet', `<p>${msg}</p>${back}`, res.reason === 'rate_limited' ? 429 : 400);
  } catch (err) {
    logger.error({ errorClass: err instanceof Error ? err.name : 'Error' }, 'Kontaktformular fehlgeschlagen');
    return simplePage(
      'Nachricht nicht gesendet',
      '<p>Leider ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut oder rufen Sie uns an.</p>',
      502,
    );
  }
}
