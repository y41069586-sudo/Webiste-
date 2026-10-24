import { AdminArrow } from '@/components/admin-arrow';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { effectiveSwitches, getConfig } from '@wbm/core';
import { AdminNav } from '@/components/admin-nav';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const sw = effectiveSwitches(await getConfig());
  return (
    <div className="admin-shell">
      <a href="#admin-content" className="admin-skip">
        Zum Inhalt
      </a>
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark">
            S
            <span>
              <AdminArrow />
            </span>
          </span>
          <span>
            SeitenWerk<small>DEIN ARBEITSPLATZ</small>
          </span>
        </Link>
        <AdminNav />
        <div className="admin-account">
          <span className="admin-avatar" aria-hidden="true">
            DA
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Doaa Attia</p>
            <p className="truncate text-xs text-slate-500" title={session.email}>
              {session.email}
            </p>
          </div>
          <form action="/logout" method="post">
            <button className="admin-signout" type="submit" aria-label="Abmelden" title="Abmelden">
              <AdminArrow />
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div>
            <span className="admin-status-dot" /> SeitenWerk Studio{' '}
            <span className="hidden text-slate-400 sm:inline"> / Verwaltung</span>
          </div>
          <Link href="/" target="_blank" rel="noopener noreferrer" className="admin-website-link">
            Website ansehen <AdminArrow />
          </Link>
        </header>
        <div className="admin-safety-bar">
          {sw.killSwitch ? <span className="rounded bg-red-600 px-2 py-1 font-semibold text-white">NOT-AUS AKTIV</span> : null}
          <span
            className={`rounded px-2 py-1 font-medium ${sw.dryRun ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}
          >
            {sw.dryRun ? `Testmodus${sw.dryRunLockedByEnv ? ' · gesichert' : ''}` : 'LIVE – echte Aktionen'}
          </span>
          <span className="rounded bg-slate-100 px-2 py-1">Briefversand: {sw.autoSend ? 'an' : 'aus'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">Demo-Freigabe: {sw.autoApproveDemos ? 'an' : 'aus'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">Folgebriefe: {sw.followupEnabled ? 'an' : 'aus'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">Auto-Antworten: {sw.autoReply ? 'an' : 'aus'}</span>
        </div>
        <main id="admin-content" className="admin-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
