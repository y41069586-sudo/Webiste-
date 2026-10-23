import Link from 'next/link';
import { getConfig } from '@wbm/core';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cfg = await getConfig();
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{cfg.sender.company}</h1>
      <p className="mt-3 text-slate-700">
        Fertige Websites für lokale Betriebe – mit eigener Domain, Hosting und persönlicher Betreuung.
      </p>
      <p className="mt-6 text-sm text-slate-600">
        Sie haben einen Brief von uns erhalten und möchten nicht mehr kontaktiert werden? Scannen Sie den Code im Brief und tippen
        Sie auf „Kein Interesse“ oder schreiben Sie an{' '}
        <a className="text-brand-600 underline" href={`mailto:${cfg.sender.email}`}>
          {cfg.sender.email}
        </a>
        .
      </p>
      <footer className="mt-12 flex gap-4 text-sm text-slate-600">
        <Link href="/impressum" className="underline">
          Impressum
        </Link>
        <Link href="/datenschutz" className="underline">
          Datenschutz
        </Link>
        <Link href="/agb" className="underline">
          AGB
        </Link>
      </footer>
    </main>
  );
}
