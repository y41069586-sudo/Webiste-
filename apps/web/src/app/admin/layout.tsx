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
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin" className="font-semibold tracking-tight">
            Website-Brief
          </Link>
        </div>
        <div className="px-2 pb-4">
          <AdminNav />
        </div>
        <div className="space-y-2 border-t border-slate-100 px-4 py-4 text-xs text-slate-600">
          <div className="truncate" title={session.email}>
            {session.email}
          </div>
          <form action="/logout" method="post">
            <button className="text-brand-700 underline" type="submit">
              Abmelden
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs">
          {sw.killSwitch ? <span className="rounded bg-red-600 px-2 py-1 font-semibold text-white">NOT-AUS AKTIV</span> : null}
          <span
            className={`rounded px-2 py-1 font-medium ${sw.dryRun ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}
          >
            {sw.dryRun ? `DRY_RUN${sw.dryRunLockedByEnv ? ' (Umgebung)' : ''}` : 'LIVE – echte Aktionen'}
          </span>
          <span className="rounded bg-slate-100 px-2 py-1">AUTO_SEND: {sw.autoSend ? 'an' : 'aus'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">AUTO_APPROVE_DEMOS: {sw.autoApproveDemos ? 'an' : 'aus'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">FOLLOWUP: {sw.followupEnabled ? 'an' : 'aus'}</span>
          <span className="rounded bg-slate-100 px-2 py-1">AUTO_REPLY: {sw.autoReply ? 'an' : 'aus'}</span>
        </div>
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
