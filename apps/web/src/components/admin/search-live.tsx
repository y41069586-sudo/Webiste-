'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { SubmitButton } from '@/components/admin/submit-button';
import type { LeadSearchStatus } from '@/lib/lead-search';

type Progress = NonNullable<LeadSearchStatus['progress']>;

const STEPS: { key: Progress['phase'][]; label: string }[] = [
  { key: ['start'], label: 'Start' },
  { key: ['karte_laden', 'karte_auswerten'], label: 'Vorbereiten' },
  { key: ['suchen'], label: 'Suchen' },
  { key: ['pruefen'], label: 'Prüfen' },
  { key: ['fertig', 'gestoppt', 'fehler'], label: 'Fertig' },
];

const OUTCOME: Record<Progress['log'][number]['outcome'], { label: string; tone: string }> = {
  geeignet: { label: 'Übernommen', tone: 'is-good' },
  pruefen: { label: 'Zur Prüfung', tone: 'is-good' },
  unter_schwelle: { label: 'Zu wenig Punkte', tone: 'is-low' },
  aussortiert: { label: 'Aussortiert', tone: 'is-out' },
  uebersprungen: { label: 'Schon bekannt', tone: 'is-skip' },
};

function duration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} Sek.`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} Min. ${s % 60 ? `${s % 60} Sek.` : ''}`.trim();
  return `${Math.floor(m / 60)} Std. ${m % 60} Min.`;
}

/** Restzeit aus dem Tempo der laufenden Phase (nur beim Prüfen und Kartenladen belastbar) */
function remaining(p: Progress, now: number): string | null {
  const elapsed = now - Date.parse(p.phaseStartedAt);
  if (elapsed < 5000) return null;
  let frac = 0;
  if (p.phase === 'pruefen' && p.step.total) frac = p.step.done / p.step.total;
  else if (p.phase === 'karte_laden' && p.bytes?.total) frac = p.bytes.done / p.bytes.total;
  if (frac <= 0.02 || frac >= 1) return null;
  return duration((elapsed / frac) * (1 - frac));
}

