import { demoUrl } from '@wbm/core';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return simplePage(
    'Danke für Ihre Nachricht',
    `<p>Wir haben Ihre Frage erhalten und melden uns per E-Mail bei Ihnen.</p><p><a href="${demoUrl(`/d/${encodeURIComponent(slug)}`)}">Zurück zum Entwurf</a></p>`,
  );
}
