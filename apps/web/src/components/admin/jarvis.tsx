'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { askAssistant, runAssistantAction, type AssistantAnswer } from '@/app/admin/assistant/actions';

/**
 * Jarvis: Sprachsteuerung für den Assistenten. Hört auf „Jarvis“ bzw. „Sers Jarvis“, begrüßt mit „Sers …“,
 * beantwortet Fragen mit Stimme und führt vorgeschlagene Aktionen erst nach einem gesprochenen „Ja“ aus.
 * Alles läuft über dieselben Server-Aktionen wie der Text-Assistent (gleiche Rechte, gleiche Sperren).
 * Spracherkennung und Stimme kommen vom Browser (Web Speech API); Audio verlässt das Gerät nur über dessen Dienst.
 */

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking' | 'confirm';
type Turn = { role: 'user' | 'assistant'; text: string };
type Action = AssistantAnswer['aktionen'][number];

interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

const WAKE = /(?:^|\s)(?:sers|servus|hey|hallo|hi|okay|ok)?[\s,]*jarvis\b[\s,.!?]*(.*)$/i;
const YES = /^(ja|jo|jep|jawohl|klar|okay|ok|mach|mach das|mach es|los|bitte|gerne|passt|genau)\b/i;
const NO = /^(nein|nee|ne|stopp|stop|abbrechen|lass|nicht)\b/i;
/** Männliche deutsche Stimmen, die auf iPad/iPhone, Mac und in Chrome vorkommen */
const MALE =
  /(martin|markus|yannick|viktor|helmut|stefan|hans|thomas|daniel|ralf|klaus|reed|eddy|rocko|grandpa|conrad|killian|florian|bernd)/i;
/** Kurze Stille zum Freischalten der Audio-Wiedergabe beim ersten Tippen */
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const VOICE_KEY = 'sw-jarvis-voice';
const WAKE_KEY = 'sw-jarvis-wake';

