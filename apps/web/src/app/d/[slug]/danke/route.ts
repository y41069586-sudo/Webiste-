import { demoUrl } from '@wbm/core';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const back = `<p><a href="${demoUrl(`/d/${encodeURIComponent(slug)}`)}">Zurück zum Entwurf</a></p>`;
  if (new URL(req.url).searchParams.get('wunsch') === '1')
    return simplePage(
      'Danke für Ihren Wunsch',
      `<p>Ich passe Ihren Entwurf kostenlos an und schreibe Ihnen per E-Mail, sobald der neue Stand online ist – unter demselben Link.</p>${back}`,
    );
  return simplePage(
    'Danke für Ihre Nachricht',
    `<p>Wir haben Ihre Frage erhalten und melden uns per E-Mail bei Ihnen.</p>${back}`,
  );
}
