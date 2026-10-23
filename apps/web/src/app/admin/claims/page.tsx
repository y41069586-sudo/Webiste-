import { approvalBlocker, getPlaybooks, listClaims, type ClaimRow } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, Stat, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { approveClaimAction, blockClaimAction, syncClaimsAction, unblockClaimAction } from './actions';

export const metadata = { title: 'Claims & Playbooks' };
export const dynamic = 'force-dynamic';

const day = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeZone: 'Europe/Berlin' }).format(d) : '–';

const STATUS: Record<ClaimRow['status'], { label: string; color: 'green' | 'yellow' | 'red' }> = {
  approved: { label: 'freigegeben', color: 'green' },
  needs_verification: { label: 'wartet auf Freigabe', color: 'yellow' },
  blocked: { label: 'gesperrt', color: 'red' },
};
const BLOCKED: Record<string, string> = {
  expired: 'Quelle älter als 24 Monate',
  yaml: 'in der Claims-Datei gesperrt',
  scope: 'keine deutschen Daten',
  removed: 'nicht mehr in der Datei',
  manual: 'manuell gesperrt',
};
const CHECK: Record<string, { label: string; color: 'green' | 'blue' | 'yellow' | 'red' }> = {
  ok: { label: 'Quelle geprüft: stimmt', color: 'green' },
  corrected: { label: 'Quelle geprüft: Wortlaut korrigiert', color: 'blue' },
  primary_missing: { label: 'Primärquelle fehlt', color: 'yellow' },
  mismatch: { label: 'Quelle widerspricht', color: 'red' },
};

