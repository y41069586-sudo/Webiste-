import { Brand } from '@/components/brand';
import { getSiteConfig } from '@/lib/site-config';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { getEnv } from '@wbm/core';
import { RevealObserver } from '@/components/site/reveal-observer';
import { SiteHeader } from '@/components/site/site-header';
import { brandName, SITE_NAV } from '@/lib/site';

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  const index = getEnv().SITE_INDEXABLE;
  return { robots: { index, follow: index } };
}

/** Firmen-Website im Studio-Stil (DESIGN.md): graue Fläche, Charcoal-Typografie, Farbe nur aus den Beispielen. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const cfg = await getSiteConfig();
  const s = cfg.sender;
  const brand = brandName(s.company);
  return (
    <div className="theme-site flex min-h-screen flex-col">
      {/* vor dem ersten Zeichnen: Einblend-Animationen nur mit JS */}
      <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      <a
        href="#inhalt"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[4px] focus:bg-white focus:px-4 focus:py-2"
      >
        Zum Inhalt springen
      </a>
      <SiteHeader brand={brand} />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <footer className="bg-white">
        <div className="mx-auto max-w-[90rem] px-5 pt-16 pb-10 sm:px-8">
          <div className="grid gap-10 border-t border-[#e3e7ee] pt-12 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div>
              <p className="text-section text-[#0f172a]">
                <Brand />
              </p>
              <p className="mt-4 max-w-[34ch] text-[0.95rem] leading-relaxed text-[#3c4454]">
                Fertige Websites für lokale Betriebe ohne eigene Website – mit eigener Domain und Hosting.{' '}
                {s.city ? `Aus ${s.city}.` : ''}
              </p>
            </div>
            <nav aria-label="Seiten">
              <p className="text-strong text-[#0f172a]">Seiten</p>
              <ul className="font-tight text-nav mt-3 space-y-2">
                {SITE_NAV.map((n) => (
                  <li key={n.href}>
                    <Link href={n.href} className="text-[#0f172a] transition-opacity duration-300 hover:opacity-60">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Rechtliches">
              <p className="text-strong text-[#0f172a]">Rechtliches</p>
              <ul className="font-tight text-nav mt-3 space-y-2">
                {[
                  ['/impressum', 'Impressum'],
                  ['/datenschutz', 'Datenschutz'],
                  ['/agb', 'AGB'],
                  ['/quellen', 'Quellen'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <Link href={href!} className="text-[#0f172a] transition-opacity duration-300 hover:opacity-60">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="text-strong text-[#0f172a]">Kontakt</p>
              <ul className="font-tight text-nav mt-3 space-y-2 text-[#0f172a]">
                {s.email ? (
                  <li>
                    <a href={`mailto:${s.email}`} className="transition-opacity duration-300 hover:opacity-60">
                      {s.email}
                    </a>
                  </li>
                ) : null}
                {s.phone ? <li>{s.phone}</li> : null}
                {s.street && s.city ? (
                  <li className="text-[#5b6475]">
                    {s.street}, {s.postalCode} {s.city}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          <p className="text-legal mt-14 text-[#5b6475]">
            © {new Date().getFullYear()} {brand}. Alle Beispiel-Betriebe auf dieser Website sind erfunden.
          </p>
        </div>
      </footer>
      <RevealObserver />
    </div>
  );
}
