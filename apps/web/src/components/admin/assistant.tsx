'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { askAssistant, runAssistantAction, type AssistantAnswer } from '@/app/admin/assistant/actions';

type Msg =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      modus?: AssistantAnswer['modus'];
      hinweis?: string;
      aktionen: (AssistantAnswer['aktionen'][number] & { state?: 'running' | 'done' | 'failed'; result?: string })[];
    };

const STORE = 'sw-assistant-v1';
const SUGGESTIONS = [
  'Was läuft gerade?',
  'Starte die Suche in Dortmund ab 70 Punkten',
  'Was sind die nächsten Schritte?',
  'Wie viele Leads haben wir?',
];

const uid = () => Math.random().toString(36).slice(2, 10);

function load(): Msg[] {
  try {
    const raw = sessionStorage.getItem(STORE);
    return raw ? (JSON.parse(raw) as Msg[]).slice(-40) : [];
  } catch {
    return [];
  }
}

export function AdminAssistant({ aiOn }: { aiOn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    setMsgs(load());
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-40)));
    } catch {
      // ohne Speicher geht der Verlauf beim Neuladen verloren
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, pending]);

  // ⌘K / Strg+K öffnet, Esc schließt
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = (value: string) => {
    const q = value.trim();
    if (!q || pending) return;
    const next: Msg[] = [...msgs, { id: uid(), role: 'user', text: q }];
    setMsgs(next);
    setText('');
    start(async () => {
      try {
        const res = await askAssistant(next.map((m) => ({ role: m.role, text: m.text })));
        setMsgs((m) => [
          ...m,
          { id: uid(), role: 'assistant', text: res.antwort, modus: res.modus, hinweis: res.hinweis, aktionen: res.aktionen },
        ]);
      } catch {
        setMsgs((m) => [
          ...m,
          { id: uid(), role: 'assistant', text: 'Das hat gerade nicht geklappt. Bitte noch einmal versuchen.', aktionen: [] },
        ]);
      }
    });
  };

  const setAction = (msgId: string, idx: number, patch: { state?: 'running' | 'done' | 'failed'; result?: string }) =>
    setMsgs((all) =>
      all.map((m) =>
        m.id === msgId && m.role === 'assistant'
          ? { ...m, aktionen: m.aktionen.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }
          : m,
      ),
    );

  const run = async (msgId: string, idx: number, action: Msg & { role: 'assistant' }) => {
    const a = action.aktionen[idx]!;
    if (a.typ === 'seite_oeffnen') {
      setAction(msgId, idx, { state: 'done' });
      router.push(a.ziel);
      return;
    }
    setAction(msgId, idx, { state: 'running' });
    try {
      const { label: _label, state: _s, result: _r, ...payload } = a;
      const res = await runAssistantAction(payload);
      setAction(msgId, idx, { state: res.ok ? 'done' : 'failed', result: res.text });
      if (res.href) router.push(res.href);
      router.refresh();
    } catch {
      setAction(msgId, idx, { state: 'failed', result: 'Hat nicht geklappt – bitte erneut versuchen.' });
    }
  };

  return (
    <>
      <button
        type="button"
        className={`assistant-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="admin-assistant"
        title="Assistent (⌘K)"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l1.8 4.6L18.5 9l-4.7 1.5L12 15l-1.8-4.5L5.5 9l4.7-1.4zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9zM5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z" />
        </svg>
        <span>Assistent</span>
      </button>
      {mounted ? (
        <div className={`assistant-layer ${open ? 'is-open' : ''}`} inert={!open}>
          <button type="button" className="assistant-scrim" tabIndex={-1} aria-label="Schließen" onClick={() => setOpen(false)} />
          <section id="admin-assistant" className="assistant-panel" role="dialog" aria-label="Assistent" aria-modal="false">
            <header className="assistant-head">
              <div>
                <p className="assistant-title">Assistent</p>
                <p className="assistant-sub">
                  {aiOn ? 'KI-Modus · Aktionen nur nach deinem Klick' : 'Befehlsmodus ohne KI · Aktionen nur nach deinem Klick'}
                </p>
              </div>
              <div className="assistant-head-actions">
                {msgs.length ? (
                  <button type="button" className="assistant-icon" onClick={() => setMsgs([])} title="Verlauf leeren">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                    </svg>
                  </button>
                ) : null}
                <button type="button" className="assistant-icon" onClick={() => setOpen(false)} title="Schließen (Esc)">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </header>

            <div className="assistant-list" ref={listRef}>
              {!msgs.length ? (
                <div className="assistant-empty">
                  <p className="assistant-empty-title">Hi! Was soll ich für dich tun?</p>
                  <p>
                    Ich kenne den Stand deiner Verwaltung, starte und stoppe Lead-Suchen, stelle die Mindest-Punkte ein und bringe
                    dich zur richtigen Seite. Briefe, Zahlungen und Freigaben bleiben bei dir.
                  </p>
                  {!aiOn ? (
                    <p className="assistant-empty-note">
                      Freie Fragen versteht der KI-Modus besser. Einschalten unter System → Einstellungen → Support (nutzt den
                      Anthropic-Schlüssel).
                    </p>
                  ) : null}
                </div>
              ) : null}
              {msgs.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="assistant-msg is-user">
                    {m.text}
                  </div>
                ) : (
                  <div key={m.id} className="assistant-msg is-bot">
                    <p className="whitespace-pre-line">{m.text}</p>
                    {m.hinweis ? <p className="assistant-hint">{m.hinweis}</p> : null}
                    {m.aktionen.map((a, i) => (
                      <div key={i} className={`assistant-action ${a.state ? `is-${a.state}` : ''}`}>
                        <span className="assistant-action-label">{a.label}</span>
                        {a.state === 'done' ? (
                          <span className="assistant-action-done">✓ {a.result || 'Erledigt'}</span>
                        ) : a.state === 'failed' ? (
                          <span className="assistant-action-failed">{a.result}</span>
                        ) : (
                          <button
                            type="button"
                            className="ui-btn ui-btn-primary assistant-action-btn"
                            disabled={a.state === 'running'}
                            onClick={() => run(m.id, i, m)}
                          >
                            {a.state === 'running' ? <span className="assistant-spinner" /> : null}
                            {a.typ === 'seite_oeffnen' ? 'Öffnen' : 'Ausführen'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ),
              )}
              {pending ? (
                <div className="assistant-msg is-bot assistant-typing" aria-label="Assistent schreibt">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
            </div>

            <div className="assistant-suggest">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} disabled={pending}>
                  {s}
                </button>
              ))}
            </div>
            <form
              className="assistant-form"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={text}
                placeholder="Schreib, was du brauchst …"
                aria-label="Nachricht an den Assistenten"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(text);
                  }
                }}
              />
              <button type="submit" className="assistant-send" disabled={!text.trim() || pending} aria-label="Senden">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