function ClaimCard({ c }: { c: ClaimRow }) {
  const st = STATUS[c.status];
  const check = c.checkResult ? CHECK[c.checkResult] : undefined;
  const blocker = approvalBlocker(c);
  return (
    <article data-claim-id={c.id} aria-label={`Claim ${c.id}`}>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <code className="text-xs font-semibold">{c.id}</code>
          <Badge color={st.color}>{st.label}</Badge>
          {c.blockedReason ? <Badge color="gray">{BLOCKED[c.blockedReason] ?? c.blockedReason}</Badge> : null}
          {check ? <Badge color={check.color}>{check.label}</Badge> : null}
          <span className="text-xs text-slate-500">{c.industries.join(', ') || 'keine Branche'}</span>
        </div>
        <p className="mt-3 max-w-[70ch] text-base text-slate-900">„{c.textDe}“</p>
        <p className="mt-1 text-xs text-slate-600">Fußnote: {c.footnoteDe}</p>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="inline font-medium">Quelle: </dt>
            <dd className="inline">
              <a className="text-brand-700 underline" href={c.sourceUrl} target="_blank" rel="noreferrer noopener">
                {c.sourcePublisher} – {c.sourceTitle}
              </a>
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Stichprobe: </dt>
            <dd className="inline">
              {c.sample ? new Intl.NumberFormat('de-DE').format(c.sample) : '–'} · {c.population ?? '–'}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">Veröffentlicht: </dt>
            <dd className="inline">{day(c.publishedAt)}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Gültig bis: </dt>
            <dd className="inline">{day(c.expiresAt)}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Geprüft am: </dt>
            <dd className="inline">{day(c.checkedAt)}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Freigegeben: </dt>
            <dd className="inline">{c.verifiedBy ? `${c.verifiedBy}, ${day(c.verifiedAt)}` : '–'}</dd>
          </div>
        </dl>
        {c.checkQuote ? (
          <blockquote className="mt-3 max-w-[70ch] border-l-2 border-slate-300 pl-3 text-xs text-slate-700">
            Wortlaut der Quelle: „{c.checkQuote}“
          </blockquote>
        ) : null}
        {c.checkNote ? <p className="mt-2 max-w-[70ch] text-xs text-slate-600">Prüfnotiz: {c.checkNote}</p> : null}
        {c.note ? <p className="mt-1 max-w-[70ch] text-xs text-amber-800">Verwendung: {c.note}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {c.status !== 'approved' && !blocker ? (
            <form action={approveClaimAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="id" value={c.id} />
              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input type="checkbox" name="checked" required /> Zahl, Wortlaut, Jahr und Stichprobe selbst geprüft
              </label>
              <button type="submit" className={btn.primary}>
                Freigeben
              </button>
            </form>
          ) : null}
          {c.status !== 'approved' && blocker ? (
            <span className="text-xs text-slate-500">Freigabe nicht möglich: {blocker}</span>
          ) : null}
          {c.status !== 'blocked' ? (
            <form action={blockClaimAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={btn.secondary}>
                Sperren
              </button>
            </form>
          ) : null}
          {c.status === 'blocked' && c.blockedReason === 'manual' ? (
            <form action={unblockClaimAction}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className={btn.secondary}>
                Sperre aufheben
              </button>
            </form>
          ) : null}
        </div>
      </Card>
    </article>
  );
}

export default async function ClaimsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await listClaims();
  const byId = new Map(rows.map((r) => [r.id, r]));
  const playbooks = getPlaybooks();
  const count = (s: ClaimRow['status']) => rows.filter((r) => r.status === s).length;
  return (
    <>
      <PageHeader
        title="Claims & Playbooks"
        subtitle="Nur freigegebene Claims dürfen in Briefen und Demos stehen (§ 5 UWG). Quellen gelten 24 Monate."
        actions={
          <form action={syncClaimsAction}>
            <button type="submit" className={btn.secondary}>
              Claims-Datei neu einlesen
            </button>
          </form>
        }
      />
      {sp.error ? (
        <div className="mb-4">
          <Notice kind="error">{sp.error}</Notice>
        </div>
      ) : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Freigegeben" value={count('approved')} />
        <Stat label="Wartet auf Freigabe" value={count('needs_verification')} />
        <Stat label="Gesperrt" value={count('blocked')} hint="abgelaufen, US-Daten oder manuell" />
      </div>
      <div className="mb-6">
        <Notice kind="info">
          Prüfprotokoll mit Datum und Wortlaut: <code>docs/claims-verifikation.md</code>. Ändert sich Text oder Quelle in{' '}
          <code>packages/core/claims/claims.yaml</code>, braucht der Claim eine neue Freigabe.
        </Notice>
      </div>
      <section aria-labelledby="claims-h" className="space-y-4">
        <h2 id="claims-h" className="text-lg font-semibold">
          Claims ({rows.length})
        </h2>
        {rows.length === 0 ? <Notice kind="warn">Noch keine Claims eingelesen – „Claims-Datei neu einlesen“.</Notice> : null}
        {rows.map((c) => (
          <ClaimCard key={c.id} c={c} />
        ))}
      </section>
      <section aria-labelledby="pb-h" className="mt-10 space-y-4">
        <h2 id="pb-h" className="text-lg font-semibold">
          Branchen-Playbooks
        </h2>
        <p className="max-w-[70ch] text-sm text-slate-600">
          Ausgeschlossen: Heilberufe und Gesundheit sowie Anwälte, Steuerberater und Notare. Der Lead-Finder sortiert sie aus (
          <code>packages/core/playbooks/_ausschluss.yaml</code>).
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {playbooks.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{p.label}</h3>
                {p.fallback ? <Badge color="gray">Fallback / Kontrollgruppe</Badge> : null}
              </div>
              <p className="mt-2 text-sm text-slate-700">Aufhänger: {p.hook}</p>
              <p className="mt-2 text-xs text-slate-600">Demo-Abschnitte: {p.demo_sections.join(', ')}</p>
              <p className="mt-1 text-xs text-slate-600">Google-Typen: {p.google_types.join(', ')}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.allowed_claims.length === 0 ? <span className="text-xs text-slate-500">Brief ohne Statistik</span> : null}
                {p.allowed_claims.map((id) => {
                  const c = byId.get(id);
                  return (
                    <Badge key={id} color={c ? STATUS[c.status].color : 'gray'}>
                      {id}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
