import type { Metadata } from 'next';
import Link from 'next/link';
import { getConfig, getPreviewContext } from '@wbm/core';
import { PublicCard, PublicShell } from '@/components/public/shell';
import { PreviewActions } from './preview-actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Vorschau Ihrer Website', robots: { index: false, follow: false } };

export default async function PreviewPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ freigegeben?: string; aenderung?: string }> }) {
  const { token } = await params;
  const sp = await searchParams;
  const cfg = await getConfig();
  const ctx = await getPreviewContext(token);
  const shell = (title: string, body: React.ReactNode) => (
    <PublicShell company={cfg.sender.company}>
      <PublicCard>
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <div className="space-y-3 text-slate-700">{body}</div>
      </PublicCard>
    </PublicShell>
  );
  if (ctx.state === 'not_found') return shell('Link ungültig', <p>Dieser Link ist nicht (mehr) gültig. Fragen? {cfg.sender.email}</p>);
  if (ctx.state === 'onboarding') {
    return shell(
      'Noch keine Vorschau',
      <p>
        Bitte tragen Sie zuerst Ihre{' '}
        <Link href={`/onboarding/${token}`} className="text-brand-700 underline">
          Angaben für die Website
        </Link>{' '}
        ein.
      </p>,
    );
  }
  if (ctx.state === 'generating') {
    return shell(
      sp.aenderung ? 'Danke – wir arbeiten Ihre Änderungen ein' : 'Ihre Vorschau wird erstellt',
      <p>Das dauert meist nur wenige Minuten. Sie bekommen eine E-Mail, sobald die Vorschau fertig ist. Sie können diese Seite auch einfach neu laden.</p>,
    );
  }
  if (ctx.state === 'approved') {
    return shell(
      sp.freigegeben ? 'Vielen Dank für die Freigabe!' : 'Freigegeben – Veröffentlichung läuft',
      <>
        <p>Wir registrieren jetzt Ihre Domain{ctx.customer.domain ? ` ${ctx.customer.domain}` : ''} und veröffentlichen die Website. Neue Domains brauchen manchmal einige Stunden, bis sie überall erreichbar sind.</p>
        <p>Sobald alles online ist, schicken wir Ihnen eine E-Mail mit allen Infos.</p>
      </>,
    );
  }
  if (ctx.state === 'live') {
    return shell(
      'Ihre Website ist online',
      <p>
        {ctx.site.productionUrl ? (
          <a href={ctx.site.productionUrl} className="text-brand-700 underline">
            {ctx.site.productionUrl}
          </a>
        ) : null}
      </p>,
    );
  }
  if (ctx.state !== 'preview') return shell('Vorschau nicht verfügbar', <p>Bitte wenden Sie sich an {cfg.sender.email}.</p>);
  return (
    <PublicShell company={cfg.sender.company} wide>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Vorschau Ihrer Website</h1>
      <p className="mt-2 mb-4 text-slate-600">So sieht Ihre Website aus. Scrollen Sie durch und prüfen Sie Texte, Kontaktdaten und Öffnungszeiten. Das Kontaktformular wird erst mit der Veröffentlichung aktiv.</p>
      {sp.aenderung === 'admin' ? (
        <div role="status" className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Danke! Ihr Wunsch liegt bei uns, wir melden uns persönlich.
        </div>
      ) : null}
      {ctx.openRequest?.status === 'needs_admin' ? (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Ihr letzter Änderungswunsch wird persönlich bearbeitet. Sie können die Seite trotzdem bereits freigeben.</div>
      ) : null}
      {ctx.lastSummary ? <p className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">Zuletzt geändert: {ctx.lastSummary}</p> : null}
      <div className="mb-6 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        <iframe src={`/preview/${token}/site?v=${ctx.site.version}`} title="Vorschau Ihrer Website" className="h-[75vh] w-full" sandbox="" />
      </div>
      <p className="mb-6 text-sm">
        <a href={`/preview/${token}/site?v=${ctx.site.version}`} target="_blank" rel="noopener" className="text-brand-700 underline">
          Vorschau im eigenen Fenster öffnen (z. B. auf dem Handy)
        </a>
      </p>
      <PreviewActions token={token} roundsLeft={ctx.roundsLeft} roundsIncluded={ctx.roundsIncluded} />
    </PublicShell>
  );
}
