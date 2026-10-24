'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SITE_NAV } from '@/lib/site-nav';

/** Schlanker Kopf; mobil öffnet ein weißes Navigationspanel mit großen Links. */
export function SiteHeader({ brand }: { brand: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);
  return (
    <header className="sticky top-0 z-40 bg-[#f8f8fb]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="text-strong font-tight text-[1.05rem] text-[#0f172a]">
          {brand}
        </Link>
        <nav aria-label="Hauptnavigation" className="hidden items-center gap-6 lg:flex">
          {SITE_NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={`font-tight text-nav relative py-1 transition-colors duration-300 hover:text-[#1f4fd8] after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-[#1f4fd8] after:transition-transform after:duration-500 ${active ? 'text-[#1f4fd8] after:scale-x-100' : 'text-[#0f172a] after:scale-x-0 hover:after:scale-x-100'}`}
              >
                {n.label}
              </Link>
            );
          })}
          <Link href="/preise" className="btn-site btn-primary btn-compact !min-h-10 !py-2 text-[0.95rem]">
            Preise ansehen
          </Link>
        </nav>
        <button
          type="button"
          className="font-tight text-nav relative z-50 flex h-11 items-center gap-2 px-1 text-[#0f172a] lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={`transition-colors duration-500 `}>{open ? 'Schließen' : 'Menü'}</span>
          <span aria-hidden="true" className="relative block h-3 w-5">
            <span
              className={`absolute left-0 h-0.5 w-5 transition-[transform,background-color] duration-500 ${open ? 'top-[5px] rotate-45 bg-[#0f172a]' : 'top-0 bg-[#0f172a]'}`}
              style={{ transitionTimingFunction: 'var(--ease-smooth)' }}
            />
            <span
              className={`absolute left-0 h-0.5 w-5 transition-[transform,background-color] duration-500 ${open ? 'top-[5px] -rotate-45 bg-[#0f172a]' : 'top-[10px] bg-[#0f172a]'}`}
              style={{ transitionTimingFunction: 'var(--ease-smooth)' }}
            />
          </span>
        </button>
      </div>
      <nav
        id="mobile-nav"
        aria-label="Mobile Navigation"
        inert={!open}
        className={`fixed inset-0 z-40 flex flex-col bg-white px-5 pt-24 pb-10 transition-opacity duration-500 lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        style={{ transitionTimingFunction: 'var(--ease-smooth)' }}
      >
        <p className="font-tight text-nav text-[#5b6475]">Seiten</p>
        <ul className="mt-2">
          {[{ href: '/', label: 'Start' }, ...SITE_NAV].map((n, i) => (
            <li
              key={n.href}
              className="transition-[opacity,transform] duration-700"
              style={{
                transitionTimingFunction: 'var(--ease-smooth)',
                transitionDelay: open ? `${80 + i * 45}ms` : '0ms',
                opacity: open ? 1 : 0,
                transform: open ? 'none' : 'translateY(12px)',
              }}
            >
              <Link
                href={n.href}
                className="block py-2.5 text-[2rem] leading-tight font-semibold tracking-[-0.04em] text-[#0f172a]"
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/preise" className="btn-site mt-auto bg-white text-[#3c4454]">
          Preise ansehen
        </Link>
      </nav>
    </header>
  );
}
