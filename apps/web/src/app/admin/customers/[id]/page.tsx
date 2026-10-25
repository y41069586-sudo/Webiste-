import Link from 'next/link';
import { CustomerOperations } from '../operations';
import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { appUrl, effectiveSwitches, getConfig, getDb, schema } from '@wbm/core';
import { Badge, Card, Notice, PageHeader, StatusBadge, Table, Td, btn, input, label } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import {
  adminChangeAction,
  approveDomainAction,
  changeDomainAction,
  liveCheckAction,
  rebuildAction,
  redeployAction,
  resolveChangeAction,
  suspendAction,
} from '../actions';

export const metadata = { title: 'Kunde' };
export const dynamic = 'force-dynamic';

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = getDb();
  const c = await db.query.customers.findFirst({ where: eq(schema.customers.id, id) });
  if (!c) notFound();
  const [site, order, cfg] = await Promise.all([
    db.query.sites.findFirst({ where: eq(schema.sites.customerId, id) }),
    db.query.orders.findFirst({ where: eq(schema.orders.id, c.orderId) }),
    getConfig(),
  ]);
  const sw = effectiveSwitches(cfg);
  const [crs, log, mails] = await Promise.all([
    site
      ? db
          .select()
          .from(schema.changeRequests)
          .where(eq(schema.changeRequests.siteId, site.id))
          .orderBy(asc(schema.changeRequests.createdAt))
      : [],
    db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entity, site ? 'site' : 'customer'), eq(schema.auditLog.entityId, site?.id ?? id)))
      .orderBy(desc(schema.auditLog.createdAt))
      .limit(40),
    db
      .select()
      .from(schema.outboundEmails)
      .where(eq(schema.outboundEmails.customerId, id))
      .orderBy(desc(schema.outboundEmails.createdAt))
      .limit(30),
  ]);
  const hidden = (
    <>
      <input type="hidden" name="customerId" value={c.id} />
      {site ? <input type="hidden" name="siteId" value={site.id} /> : null}
    </>
  );
  const awaitingDomain = site?.statusReason === 'Domainkauf wartet auf Freigabe';
  const live = site?.liveCheckJson as { checks?: Record<string, unknown>; url?: string; attempt?: number } | null | undefined;
  return (
    <>
      <PageHeader
        title={c.company}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            {site ? <StatusBadge status={site.status} /> : null}
            {c.domain ? (
              <span>
                {c.domain} <StatusBadge status={c.domainStatus} />
              </span>
            ) : null}
          </span>
        }
        actions={
          <>
            {order ? (
              <Link href={`/admin/orders/${order.id}`} className={btn.secondary}>
                Bestellung
              </Link>
            ) : null}
            {c.leadId ? (
              <Link href={`/admin/leads/${c.leadId}`} className={btn.secondary}>
                Lead
              </Link>
            ) : null}
          </>
        }
      />
      {awaitingDomain ? (
        <div className="mb-6">
          <Card title="Domainkauf freigeben">
            <form action={approveDomainAction} className="space-y-3">
              {hidden}
              <Notice kind="warn">
                {sw.dryRun
                  ? 'DRY_RUN ist aktiv – es wird keine echte Domain registriert.'
                  : `Die Domain ${c.domain} wird kostenpflichtig beim Registrar auf den Kunden (Impressumsdaten) registriert.`}
              </Notice>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="confirm" className="h-4 w-4" /> Ich gebe die Registrierung von {c.domain} frei.
              </label>
              <button className={btn.primary}>Domain registrieren und veröffentlichen</button>
            </form>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Kunde">
          <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
            <dt className="text-slate-500">Ansprechpartner</dt>
            <dd>{c.contactName}</dd>
            <dt className="text-slate-500">E-Mail</dt>
            <dd>{c.email}</dd>
            <dt className="text-slate-500">Telefon</dt>
            <dd>{c.phone ?? '–'}</dd>
            <dt className="text-slate-500">Onboarding-Link</dt>
            <dd className="break-all">
              <a
                href={appUrl(`/onboarding/${c.accessToken}`)}
                className="text-brand-700 underline"
                target="_blank"
                rel="noopener"
              >
                öffnen
              </a>{' '}
              ·{' '}
              <a href={appUrl(`/preview/${c.accessToken}`)} className="text-brand-700 underline" target="_blank" rel="noopener">
                Vorschau-Seite
              </a>
            </dd>
            <dt className="text-slate-500">Änderungsrunden</dt>
            <dd>
              {c.changeRoundsUsed} von {cfg.onboarding.includedChangeRounds}
            </dd>
            <dt className="text-slate-500">Hosting bis</dt>
            <dd>{dt(c.hostingUntil)}</dd>
            <dt className="text-slate-500">Abo</dt>
            <dd>{c.subscriptionId ? <Badge>{order?.subscriptionStatus ?? 'eingerichtet'}</Badge> : 'nein'}</dd>
            <dt className="text-slate-500">Domain</dt>
            <dd>
              {c.domain ?? '–'} · registriert {dt(c.domainRegisteredAt)} · läuft ab {dt(c.domainExpiresAt)}
              {c.domainApprovedAt ? (
                <span className="block text-xs text-slate-500">freigegeben {dt(c.domainApprovedAt)}</span>
              ) : null}
            </dd>
          </dl>
          {c.domainStatus !== 'registered' ? (
            <form action={changeDomainAction} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="customerId" value={c.id} />
              <div>
                <label htmlFor="domain" className={label}>
                  Domain ändern
                </label>
                <input id="domain" name="domain" defaultValue={c.domain ?? ''} className={input} />
              </div>
              <button className={btn.secondary}>Prüfen und speichern</button>
            </form>
          ) : null}
        </Card>
        <Card title="Website">
          {site ? (
            <>
              <dl className="grid grid-cols-[10rem_1fr] gap-y-1.5 text-sm">
                <dt className="text-slate-500">Template</dt>
                <dd>
                  {site.templateId} / {site.palette} · Version {site.version}
                </dd>
                <dt className="text-slate-500">Hosting</dt>
                <dd>
                  {site.hostingProvider ?? '–'}{' '}
                  {site.hostingUrl ? (
                    <a href={site.hostingUrl} className="text-brand-700 underline">
                      Standard-URL
                    </a>
                  ) : null}
                </dd>
                <dt className="text-slate-500">Live-URL</dt>
                <dd>
                  {site.productionUrl ? (
                    <a href={site.productionUrl} className="text-brand-700 underline">
                      {site.productionUrl}
                    </a>
                  ) : (
                    '–'
                  )}
                </dd>
                <dt className="text-slate-500">Formular an</dt>
                <dd>{site.formTargetEmail ?? '–'}</dd>
                <dt className="text-slate-500">Status-Hinweis</dt>
                <dd>{site.statusReason ?? '–'}</dd>
                <dt className="text-slate-500">Live-Check</dt>
                <dd className="text-xs">{live ? `Versuch ${live.attempt ?? 0}: ${JSON.stringify(live.checks)}` : '–'}</dd>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                {site.previewHtmlKey ? (
                  <a href={`/admin/files/${site.previewHtmlKey}`} className={btn.secondary} target="_blank" rel="noopener">
                    Vorschau-HTML
                  </a>
                ) : null}
                <form action={rebuildAction}>
                  {hidden}
                  <button className={btn.secondary}>Vorschau neu bauen</button>
                </form>
                <form action={redeployAction}>
                  {hidden}
                  <button className={btn.secondary}>Neu veröffentlichen</button>
                </form>
                <form action={liveCheckAction}>
                  {hidden}
                  <button className={btn.secondary}>Live-Check jetzt</button>
                </form>
                <form action={suspendAction}>
                  {hidden}
                  <input type="hidden" name="suspend" value={site.status === 'suspended' ? '0' : '1'} />
                  <button className={site.status === 'suspended' ? btn.secondary : btn.danger}>
                    {site.status === 'suspended' ? 'Sperre aufheben' : 'Seite sperren'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600">Noch keine Seite angelegt (Onboarding-Job läuft nach Zahlungseingang).</p>
          )}
        </Card>
        {site ? (
          <Card title="Änderungswünsche" className="lg:col-span-2">
            <Table head={['Zeit', 'Quelle', 'Wunsch', 'Status', 'Ergebnis', '']} empty="Keine">
              {crs.map((r) => (
                <tr key={r.id}>
                  <Td>{dt(r.createdAt)}</Td>
                  <Td>
                    {r.source}
                    {r.countsAsRound ? '' : ' (keine Runde)'}
                  </Td>
                  <Td className="max-w-md whitespace-pre-wrap">{r.text}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td className="max-w-xs text-xs">{r.resultNote ?? '–'}</Td>
                  <Td>
                    {r.status === 'needs_admin' ? (
                      <form action={resolveChangeAction}>
                        {hidden}
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="note" value="Vom Betreiber erledigt" />
                        <button className={btn.ghost}>Als erledigt markieren</button>
                      </form>
                    ) : null}
                  </Td>
                </tr>
              ))}
            </Table>
            <form action={adminChangeAction} className="mt-4 space-y-2">
              {hidden}
              {crs.find((r) => r.status === 'needs_admin') ? (
                <input type="hidden" name="resolves" value={crs.find((r) => r.status === 'needs_admin')!.id} />
              ) : null}
              <label htmlFor="admin-text" className={label}>
                Eigene Änderungsanweisung (zählt nicht als Kundenrunde, erzeugt neue Vorschau)
              </label>
              <textarea id="admin-text" name="text" rows={3} className={input} />
              <button className={btn.primary}>Umsetzen</button>
            </form>
          </Card>
        ) : null}
        {order?.offerSnapshot ? <CustomerOperations customerId={c.id} order={order} /> : null}
        <Card title="E-Mails">
          <Table head={['Zeit', 'Art', 'Status']} empty="Keine">
            {mails.map((m) => (
              <tr key={m.id}>
                <Td>{dt(m.createdAt)}</Td>
                <Td>{m.kind}</Td>
                <Td>
                  <StatusBadge status={m.status} />
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Verlauf">
          <Table head={['Zeit', 'Aktion', 'Auslöser']}>
            {log.map((l) => (
              <tr key={l.id}>
                <Td>{dt(l.createdAt)}</Td>
                <Td>{l.action}</Td>
                <Td>{l.actor}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
