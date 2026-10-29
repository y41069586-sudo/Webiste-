import { Brand } from '@/components/brand';
import Link from 'next/link';
import type { ReactNode } from 'react';

/** Rahmen der Kauf-Strecke (Checkout, Onboarding, Vorschau) – Farbwelt der Firmen-Website, ohne Tracking. */
export function PublicShell({ company, children, wide = false }: { company: string; children: ReactNode; wide?: boolean }) {
  const w = wide ? 'max-w-6xl' : 'max-w-3xl';
  return (
    <div className="theme-site flex min-h-screen flex-col">
      <header className="bg-white">
        <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-5 ${w}`}>
          <Link href="/" className="text-strong font-tight text-[1.05rem] text-[#0f172a]">
            <Brand />
          </Link>
          <span className="hidden text-xs text-slate-600 min-[380px]:inline">Ohne Verkaufsgespräch</span>
        </div>
      </header>
      <main className={`page-fade mx-auto w-full flex-1 px-5 py-10 ${w}`}>{children}</main>
      <footer className="bg-white" aria-label="Anbieter und Rechtliches">
        <p className="mx-auto max-w-3xl px-5 pt-5 text-sm text-slate-600">{company}</p>
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
        </div>
      </footer>
    </div>
  );
}

export function PublicCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card-site p-6 sm:p-7 ${className}`}>{children}</section>;
}
