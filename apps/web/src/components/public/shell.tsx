import Link from 'next/link';
import type { ReactNode } from 'react';

/** Rahmen für öffentliche Kundenseiten (Checkout, Onboarding, Vorschau) – ohne Tracking. */
export function PublicShell({ company, children, wide = false }: { company: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className={`mx-auto flex items-center justify-between gap-4 px-4 py-4 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
          <span className="text-lg font-semibold tracking-tight text-brand-700">{company}</span>
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current">
              <path d="M10 1.5a4.5 4.5 0 0 0-4.5 4.5v2H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-.5V6A4.5 4.5 0 0 0 10 1.5Zm-3 4.5a3 3 0 1 1 6 0v2H7V6Z" />
            </svg>
            Verschlüsselte Verbindung
          </span>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-8 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div
          className={`mx-auto flex flex-wrap gap-x-5 gap-y-2 px-4 py-5 text-sm text-slate-600 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}
        >
          <Link href="/impressum" className="hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:underline">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:underline">
            AGB
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function PublicCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>{children}</section>;
}
