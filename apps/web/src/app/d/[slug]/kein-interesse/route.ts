import { demoUrl, esc, handleOptOut } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

/** Banner-Button „Kein Interesse“ (POST): sofortiger Widerspruch, Daten löschen. */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await handleOptOut(slug, requestMetaFrom(req.headers));
  return new Response(null, { status: 303, headers: { location: demoUrl('/abgemeldet'), 'cache-control': 'no-store' } });
}

/** Direkter Aufruf per Link: Bestätigung anzeigen (Schutz vor Link-Vorschauen). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return simplePage(
    'Kein Interesse?',
    `<p>Mit einem Klick löschen wir den Entwurf und Ihre Daten. Wir schreiben Ihnen danach nicht mehr.</p>
<form method="post" action="${esc(demoUrl(`/d/${slug}/kein-interesse`))}"><button type="submit">Ja, Entwurf und Daten löschen</button></form>`,
  );
}
