import Link from 'next/link';
import { effectiveSwitches, formatEuroShort, getConfig, v4FirstYearCents, v4Offer, type AppConfig } from '@wbm/core';
import { Card, Notice, PageHeader, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { saveSection, toggleSwitch } from './actions';
import { getPath, SECTIONS, SWITCHES } from './fields';
import { SectionForm } from './section-form';
import { AdoptLegalForm } from './adopt-legal-form';
import { WorkerBootstrapForm } from './worker-bootstrap-form';
import { settingsTodos } from './todos';

export const metadata = { title: 'Einstellungen' };

interface Tab {
  id: string;
  label: string;
  sections?: string[];
}

function tabs(cfg: AppConfig): Tab[] {
  const v4 = cfg.offers.activeVersion === 'v4';
  return [
    { id: 'start', label: 'Überblick' },
    { id: 'sender', label: 'Absender & Impressum', sections: ['sender'] },
    { id: 'letter', label: 'Brief & Versand', sections: ['letter'] },
    { id: 'targeting', label: 'Städte & Branchen', sections: ['targeting'] },
    { id: 'leads', label: 'Lead-Suche', sections: ['leadsource', 'leadScoring'] },
    { id: 'money', label: v4 ? 'Steuern & Checkout' : 'Preise & Steuern', sections: [v4 ? 'taxCheckout' : 'pricing'] },
    { id: 'budget', label: 'Budget', sections: ['budget'] },
    { id: 'timing', label: 'Fristen & Review', sections: ['timing'] },
    { id: 'metrics', label: 'Messung', sections: ['metrics'] },
    { id: 'support', label: 'Support & Optimizer', sections: ['support'] },
    { id: 'legal', label: 'Rechtstexte', sections: ['legal'] },
    { id: 'server', label: 'Worker-Server' },
  ];
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ bereich?: string }> }) {
  await requireAdmin();
  const [{ bereich }, cfg] = await Promise.all([searchParams, getConfig({ fresh: true })]);
  const all = tabs(cfg);
  const tab = all.find((t) => t.id === bereich) ?? all[0]!;
  const todos = settingsTodos(cfg);
  const open = new Set(todos.map((t) => t.tab));
  const sw = effectiveSwitches(cfg);

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Nach Bereichen sortiert. Jede Änderung wird geprüft und protokolliert." />

      <nav aria-label="Bereiche der Einstellungen" className="admin-tabs">
        {all.map((t) => (
          <Link
            key={t.id}
            href={t.id === 'start' ? '/admin/settings' : `/admin/settings?bereich=${t.id}`}
            aria-current={t.id === tab.id ? 'page' : undefined}
            className={`admin-tab ${t.id === tab.id ? 'is-active' : ''}`}
          >
            {t.label}
            {open.has(t.id) ? <span className="admin-tab-dot" title="Hier fehlt noch etwas" /> : null}
          </Link>
        ))}
      </nav>

      {tab.id === 'start' ? (
        <div className="space-y-6">
          <Card title={todos.length ? `Noch offen (${todos.length})` : 'Alles eingetragen'}>
            {todos.length ? (
              <ul className="admin-todo-list">
                {todos.map((t) => (
                  <li key={t.label}>
                    <span className="admin-todo-mark" aria-hidden="true" />
                    <span className="flex-1">{t.label}</span>
                    <Link href={`/admin/settings?bereich=${t.tab}`} className="admin-todo-link">
                      {all.find((x) => x.id === t.tab)?.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">Alle Pflichtangaben für Briefe und Verkauf sind eingetragen.</p>
            )}
          </Card>

          <Card title="Not-Aus">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-sm text-slate-700">
                Stoppt sofort alle Jobs mit Kostenfolge (Lead-Suche, KI, Briefversand, Domainkauf). Laufende Jobs prüfen den
                Schalter vor jeder kostenpflichtigen Aktion.
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

          <Card title="Schalter">
            {sw.dryRunLockedByEnv ? (
              <div className="mb-4">
                <Notice kind="warn">
                  Testmodus (DRY_RUN) ist in der Server-Umgebung fest eingeschaltet und kann hier nicht abgeschaltet werden.
                </Notice>
              </div>
            ) : null}
            <ul className="divide-y divide-slate-100">
              {SWITCHES.map((s) => {
                const value = Boolean((cfg.switches as Record<string, boolean>)[s.key]);
                const effective = s.key === 'dryRun' ? sw.dryRun : value;
                return (
                  <li key={s.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-slate-500">{s.hint}</div>
                    </div>
                    <form action={toggleSwitch} className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${effective ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {effective ? 'AN' : 'AUS'}
                      </span>
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

          {cfg.offers.activeVersion === 'v4' ? (
            <Card title="Neukundentarife V4">
              <div className="grid gap-4 sm:grid-cols-2">
                {(['basis', 'care_plus'] as const).map((tier) => (
                  <div key={tier}>
                    <h2 className="font-semibold">{tier === 'basis' ? 'Basis' : 'Care+'}</h2>
                    <p>
                      {formatEuroShort(v4Offer(tier).setupCents)} einmalig + {formatEuroShort(v4Offer(tier).monthlyCents)}
                      /Monat insgesamt ab Go-Live
                    </p>
                    <p className="text-sm text-slate-500">
                      Erstes volles Betriebsjahr: {formatEuroShort(v4FirstYearCents(tier))}. Monatlich kündbar; Bestandsverträge
                      bleiben unverändert.
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {tab.id === 'legal' ? (
        <Card title="Rechtstexte übernehmen" className="mb-6">
          <AdoptLegalForm adopted={Boolean(cfg.legal.termsMarkdown.trim())} />
        </Card>
      ) : null}

      {tab.id === 'server' ? (
        <Card title="Worker-Server einrichten">
          <WorkerBootstrapForm />
        </Card>
      ) : null}

      {tab.sections ? (
        <div className="space-y-6">
          {tab.sections.map((id) => {
            const section = SECTIONS.find((s) => s.id === id)!;
            return (
              <Card key={section.id} title={section.title}>
                {section.description ? <p className="mb-4 text-sm text-slate-600">{section.description}</p> : null}
                <SectionForm
                  fields={section.fields.map((f) => ({ ...f, value: getPath(cfg, f.path) }))}
                  action={saveSection.bind(null, section.id)}
                />
              </Card>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
