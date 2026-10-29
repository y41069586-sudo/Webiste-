import { AsyncLocalStorage } from 'node:async_hooks';
import { getSetting, setSetting } from '../config/service';
import { getDb } from '../db/client';
import { logger } from '../logger';

/**
 * Live-Fortschritt langer Jobs (zuerst die Lead-Suche). Der Worker schreibt höchstens etwa einmal pro Sekunde einen
 * kleinen Datensatz in `settings`; die Verwaltung fragt ihn ab. Keine personenbezogenen Daten: das Protokoll nennt nur
 * Betriebsnamen aus der Quelle und das Ergebnis der Prüfung.
 */
export type SearchPhase = 'start' | 'karte_laden' | 'karte_auswerten' | 'suchen' | 'pruefen' | 'fertig' | 'gestoppt' | 'fehler';

export interface SearchLogEntry {
  at: string;
  name: string;
  outcome: 'geeignet' | 'pruefen' | 'unter_schwelle' | 'aussortiert' | 'uebersprungen';
  detail?: string;
  score?: number;
}

export interface SearchProgress {
  runId: string;
  phase: SearchPhase;
  /** Gesamtfortschritt 0–100 */
  percent: number;
  /** Was gerade passiert, in Klartext */
  label: string;
  startedAt: string;
  updatedAt: string;
  phaseStartedAt: string;
  cities: string[];
  branches: string[];
  minScore: number;
  /** Fortschritt innerhalb der Phase */
  step: { done: number; total: number };
  bytes?: { done: number; total: number | null };
  counts: { found: number; checked: number; qualified: number; needsReview: number; belowMin: number; rejected: number };
  log: SearchLogEntry[];
  error?: string;
}

export const SEARCH_PROGRESS_KEY = 'progress:find-leads';
export const SEARCH_STOP_KEY = 'progress:find-leads:stop';

const LOG_MAX = 12;

/** Gewichtung der Phasen am Gesamtbalken: mit Kartenaufbau bzw. mit vorhandener Karte */
const WEIGHTS_WITH_MAP: Record<'karte_laden' | 'karte_auswerten' | 'suchen' | 'pruefen', [number, number]> = {
  karte_laden: [0, 35],
  karte_auswerten: [35, 50],
  suchen: [50, 55],
  pruefen: [55, 100],
};
const WEIGHTS_NO_MAP = { karte_laden: [0, 0], karte_auswerten: [0, 0], suchen: [0, 10], pruefen: [10, 100] } as const;

export class SearchProgressReporter {
  readonly state: SearchProgress;
  private mapBuilt = false;
  private lastWrite = 0;
  private pending?: Promise<void>;
  private lastStopCheck = 0;
  private stopped = false;

  constructor(init: { runId: string; cities: string[]; branches: string[]; minScore: number }) {
    const now = new Date().toISOString();
    this.state = {
      ...init,
      phase: 'start',
      percent: 0,
      label: 'Suche wird vorbereitet …',
      startedAt: now,
      updatedAt: now,
      phaseStartedAt: now,
      step: { done: 0, total: 0 },
      counts: { found: 0, checked: 0, qualified: 0, needsReview: 0, belowMin: 0, rejected: 0 },
      log: [],
    };
  }

  private recompute() {
    const p = this.state.phase;
    if (p === 'fertig') this.state.percent = 100;
    else if (p === 'karte_laden' || p === 'karte_auswerten' || p === 'suchen' || p === 'pruefen') {
      const [from, to] = (this.mapBuilt ? WEIGHTS_WITH_MAP : WEIGHTS_NO_MAP)[p];
      const frac =
        p === 'karte_laden' && this.state.bytes?.total
          ? this.state.bytes.done / this.state.bytes.total
          : this.state.step.total
            ? this.state.step.done / this.state.step.total
            : 0;
      this.state.percent = Math.max(this.state.percent, Math.round(from + (to - from) * Math.min(1, frac)));
    }
  }

  phase(phase: SearchPhase, label: string, total = 0) {
    if (phase === 'karte_laden' || phase === 'karte_auswerten') this.mapBuilt = true;
    this.state.phase = phase;
    this.state.label = label;
    this.state.phaseStartedAt = new Date().toISOString();
    this.state.step = { done: 0, total };
    if (phase !== 'karte_laden') delete this.state.bytes;
    this.recompute();
    this.flush(true);
  }

  step(done: number, label?: string) {
    this.state.step.done = done;
    if (label) this.state.label = label;
    this.recompute();
    this.flush();
  }

  bytes(done: number, total: number | null) {
    this.state.bytes = { done, total };
    const mb = (n: number) => Math.round(n / 1_048_576);
    this.state.label = total
      ? `NRW-Karte wird geladen: ${mb(done)} von ${mb(total)} MB`
      : `NRW-Karte wird geladen: ${mb(done)} MB`;
    this.recompute();
    this.flush();
  }

  log(entry: Omit<SearchLogEntry, 'at'>) {
    this.state.log.unshift({ ...entry, at: new Date().toISOString() });
    if (this.state.log.length > LOG_MAX) this.state.log.length = LOG_MAX;
  }

  finish(phase: 'fertig' | 'gestoppt' | 'fehler', label: string, error?: string) {
    this.state.phase = phase;
    this.state.label = label;
    if (phase === 'fertig') this.state.percent = 100;
    if (error) this.state.error = error.slice(0, 300);
    return this.flush(true);
  }

  /** Schreibt gedrosselt (≤ 1×/s); `force` schreibt sofort. Schreibfehler stoppen die Suche nie. */
  flush(force = false): Promise<void> {
    const now = Date.now();
    if (!force && now - this.lastWrite < 1000) return this.pending ?? Promise.resolve();
    this.lastWrite = now;
    this.state.updatedAt = new Date(now).toISOString();
    const snapshot = structuredClone(this.state);
    const write = (this.pending ?? Promise.resolve())
      .then(() => setSetting(SEARCH_PROGRESS_KEY, snapshot, 'job:find-leads'))
      .catch((err) => logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'fortschritt nicht gespeichert'));
    this.pending = write;
    return write;
  }

  /** Stopp-Wunsch aus der Verwaltung (höchstens alle 2 s abgefragt) */
  async shouldStop(): Promise<boolean> {
    if (this.stopped) return true;
    const now = Date.now();
    if (now - this.lastStopCheck < 2000) return false;
    this.lastStopCheck = now;
    const v = await getSetting<{ runId?: string } | null>(SEARCH_STOP_KEY, null).catch(() => null);
    this.stopped = Boolean(v && v.runId === this.state.runId);
    return this.stopped;
  }
}

const current = new AsyncLocalStorage<SearchProgressReporter>();

export function runWithProgress<T>(reporter: SearchProgressReporter, fn: () => Promise<T>): Promise<T> {
  return current.run(reporter, fn);
}

/** Der Reporter des laufenden Jobs (z. B. für den Kartenaufbau in der Lead-Quelle) */
export function activeProgress(): SearchProgressReporter | undefined {
  return current.getStore();
}

export async function readSearchProgress(): Promise<SearchProgress | null> {
  return getSetting<SearchProgress | null>(SEARCH_PROGRESS_KEY, null, getDb());
}

export async function requestSearchStop(runId: string, actor: string): Promise<void> {
  await setSetting(SEARCH_STOP_KEY, { runId, at: new Date().toISOString() }, actor);
}
