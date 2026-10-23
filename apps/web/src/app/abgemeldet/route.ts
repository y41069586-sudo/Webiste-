import { esc, getConfig } from '@wbm/core';
import { simplePage } from '@/lib/public-page';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = await getConfig();
  return simplePage(
    'Erledigt – wir schreiben Ihnen nicht mehr',
    `<p>Der Entwurf und Ihre Daten wurden gelöscht. Damit wir Sie auch künftig nicht erneut anschreiben, haben wir lediglich eine nicht rückrechenbare Prüfsumme (Hash) Ihres Firmennamens und Ihrer Anschrift auf unserer Sperrliste gespeichert.</p>
<p class="muted">Fragen zum Datenschutz: <a href="mailto:${esc(cfg.sender.email)}">${esc(cfg.sender.email)}</a></p>`,
  );
}
