import { demoUrl, handleDemoQuestion } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

/** „Frage zu diesem Entwurf“ – geht an uns, nicht an den Betrieb. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await req.formData();
  const res = await handleDemoQuestion(
    slug,
    {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      message: String(form.get('message') ?? ''),
      consent: form.get('consent') === 'on',
      honeypot: String(form.get('website') ?? ''),
      ts: Number(form.get('ts') ?? 0),
    },
    requestMetaFrom(req.headers),
  );
  if (res.ok || res.reason === 'spam') {
    // Spam bekommt dieselbe Antwort (kein Hinweis für Bots)
    return new Response(null, { status: 303, headers: { location: demoUrl(`/d/${slug}/danke`) } });
  }
  const msg =
    res.reason === 'rate_limited'
      ? 'Sie haben in kurzer Zeit mehrere Nachrichten gesendet. Bitte versuchen Sie es später erneut.'
      : 'Bitte füllen Sie Name, E-Mail und Nachricht aus und bestätigen Sie den Datenschutzhinweis.';
  return simplePage(
    'Nachricht nicht gesendet',
    `<p>${msg}</p><p><a href="${demoUrl(`/d/${slug}#frage`)}">Zurück zum Entwurf</a></p>`,
    400,
  );
}
