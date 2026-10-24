import Link from 'next/link';
import type { ReactNode } from 'react';
import { brandName } from '@/lib/site-nav';

/** Rahmen der Kauf-Strecke (Checkout, Onboarding, Vorschau) – Farbwelt der Firmen-Website, ohne Tracking. */
export function PublicShell({ company, children, wide = false }: { company: string; children: ReactNode; wide?: boolean }) {
  const w = wide ? 'max-w-6xl' : 'max-w-3xl';
  return (
    <div className="theme-site flex min-h-screen flex-col">
      <header className="bg-white">
        <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-5 ${w}`}>
          <Link href="/" className="text-strong font-tight text-[1.05rem] text-[#0f172a]">
            {brandName(company)}
          </Link>
          <span className="flex items-center gap-1.5 text-xs text-slate-600">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-current text-emerald-600">
              <path d="M10 1.5a4.5 4.5 0 0 0-4.5 4.5v2H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-.5V6A4.5 4.5 0 0 0 10 1.5Zm-3 4.5a3 3 0 1 1 6 0v2H7V6Z" />
            </svg>
            Verschlüsselte Verbindung
          </span>
        </div>
      </header>
      <main className={`page-fade mx-auto w-full flex-1 px-5 py-10 ${w}`}>{children}</main>
      <footer className="bg-white">
        <div
          className={`font-tight text-nav mx-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-[#e3e7ee] px-5 py-8 text-[#0f172a] ${w}`}
        >
          <Link href="/impressum" className="hover:text-slate-900">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-slate-900">
            Datenschutz
          </Link>
          <Link href="/agb" className="hover:text-slate-900">
            AGB
          </Link>
          <Link href="/garantie" className="hover:text-slate-900">
            Garantie
          </Link>
        </div>
      </footer>
    </div>
  );
}

export function PublicCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card-site p-6 sm:p-7 ${className}`}>{children}</section>;
}
