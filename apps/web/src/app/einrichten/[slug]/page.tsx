import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_CONFIG, getCheckoutDraft, getConfig, publicOperatorSettings, setupCookieName } from '@wbm/core';
import { PublicShell } from '@/components/public/shell';
import { SetupEditor } from './uploads';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ihre Website einrichten', robots: { index: false, follow: false } };

export default async function SetupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  const draft = await getCheckoutDraft(slug, token);
  if (!draft) redirect(`/d/${slug}/uebernehmen`);
  const cfg = publicOperatorSettings(await getConfig(), DEFAULT_CONFIG.sender);
  return (
    <PublicShell company={cfg.sender.company}>
      <p className="text-sm font-medium text-slate-500">1. Einrichten · 2. Prüfen · 3. Zahlung</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Machen Sie Ihre Website zu Ihrer.</h1>
      <p className="mt-3 text-slate-700">
        Ergänzen Sie Ihre Angaben, Texte, Bilder und Wunschdomain. Ihre Einrichtung ist unverbindlich. Erst danach prüfen Sie den
        Tarif und wechseln zur kostenpflichtigen Bestellung.
      </p>
      <p className="mt-3 mb-6 text-sm text-slate-600">
        Mit „Zwischenspeichern“ bleiben Ihre Eingaben bis zu sieben Tage in diesem Browser zugänglich. Es wird noch nichts
        veröffentlicht oder registriert.{' '}
        <Link href={`/d/${slug}#uebernehmen`} className="underline">
          Leistungsumfang und Preise ansehen
        </Link>{' '}
        ·{' '}
        <Link href="/datenschutz" className="underline">
          Datenschutz
        </Link>
      </p>
      <SetupEditor slug={slug} initial={draft.data} assets={Object.keys(draft.assetKeys)} />
    </PublicShell>
  );
}
