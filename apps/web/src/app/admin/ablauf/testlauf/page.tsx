import Link from 'next/link';
import { testRunStatus } from '@wbm/core';
import { SubmitButton } from '@/components/admin/submit-button';
import { Notice, PageHeader, btn } from '@/components/ui';
import { requireAdmin } from '@/lib/auth';
import { dt } from '@/lib/format';
import { startTestRunAction } from './actions';

export const metadata = { title: 'Testlauf' };
export const dynamic = 'force-dynamic';

export default async function TestRunPage() {
  await requireAdmin();
  const run = await testRunStatus();
  const waiting = run && run.stage === 'building';
  return (
    <>
      {/* Während die Demo entsteht, alle 10 Sekunden neu laden */}
      {waiting ? <meta httpEquiv="refresh" content="10" /> : null}
      <PageHeader
        title="Testlauf"
        subtitle="Ein erfundener Betrieb geht den ganzen Weg: Demo, QR-Code, Seite übernehmen, Bezahlen. Nichts davon ist echt – kein Brief, kein Geld."
      />
      {!run ? (
        <div className="check-card check-done">
          <p className="check-name">Probier den ganzen Ablauf aus</p>
          <p className="check-sub">Ich lege einen erfundenen Malerbetrieb an und baue ihm eine Demo.</p>
          <form action={startTestRunAction}>
            <SubmitButton className="ui-btn ui-btn-primary check-go">Testlauf starten</SubmitButton>
          </form>
        </div>
      ) : (
        <div className="check">
          <div className="check-card">
            <p className="check-name">{run.name}</p>
            <p className="check-sub">Gestartet {dt(new Date(run.startedAt))}</p>
            <ol className="testrun-steps">
              <li className={run.stage !== 'building' ? 'is-done' : 'is-now'}>
                <strong>1. Demo wird gebaut</strong>
                <span>{run.stage === 'building' ? 'Läuft … die Seite lädt sich alle 10 Sekunden neu.' : 'Fertig.'}</span>
              </li>
              <li className={run.stage === 'online' ? 'is-done' : run.stage === 'review' ? 'is-now' : ''}>
                <strong>2. Demo freigeben</strong>
                <span>
                  {run.stage === 'review' && run.demoId ? (
                    <Link className={btn.primary} href={`/admin/demos/${run.demoId}`}>
                      Demo ansehen und freigeben →
                    </Link>
                  ) : run.stage === 'online' ? (
                    'Freigegeben und online.'
                  ) : (
                    'Kommt nach Schritt 1.'
                  )}
                </span>
              </li>
              <li className={run.stage === 'online' ? 'is-now' : ''}>
                <strong>3. QR-Code mit dem Handy scannen</strong>
                <span>So wie der Betrieb es mit dem Brief machen würde.</span>
              </li>
            </ol>
            {run.stage === 'failed' ? (
              <Notice kind="warn">Das hat nicht geklappt ({run.note}). Starte einfach einen neuen Testlauf.</Notice>
            ) : null}
          </div>

          {run.stage === 'online' ? (
            <div className="check-card testrun-qr">
              <img src={run.qrImage} alt="QR-Code zur Test-Demo" width={240} height={240} />
              <div>
                <p className="check-q">Mit dem Handy scannen</p>
                <p className="check-sub">Oder direkt öffnen:</p>
                <p className="flex flex-wrap gap-2">
                  <a className={btn.primary} href={run.qrUrl} target="_blank" rel="noreferrer">
                    Wie nach dem Scan öffnen ↗
                  </a>
                  {run.letterId ? (
                    <Link className={btn.secondary} href={`/admin/letters/${run.letterId}`}>
                      Brief dazu ansehen
                    </Link>
                  ) : null}
                </p>
                <p className="check-note" style={{ textAlign: 'left' }}>
                  Auf der Demo: „Diese Website übernehmen“ → Tarif wählen → Test-Bezahlseite → „Bezahlt“. Das ist eine
                  Test-Zahlung, es fließt kein Geld.
                </p>
              </div>
            </div>
          ) : null}

          <form action={startTestRunAction}>
            <SubmitButton className={btn.secondary}>Neuen Testlauf starten</SubmitButton>
          </form>
        </div>
      )}
    </>
  );
}