export function SearchLive({ initial, stop }: { initial: LeadSearchStatus; stop: () => Promise<void> }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);
  const [now, setNow] = useState(() => Date.parse(initial.now));
  const wasRunning = useRef(initial.active + initial.waiting > 0);
  const running = status.active + status.waiting > 0;

  // Abfragen: alle 1,5 s während der Suche, sonst alle 15 s (falls woanders gestartet)
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const res = await fetch('/api/admin/lead-search', { cache: 'no-store' });
        if (res.ok && !stop) {
          const next = (await res.json()) as LeadSearchStatus;
          setStatus(next);
          const nowRunning = next.active + next.waiting > 0;
          // Suche gerade beendet: Kennzahlen der Seite neu laden
          if (wasRunning.current && !nowRunning) router.refresh();
          wasRunning.current = nowRunning;
        }
      } catch {
        // Netzwerk kurz weg: beim nächsten Takt erneut
      }
      if (!stop) timer = setTimeout(load, wasRunning.current ? 1500 : 15000);
    };
    timer = setTimeout(load, running ? 1500 : 15000);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [initial]);

  useEffect(() => {
    setStatus(initial);
    wasRunning.current = initial.active + initial.waiting > 0;
  }, [initial]);

  // Uhr für Laufzeit und „letzte Meldung vor …“
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const p = status.progress;
  const recent = p && now - Date.parse(p.updatedAt) < 6 * 3600_000;
  if (!running && !recent) return null;

  const live = running && p && !['fertig', 'gestoppt', 'fehler'].includes(p.phase);
  // Auftrag eingereiht oder gerade abgeholt, aber noch ohne eigene Meldung (alte Meldung stammt vom letzten Lauf)
  const waitingForWorker = running && (!p || !live);
  const silentMs = p ? now - Date.parse(p.updatedAt) : 0;
  const silent = live && silentMs > 90_000;
  const phaseIndex = p ? STEPS.findIndex((s) => s.key.includes(p.phase)) : 0;
  const percent = waitingForWorker ? 0 : (p?.percent ?? 0);
  const eta = live && p ? remaining(p, now) : null;
  const tone = p?.phase === 'fehler' ? 'is-error' : p?.phase === 'gestoppt' ? 'is-stopped' : live ? 'is-live' : 'is-done';

  // Fertig: nur das Ergebnis und der nächste Schritt – Einzelheiten zum Aufklappen
  if (!running && p) {
    const taken = p.counts.qualified + p.counts.needsReview;
    return (
      <section className={`search-live search-live-compact ${tone}`} aria-live="polite">
        <div className="search-live-head">
          <div>
            <p className="search-live-kicker">
              {p.phase === 'fertig' ? 'Suche fertig' : p.phase === 'gestoppt' ? 'Suche gestoppt' : 'Suche abgebrochen'} ·{' '}
              {p.cities.join(', ')}
            </p>
            <h2 className="search-live-title">
              {p.phase === 'fehler'
                ? 'Das hat nicht geklappt – starte die Suche einfach noch einmal.'
                : taken === 1
                  ? '1 passender Betrieb gefunden'
                  : `${taken} passende Betriebe gefunden`}
            </h2>
          </div>
          {taken > 0 ? (
            <a href="/admin/ablauf/pruefen" className="ui-btn ui-btn-primary">
              Jetzt prüfen →
            </a>
          ) : null}
        </div>
        {p.log.length ? (
          <details className="admin-details mt-3">
            <summary>Einzelheiten</summary>
            <p className="mt-2 text-sm text-slate-600">
              {p.counts.found} Treffer · {taken} übernommen · {p.counts.belowMin} mit zu wenig Punkten · {p.counts.rejected}{' '}
              aussortiert (z. B. hat schon eine Website)
            </p>
            <ul className="search-live-log mt-2">
              {p.log.map((e) => (
                <li key={`${e.at}-${e.name}`}>
                  <span className={`search-live-tag ${OUTCOME[e.outcome].tone}`}>{OUTCOME[e.outcome].label}</span>
                  <span className="search-live-name">{e.name}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        {p.error ? <p className="search-live-warn">Fehler: {p.error}</p> : null}
      </section>
    );
  }

  return (
    <section className={`search-live ${tone}`} aria-live="polite">
      <div className="search-live-head">
        <div>
          <p className="search-live-kicker">
            {waitingForWorker ? (
              <>
                <span className="search-live-dot" /> {status.active ? 'Suche startet' : 'Wartet auf den Server'}
              </>
            ) : live ? (
              <>
                <span className="search-live-dot" /> Suche läuft
              </>
            ) : p?.phase === 'fertig' ? (
              'Letzte Suche abgeschlossen'
            ) : p?.phase === 'gestoppt' ? (
              'Suche gestoppt'
            ) : (
              'Suche abgebrochen'
            )}
          </p>
          <h2 className="search-live-title">
            {waitingForWorker
              ? status.active
                ? 'Der Server bereitet die Suche vor …'
                : 'Der Auftrag liegt bereit, der Server holt ihn gleich ab …'
              : (p?.label ?? '…')}
          </h2>
          {p && !waitingForWorker ? (
            <p className="search-live-meta">
              {p.cities.join(', ')} · ab {p.minScore} Punkten · Laufzeit{' '}
              {duration((live ? now : Date.parse(p.updatedAt)) - Date.parse(p.startedAt))}
              {eta ? ` · noch ca. ${eta}` : ''}
            </p>
          ) : null}
        </div>
        <div className="search-live-side">
          <div className="search-live-percent">{percent}%</div>
          {running ? (
            <form action={stop}>
              <SubmitButton className="ui-btn ui-btn-secondary search-live-stop">Suche stoppen</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <div
        className={`search-live-bar ${live && (p?.phase === 'karte_auswerten' || p?.phase === 'start') ? 'is-indeterminate' : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Fortschritt der Lead-Suche"
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <ol className="search-live-steps">
        {STEPS.map((s, i) => (
          <li
            key={s.label}
            className={i < phaseIndex || (i === phaseIndex && !live) ? 'is-done' : i === phaseIndex ? 'is-current' : ''}
          >
            <span className="search-live-step-dot">{i < phaseIndex || (i === phaseIndex && !live) ? '✓' : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {silent ? (
        <p className="search-live-warn">
          Seit {duration(silentMs)} keine Meldung vom Server.{' '}
          {status.workerSeenAt && now - Date.parse(status.workerSeenAt) > 15 * 60_000
            ? 'Der Server hat sich länger nicht gemeldet – in Termius prüfen, ob er läuft.'
            : 'Er arbeitet vermutlich an einem großen Schritt.'}
        </p>
      ) : null}
      {waitingForWorker && status.workerSeenAt && now - Date.parse(status.workerSeenAt) > 15 * 60_000 ? (
        <p className="search-live-warn">
          Der Server hat sich seit {duration(now - Date.parse(status.workerSeenAt))} nicht gemeldet – in Termius prüfen, ob er
          läuft.
        </p>
      ) : null}

      {p && !waitingForWorker ? (
        <div className="search-live-counts">
          <div>
            <strong>{p.counts.found}</strong>
            <span>Treffer</span>
          </div>
          <div>
            <strong>
              {p.counts.checked}
              {p.step.total && p.phase === 'pruefen' ? <small>/{p.step.total}</small> : null}
            </strong>
            <span>geprüft</span>
          </div>
          <div className="is-good">
            <strong>{p.counts.qualified + p.counts.needsReview}</strong>
            <span>übernommen</span>
          </div>
          <div className="is-low">
            <strong>{p.counts.belowMin}</strong>
            <span>zu wenig Punkte</span>
          </div>
          <div>
            <strong>{p.counts.rejected}</strong>
            <span>aussortiert</span>
          </div>
        </div>
      ) : null}

      {p?.log.length && !waitingForWorker ? (
        <div className="search-live-log">
          <p className="search-live-log-title">Zuletzt geprüft</p>
          <ul>
            {p.log.map((e) => (
              <li key={`${e.at}-${e.name}`}>
                <span className={`search-live-tag ${OUTCOME[e.outcome].tone}`}>{OUTCOME[e.outcome].label}</span>
                <span className="search-live-name">{e.name}</span>
                <span className="search-live-detail">
                  {e.score !== undefined && e.outcome !== 'unter_schwelle' ? `${e.score} Punkte` : (e.detail ?? '')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {p?.error ? <p className="search-live-warn">Fehler: {p.error}</p> : null}
    </section>
  );
}