function plain(text: string): string {
  return text
    .replace(/\*\*|__|`|#+\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

function store(key: string, value?: string): string | null {
  try {
    if (value !== undefined) localStorage.setItem(key, value);
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function Jarvis({
  name,
  enabled,
  aiOn,
  naturalVoice,
}: {
  name: string;
  enabled: boolean;
  aiOn: boolean;
  /** OpenAI-Stimme eingerichtet (sonst Browser-Stimme) */
  naturalVoice: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [heard, setHeard] = useState('');
  const [answer, setAnswer] = useState('');
  const [wake, setWake] = useState(false);
  const [supported, setSupported] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState('');
  const rec = useRef<Recognition | null>(null);
  const history = useRef<Turn[]>([]);
  const pending = useRef<Action | null>(null);
  const phaseRef = useRef<Phase>('idle');
  const wakeRef = useRef(false);
  const conversing = useRef(false);
  const followUp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRef = useRef<(text: string) => void>(() => {});
  /** Laufende Äußerungen festhalten (Browser brechen sonst mitten im Satz ab) */
  const utterances = useRef<SpeechSynthesisUtterance[]>([]);
  const speakToken = useRef(0);
  /** Wiederverwendetes Audio-Element: auf dem iPad nach der ersten Berührung freigeschaltet */
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setP = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // Stimmen laden (kommen in manchen Browsern verzögert)
  useEffect(() => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor })
        .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;
    setSupported(Boolean(Ctor) && 'speechSynthesis' in window);
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => setVoices(speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('de')));
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    setVoiceName(store(VOICE_KEY) ?? '');
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const pickVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    return voices.find((v) => v.name === voiceName) ?? voices.find((v) => MALE.test(v.name)) ?? voices[0];
  }, [voices, voiceName]);

  const stopListening = () => {
    try {
      rec.current?.abort();
    } catch {
      // schon beendet
    }
    rec.current = null;
  };

  const listen = useCallback((continuous: boolean) => {
    const Ctor =
      (window as unknown as { SpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition;
    if (!Ctor) return;
    stopListening();
    const r = new Ctor();
    r.lang = 'de-DE';
    r.continuous = continuous;
    r.interimResults = true;
    r.onresult = (e) => {
      let finalText = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim && phaseRef.current !== 'idle') setHeard(interim.trim());
      if (finalText.trim()) handleRef.current(finalText.trim());
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        wakeRef.current = false;
        setWake(false);
        setAnswer('Ich darf das Mikrofon nicht benutzen. Bitte in den Browser-Einstellungen erlauben.');
      }
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      // Im Dauer-Modus nach jeder Pause neu starten (außer während Jarvis spricht oder nachdenkt)
      if (wakeRef.current && phaseRef.current !== 'speaking' && phaseRef.current !== 'thinking')
        setTimeout(() => {
          if (!rec.current && wakeRef.current) listen(true);
        }, 350);
      else if (phaseRef.current === 'listening' || phaseRef.current === 'confirm') setP('idle');
    };
    rec.current = r;
    try {
      r.start();
    } catch {
      rec.current = null;
    }
  }, []);

  /**
   * Sprechen; danach je nach Lage weiter zuhören. Robust gegen die bekannten Safari/iPad-Fehler:
   * - Mikrofon erst schließen, kurz warten, dann sprechen (sonst bleibt die Ausgabe stumm)
   * - Satzweise vorlesen und jede Äußerung festhalten (sonst bricht der Browser lange Texte ab)
   * - Wächter, falls „Ende“ nie kommt; einmal ohne gewählte Stimme wiederholen, wenn sie nicht geht
   */
  const say = useCallback(
    (text: string, then: 'listen' | 'confirm' | 'idle' = 'listen') => {
      const t = plain(text);
      setAnswer(t);
      stopListening();
      const token = ++speakToken.current;
      const after = () => {
        if (token !== speakToken.current) return;
        if (then === 'idle') {
          setP('idle');
          if (wakeRef.current) setTimeout(() => listen(true), 250);
          return;
        }
        setP(then === 'confirm' ? 'confirm' : 'listening');
        conversing.current = true;
        if (followUp.current) clearTimeout(followUp.current);
        // Nach einer Antwort 10 Sekunden ohne Weckwort weiterreden können
        followUp.current = setTimeout(() => {
          conversing.current = false;
          if (phaseRef.current === 'listening') setP('idle');
        }, 10_000);
        // Kurze Pause, damit das iPad vom Lautsprecher zurück aufs Mikrofon wechseln kann
        setTimeout(() => {
          if (token === speakToken.current) listen(wakeRef.current);
        }, 250);
      };
      if (!enabled || !t) return after();
      setP('speaking');
      // Natürliche Stimme (OpenAI) zuerst; bei Fehler die Stimme des Browsers
      if (naturalVoice) {
        void (async () => {
          try {
            const res = await fetch('/api/admin/tts', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ text: t }),
            });
            if (!res.ok) throw new Error(String(res.status));
            const url = URL.createObjectURL(await res.blob());
            if (token !== speakToken.current) return URL.revokeObjectURL(url);
            const audio = audioRef.current ?? new Audio();
            audioRef.current = audio;
            audio.onended = () => {
              URL.revokeObjectURL(url);
              after();
            };
            audio.onerror = () => {
              URL.revokeObjectURL(url);
              if (token === speakToken.current) browserSpeak();
            };
            audio.src = url;
            await audio.play();
          } catch {
            if (token === speakToken.current) browserSpeak();
          }
        })();
        return;
      }
      browserSpeak();
      function browserSpeak() {
        if (!('speechSynthesis' in window)) return after();
        const parts = (t.match(/[^.!?]+[.!?]*/g) ?? [t]).map((x) => x.trim()).filter(Boolean);
        const voice = pickVoice();
        let index = 0;
        let plainVoice = false;
        let watchdog: ReturnType<typeof setTimeout> | undefined;
        const keepAlive = setInterval(() => {
          if (speechSynthesis.paused) speechSynthesis.resume();
        }, 4000);
        const done = () => {
          clearInterval(keepAlive);
          clearTimeout(watchdog);
          utterances.current = [];
          after();
        };
        const next = () => {
          if (token !== speakToken.current) {
            clearInterval(keepAlive);
            clearTimeout(watchdog);
            return;
          }
          if (index >= parts.length) return done();
          const part = parts[index]!;
          const u = new SpeechSynthesisUtterance(part);
          if (voice && !plainVoice) u.voice = voice;
          u.lang = (!plainVoice && voice?.lang) || 'de-DE';
          u.rate = 1;
          u.pitch = 1;
          let finished = false;
          const advance = () => {
            if (finished) return;
            finished = true;
            index++;
            next();
          };
          u.onend = advance;
          u.onerror = (e) => {
            if (finished) return;
            // Gewählte Stimme geht nicht (z. B. nicht geladen): einmal mit der Standardstimme versuchen
            if (!plainVoice && e.error !== 'interrupted' && e.error !== 'canceled') {
              finished = true;
              plainVoice = true;
              setTimeout(next, 200);
              return;
            }
            advance();
          };
          utterances.current.push(u);
          clearTimeout(watchdog);
          watchdog = setTimeout(advance, 3000 + part.length * 110);
          speechSynthesis.speak(u);
        };
        setTimeout(() => {
          if (token !== speakToken.current) return;
          speechSynthesis.cancel();
          setTimeout(next, 80);
        }, 300);
      }
    },
    [enabled, listen, naturalVoice, pickVoice],
  );

  const greet = useCallback(() => {
    const hour = new Date().getHours();
    const extra = hour < 11 ? 'Guten Morgen. ' : hour >= 18 ? 'Schönen Abend. ' : '';
    say(`Sers${name ? ` ${name}` : ''}! ${extra}Was kann ich für dich tun?`);
  }, [name, say]);

  const runAction = useCallback(
    async (a: Action) => {
      setP('thinking');
      const { label: _label, ...payload } = a;
      void _label;
      try {
        const res = await runAssistantAction(payload);
        history.current.push({ role: 'assistant', text: res.text });
        if (res.href) router.push(res.href);
        router.refresh();
        say(res.ok ? res.text : `Das hat nicht geklappt: ${res.text}`);
      } catch {
        say('Das hat gerade nicht geklappt. Versuch es gleich noch einmal.');
      }
    },
    [router, say],
  );

  const ask = useCallback(
    async (text: string) => {
      setP('thinking');
      setHeard(text);
      history.current.push({ role: 'user', text });
      history.current = history.current.slice(-12);
      try {
        const res = await askAssistant(history.current, { voice: true });
        history.current.push({ role: 'assistant', text: res.antwort });
        const action = res.aktionen[0];
        if (action?.typ === 'seite_oeffnen' && action.ziel) {
          router.push(action.ziel);
          say(res.antwort);
          return;
        }
        if (action) {
          pending.current = action;
          say(`${res.antwort} Soll ich: ${action.label}?`, 'confirm');
          return;
        }
        say(res.antwort);
      } catch {
        say('Ich komme gerade nicht an die Daten. Versuch es gleich noch einmal.');
      }
    },
    [router, say],
  );

  // Gehörten Text verarbeiten (Weckwort, Bestätigung, Frage)
  useEffect(() => {
    handleRef.current = (text: string) => {
      if (phaseRef.current === 'speaking' || phaseRef.current === 'thinking') return;
      if (phaseRef.current === 'confirm' && pending.current) {
        const a = pending.current;
        if (YES.test(text)) {
          pending.current = null;
          void runAction(a);
          return;
        }
        if (NO.test(text)) {
          pending.current = null;
          say('Okay, lass ich.', 'listen');
          return;
        }
      }
      const m = WAKE.exec(text);
      if (m) {
        setOpen(true);
        const rest = (m[1] ?? '').trim();
        if (rest.length > 2) void ask(rest);
        else greet();
        return;
      }
      // Ohne Weckwort nur im laufenden Gespräch (Panel offen und gerade zugehört)
      if (
        open &&
        (conversing.current || !wakeRef.current) &&
        (phaseRef.current === 'listening' || phaseRef.current === 'confirm')
      ) {
        pending.current = null;
        void ask(text);
      }
    };
  }, [ask, greet, open, runAction, say]);

  // Dauer-Zuhören (Weckwort) – Zustand merken
  useEffect(() => {
    const on = store(WAKE_KEY) === '1';
    wakeRef.current = on;
    setWake(on);
    if (on && enabled) listen(true);
    return () => {
      wakeRef.current = false;
      stopListening();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, [enabled, listen]);

  const toggleWake = () => {
    const next = !wakeRef.current;
    wakeRef.current = next;
    setWake(next);
    store(WAKE_KEY, next ? '1' : '0');
    if (next) listen(true);
    else stopListening();
  };

  const start = () => {
    setOpen(true);
    history.current = [];
    pending.current = null;
    // Im Klick die Stimme „aufwecken“: iPad/iPhone erlauben Vorlesen nur nach einer Berührung
    if (naturalVoice) {
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = SILENT_WAV;
      void audio.play().catch(() => {});
    }
    if ('speechSynthesis' in window) {
      const unlock = new SpeechSynthesisUtterance(' ');
      unlock.volume = 0;
      speechSynthesis.speak(unlock);
    }
    greet();
  };

  const close = () => {
    setOpen(false);
    pending.current = null;
    conversing.current = false;
    speakToken.current++;
    audioRef.current?.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setP('idle');
    if (wakeRef.current) listen(true);
    else stopListening();
  };

  if (!enabled) return null;

  const status: Record<Phase, string> = {
    idle: wake ? 'Sag „Jarvis“, wenn du etwas brauchst.' : 'Tippe auf „Sprechen“.',
    listening: 'Ich höre zu …',
    thinking: 'Moment …',
    speaking: 'Jarvis spricht …',
    confirm: 'Sag „Ja“ oder „Nein“.',
  };

  return (
    <>
      <button
        type="button"
        className={`jarvis-fab ${wake ? 'is-wake' : ''} ${phase !== 'idle' ? 'is-active' : ''}`}
        onClick={open ? close : start}
        aria-label={open ? 'Jarvis schließen' : 'Jarvis starten'}
        title="Jarvis"
      >
        <span className="jarvis-fab-dot" aria-hidden="true" />
        Jarvis
      </button>
      {open ? (
        <section className={`jarvis-panel is-${phase}`} role="dialog" aria-label="Jarvis">
          <div className="jarvis-orb" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="jarvis-status">
            {supported ? status[phase] : 'Spracheingabe geht in diesem Browser nicht – nimm Safari oder Chrome.'}
          </p>
          {heard ? <p className="jarvis-heard">„{heard}“</p> : null}
          {answer ? <p className="jarvis-answer">{answer}</p> : null}
          {!aiOn ? <p className="jarvis-note">Ohne KI-Schlüssel verstehe ich nur einfache Fragen.</p> : null}
          <div className="jarvis-actions">
            {phase === 'confirm' && pending.current ? (
              <>
                <button
                  type="button"
                  className="ui-btn ui-btn-primary"
                  onClick={() => pending.current && void runAction(pending.current)}
                >
                  Ja, mach
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary"
                  onClick={() => {
                    pending.current = null;
                    say('Okay, lass ich.', 'listen');
                  }}
                >
                  Nein
                </button>
              </>
            ) : (
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                disabled={!supported || phase === 'thinking'}
                onClick={() => {
                  speakToken.current++;
                  audioRef.current?.pause();
                  if ('speechSynthesis' in window) speechSynthesis.cancel();
                  conversing.current = true;
                  setP('listening');
                  listen(wakeRef.current);
                }}
              >
                Sprechen
              </button>
            )}
            <button type="button" className={`ui-btn ${wake ? 'ui-btn-primary' : 'ui-btn-secondary'}`} onClick={toggleWake}>
              Immer zuhören: {wake ? 'an' : 'aus'}
            </button>
            <button type="button" className="ui-btn ui-btn-ghost" onClick={close}>
              Schließen
            </button>
          </div>
          {!naturalVoice && voices.length > 1 ? (
            <label className="jarvis-voice">
              Stimme
              <select
                value={pickVoice()?.name ?? ''}
                onChange={(e) => {
                  setVoiceName(e.target.value);
                  store(VOICE_KEY, e.target.value);
                }}
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
