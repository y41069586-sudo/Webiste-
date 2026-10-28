import type { ReactNode } from 'react';

/** Bausteine der Verwaltung; Gestaltung in app/admin/admin.css (ui-*). */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="ui-page-header">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle ? <div className="ui-page-subtitle">{typeof subtitle === 'string' ? <p>{subtitle}</p> : subtitle}</div> : null}
      </div>
      {actions ? <div className="ui-page-actions">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  children,
  className = '',
  actions,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <section className={`ui-card ${className}`}>
      {title ? (
        <div className="ui-card-head">
          <h2>{title}</h2>
          {actions}
        </div>
      ) : null}
      <div className="ui-card-body">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="ui-stat">
      <div className="ui-stat-label">{label}</div>
      <div className="ui-stat-value">{value}</div>
      {hint ? <div className="ui-stat-hint">{hint}</div> : null}
    </div>
  );
}

const badgeColors = {
  gray: 'ui-badge-gray',
  green: 'ui-badge-green',
  red: 'ui-badge-red',
  yellow: 'ui-badge-yellow',
  blue: 'ui-badge-blue',
  purple: 'ui-badge-purple',
} as const;

export function Badge({ children, color = 'gray' }: { children: ReactNode; color?: keyof typeof badgeColors }) {
  return <span className={`ui-badge ${badgeColors[color]}`}>{children}</span>;
}

export function statusColor(status: string): keyof typeof badgeColors {
  if (
    [
      'live',
      'paid',
      'delivered',
      'approved',
      'published',
      'sent',
      'demo_published',
      'preview_approved',
      'done',
      'active',
    ].includes(status)
  )
    return 'green';
  if (['failed', 'rejected', 'qa_failed', 'suppressed', 'error', 'blocked', 'refunded'].includes(status)) return 'red';
  if (
    [
      'pending_review',
      'generated',
      'letter_generated',
      'demo_built',
      'drafted',
      'escalated',
      'changes_requested',
      'needs_verification',
      'new',
      'proposed',
    ].includes(status)
  )
    return 'yellow';
  if (['scanned', 'cta_clicked', 'checkout_started', 'onboarding'].includes(status)) return 'purple';
  if (['expired', 'deleted', 'cancelled', 'ignored', 'retired', 'paused'].includes(status)) return 'gray';
  return 'blue';
}

/** Deutsche Bezeichnungen der Zustände (Leads, Demos, Briefe, Bestellungen, Seiten, Support, Varianten, Claims) */
const STATUS_LABELS: Record<string, string> = {
  discovered: 'Gefunden',
  qualified: 'Geeignet',
  demo_built: 'Demo zu prüfen',
  demo_approved: 'Demo freigegeben',
  demo_published: 'Demo online',
  letter_generated: 'Brief zu prüfen',
  letter_approved: 'Brief freigegeben',
  letter_sent: 'Brief verschickt',
  letter_delivered: 'Zugestellt',
  scanned: 'QR gescannt',
  cta_clicked: 'Interesse',
  checkout_started: 'Im Checkout',
  paid: 'Bezahlt',
  onboarding: 'Onboarding',
  preview_approved: 'Vorschau ok',
  live: 'Live',
  rejected: 'Abgelehnt',
  suppressed: 'Gesperrt',
  expired: 'Abgelaufen',
  followup_sent: 'Folgebrief',
  failed: 'Fehler',
  building: 'Wird gebaut',
  qa_failed: 'Prüfung fehlgeschlagen',
  pending_review: 'Zur Prüfung',
  approved: 'Freigegeben',
  published: 'Online',
  deleted: 'Gelöscht',
  generated: 'Erstellt',
  queued: 'In Zustellung',
  sent: 'Versendet',
  delivered: 'Zugestellt',
  cancelled: 'Storniert',
  pending: 'Offen',
  processing: 'In Bearbeitung',
  refunded: 'Erstattet',
  generating: 'Wird erstellt',
  preview: 'Vorschau',
  changes_requested: 'Änderungen gewünscht',
  deploying: 'Geht online',
  suspended: 'Pausiert',
  new: 'Neu',
  classified: 'Eingeordnet',
  drafted: 'Entwurf',
  escalated: 'Zu prüfen',
  done: 'Erledigt',
  ignored: 'Aussortiert',
  proposed: 'Vorgeschlagen',
  active: 'Aktiv',
  paused: 'Pausiert',
  retired: 'Beendet',
  needs_verification: 'Prüfen',
  blocked: 'Gesperrt',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span title={status}>
      <Badge color={statusColor(status)}>{statusLabel(status)}</Badge>
    </span>
  );
}

export const btn = {
  primary: 'ui-btn ui-btn-primary',
  secondary: 'ui-btn ui-btn-secondary',
  danger: 'ui-btn ui-btn-danger',
  ghost: 'ui-btn ui-btn-ghost',
};

export const input =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none';
export const label = 'ui-label';

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: string }) {
  const rows = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows === 0 ? (
            <tr>
              <td colSpan={head.length} className="ui-empty">
                {empty ?? 'Keine Einträge'}
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={className}>{children}</td>;
}

const NOTICE_ICONS = {
  info: 'M12 16v-4M12 8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  warn: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  error: 'M12 8v4M12 16h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  success: 'M20 6 9 17l-5-5',
} as const;

export function Notice({ kind = 'info', children }: { kind?: 'info' | 'warn' | 'error' | 'success'; children: ReactNode }) {
  return (
    <div className={`ui-notice ui-notice-${kind}`} role={kind === 'error' ? 'alert' : undefined}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={NOTICE_ICONS[kind]} />
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
