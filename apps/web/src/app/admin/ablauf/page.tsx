import Link from 'next/link';
import { workflowStatus } from '@wbm/core';
import { PageHeader } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { num } from '@/lib/format';

export const metadata = { title: 'Ablauf' };
export const dynamic = 'force-dynamic';

const MODE = {
  auto: { label: 'Von selbst', tone: 'is-auto' },
  du: { label: 'Du', tone: 'is-you' },
  aus: { label: 'Automatik aus', tone: 'is-off' },
} as const;

export default async function WorkflowPage() {
  await requireAdmin();
  const { steps, nextStep } = await workflowStatus();
  const next = steps.find((s) => s.key === nextStep);
  return (
    <>
      <PageHeader
        title="Ablauf"
        subtitle="Grüne Schritte laufen von selbst. Du kümmerst dich nur um die lila Schritte – oben steht immer, was als Nächstes dran ist."
      />
      {next ? (
        <div className="flow-next">
          <div>
            <p className="flow-next-kicker">Dein nächster Schritt</p>
            <p className="flow-next-title">
              {next.title}: {num(next.count)} {next.count === 1 ? 'Betrieb wartet' : 'Betriebe warten'}
            </p>
          </div>
          <Link href={next.href} className="ui-btn ui-btn-primary flow-next-btn">
            {next.action} →
          </Link>
        </div>
      ) : (
        <div className="flow-next is-clear">
          <div>
            <p className="flow-next-kicker">Alles erledigt</p>
            <p className="flow-next-title">Gerade wartet nichts auf dich – der Rest läuft automatisch.</p>
          </div>
          <Link href="/admin/suche" className="ui-btn ui-btn-secondary flow-next-btn">
            Neue Betriebe suchen →
          </Link>
        </div>
      )}
      <ol className="flow-steps">
        {steps.map((s, i) => (
          <li key={s.key} className={`flow-step ${MODE[s.mode].tone} ${s.key === nextStep ? 'is-next' : ''}`}>
            <span className="flow-step-num">{i + 1}</span>
            <div className="flow-step-body">
              <div className="flow-step-head">
                <h2>{s.title}</h2>
                <span className="flow-step-mode">{MODE[s.mode].label}</span>
              </div>
              <p className="flow-step-hint">{s.hint}</p>
            </div>
            <div className="flow-step-side">
              <span className="flow-step-count">{num(s.count)}</span>
              {s.mode !== 'auto' || s.key === 'antworten' ? (
                <Link
                  href={s.href}
                  className={`ui-btn ${s.mode === 'du' && s.count > 0 ? 'ui-btn-primary' : 'ui-btn-secondary'}`}
                >
                  {s.action}
                </Link>
              ) : (
                <span className="flow-step-auto">✓ von selbst</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
