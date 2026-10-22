import { effectiveSwitches, getConfig } from '@wbm/core';
import { Card, Notice, PageHeader, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { saveSection, toggleSwitch } from './actions';
import { getPath, SECTIONS, SWITCHES } from './fields';
import { SectionForm } from './section-form';

export const metadata = { title: 'Einstellungen' };

export default async function SettingsPage() {
  await requireAdmin();
  const cfg = await getConfig({ fresh: true });
  const sw = effectiveSwitches(cfg);
  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Alle Werte werden validiert und im Audit-Log protokolliert." />

      <Card title="Not-Aus" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-slate-700">
            Stoppt sofort alle Jobs mit Kostenfolge (Places-Suche, KI, Briefversand, Domainkauf). Laufende Jobs prüfen den Schalter vor
            jeder kostenpflichtigen Aktion.
          </p>
          <form action={toggleSwitch}>
            <input type="hidden" name="key" value="killSwitch" />
            <input type="hidden" name="value" value={String(!sw.killSwitch)} />
            <button type="submit" className={sw.killSwitch ? btn.secondary : btn.danger}>
              {sw.killSwitch ? 'Not-Aus aufheben' : 'NOT-AUS auslösen'}
            </button>
          </form>
        </div>
      </Card>

      <Card title="Schalter" className="mb-6">
        {sw.dryRunLockedByEnv ? (
          <div className="mb-4">
            <Notice kind="warn">
              DRY_RUN ist in der Umgebung (.env) gesetzt und kann hier nicht abgeschaltet werden. Zum Livegang erst in .env
              <code className="mx-1">DRY_RUN=false</code> setzen (nur nach ausdrücklicher Freigabe).
            </Notice>
          </div>
        ) : null}
        <ul className="divide-y divide-slate-100">
          {SWITCHES.map((s) => {
            const value = Boolean((cfg.switches as Record<string, boolean>)[s.key]);
            const effective = s.key === 'dryRun' ? sw.dryRun : value;
            return (
              <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-mono text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-slate-500">{s.hint}</div>
                </div>
                <form action={toggleSwitch} className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${effective ? 'text-emerald-700' : 'text-slate-500'}`}>{effective ? 'AN' : 'AUS'}</span>
                  <input type="hidden" name="key" value={s.key} />
                  <input type="hidden" name="value" value={String(!value)} />
                  <button type="submit" className={btn.secondary} disabled={s.key === 'dryRun' && sw.dryRunLockedByEnv}>
                    {value ? 'Ausschalten' : 'Einschalten'}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <Card key={section.id} title={section.title}>
            {section.description ? <p className="mb-4 text-sm text-slate-600">{section.description}</p> : null}
            <SectionForm
              fields={section.fields.map((f) => ({ ...f, value: getPath(cfg, f.path) }))}
              action={saveSection.bind(null, section.id)}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
