import { demoUrl, esc, requestDemoLinkByEmail } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

/** „Link per E-Mail zuschicken“ (Formular auf der Demo und im Willkommenshinweis). */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await req.formData();
  const res = await requestDemoLinkByEmail(
    slug,
    {
      email: String(form.get('email') ?? ''),
      consent: form.get('consent') === 'on',
      honeypot: String(form.get('website') ?? ''),
      ts: Number(form.get('ts') ?? 0),
    },
    requestMetaFrom(req.headers),
  );
  const back = `<p><a href="${esc(demoUrl(`/d/${slug}`))}">Zurück zum Entwurf</a></p>`;
  // Spam bekommt dieselbe Antwort (kein Hinweis für Bots)
  if (res.ok || res.reason === 'spam')
    return simplePage(
      'Der Link ist unterwegs',
      `<p>Wir haben Ihnen den Link zu Ihrem Entwurf per E-Mail geschickt.</p><p><strong>Bitte schauen Sie auch in Ihrem Spam-Ordner nach</strong>, falls die E-Mail nicht im Posteingang ankommt.</p><p>In der E-Mail können Sie bestätigen, ob wir Sie bis zum Ablauf kurz erinnern dürfen. Ohne Bestätigung schreiben wir Ihnen nicht erneut.</p>${back}`,
    );
  const msg =
    res.reason === 'rate_limited'
      ? 'Sie haben in kurzer Zeit mehrere Anfragen gesendet. Bitte versuchen Sie es später erneut.'
      : 'Bitte geben Sie eine gültige E-Mail-Adresse ein und setzen Sie das Häkchen.';
  return simplePage(
    'Nicht gesendet',
    `<p>${msg}</p><p><a href="${esc(demoUrl(`/d/${slug}#link-per-email`))}">Zurück zum Formular</a></p>`,
    400,
  );
}
