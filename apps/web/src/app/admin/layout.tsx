import './admin.css';
import { AdminArrow } from '@/components/admin-arrow';
import { Brand } from '@/components/brand';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { sql } from 'drizzle-orm';
import { effectiveSwitches, getConfig, getDb } from '@wbm/core';
import { AdminNav, SectionTabs } from '@/components/admin-nav';
import { NavProgress } from '@/components/admin/nav-progress';
import { NavToggle } from '@/components/admin/nav-toggle';
import { PageTransition } from '@/components/admin/page-transition';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, cfg, open] = await Promise.all([
    requireAdmin(),
    getConfig(),
    // Offene Arbeit für die Zähler in der Navigation (eine Abfrage)
    getDb()
      .execute<{ demos: number; letters: number; support: number; alerts: number }>(
        sql`SELECT
          (SELECT count(*)::int FROM leads WHERE status = 'demo_built') AS demos,
          (SELECT count(*)::int FROM leads WHERE status = 'letter_generated') AS letters,
          (SELECT count(*)::int FROM support_messages WHERE status IN ('new', 'drafted', 'escalated')) AS support,
          (SELECT count(*)::int FROM alerts WHERE acknowledged_at IS NULL) AS alerts`,
      )
      .then((r) => r.rows[0])
      .catch(() => undefined),
  ]);
  const sw = effectiveSwitches(cfg);
  const auto = [
    sw.autoSend && 'Versand',
    sw.autoApproveDemos && 'Demo-Freigabe',
    sw.followupEnabled && 'Folgebriefe',
    sw.autoReply && 'Antworten',
  ].filter(Boolean);
  const chips: { label: string; tone: string }[] = [
    ...(sw.killSwitch ? [{ label: 'NOT-AUS aktiv', tone: 'is-alarm' }] : []),
    sw.dryRun
      ? { label: `Testmodus${sw.dryRunLockedByEnv ? ' · gesichert' : ''}`, tone: 'is-test' }
      : { label: 'LIVE – echte Aktionen', tone: 'is-live' },
    auto.length ? { label: `Automatik: ${auto.join(', ')}`, tone: 'is-on' } : { label: 'Automatik aus', tone: '' },
  ];
  return (
    <div className="admin-shell">
      <a href="#admin-content" className="admin-skip">
        Zum Inhalt
      </a>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <aside className="admin-sidebar" id="admin-sidebar" aria-label="Seitenleiste">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark">
            <Brand compact />
          </span>
          <span>
            SeitenWerk<small>DEIN ARBEITSPLATZ</small>
          </span>
        </Link>
        <AdminNav counts={open ?? {}} />
        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">
            SW
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Betreiberzugang</p>
            <p className="truncate text-xs text-slate-500" title={session.email}>
              {session.email}
            </p>
          </div>
          <form action="/logout" method="post">
            <button className="admin-signout" type="submit" aria-label="Abmelden" title="Abmelden">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
              </svg>
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <NavToggle />
          <div className="admin-topbar-status" aria-label="Systemstatus">
            {chips.map((c) => (
              <span key={c.label} className={`admin-chip ${c.tone}`}>
                {c.label}
              </span>
            ))}
          </div>
          <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-website-link">
            <span>Website ansehen</span> <AdminArrow />
          </Link>
        </header>
        <main id="admin-content" className="admin-main" tabIndex={-1}>
          <SectionTabs counts={open ?? {}} />
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
