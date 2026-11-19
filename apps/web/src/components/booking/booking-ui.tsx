import type { CSSProperties, ReactNode } from 'react';
import type { SiteTheme, SlotDay } from '@wbm/core';
import { BookingSubmit } from './submit-button';

/**
 * Terminseiten im Design des Betriebs (19.11.2026): gleiche Farben, Akzentfarbe und Schriften wie seine Website.
 * Ohne JavaScript: Tag und Uhrzeit sind Radio-Knöpfe; welcher Tag seine Uhrzeiten zeigt, steuert CSS (:has).
 * Ohne :has-Unterstützung werden alle Tage untereinander gezeigt (nichts geht verloren).
 */

const fmtStretch = (s?: number) => (s ? `font-stretch:${s}%;` : '');

function themeCss(t: SiteTheme): string {
  const faces = t.faces
    .map(
      (f) =>
        `@font-face{font-family:'${f.family}';src:url(/fonts/kits/${f.file}) format('woff2');font-weight:${f.weight};${f.stretch ? `font-stretch:${f.stretch};` : ''}font-display:swap}`,
    )
    .join('');
  return `${faces}
.bk{--bg:${t.base};--sf:${t.surface};--ink:${t.ink};--mu:${t.muted};--ln:${t.line};--ac:${t.accent};--on:${t.onAccent};
--display:'${t.display}',system-ui,sans-serif;--text:'${t.text}',system-ui,sans-serif;
min-height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font-family:var(--text);font-size:17px;line-height:1.55}
.bk h1,.bk h2,.bk .bk-brand{font-family:var(--display);font-weight:${Math.min(t.weight, 800)};${fmtStretch(t.stretch)}letter-spacing:-.01em;line-height:1.1;margin:0}`;
}

const BASE_CSS = `
html{scroll-behavior:smooth}
.bk *{box-sizing:border-box}
.bk-wrap{width:min(760px,100% - 32px);margin-inline:auto}
.bk-head{border-bottom:1px solid var(--ln);background:var(--bg)}
.bk-head .bk-wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:68px}
.bk-brand{font-size:1.15rem;color:var(--ink);text-decoration:none}
.bk-back{color:var(--ink);font-size:.95rem;text-decoration:underline;text-underline-offset:3px;white-space:nowrap;padding:10px 0}
.bk-main{flex:1;padding:40px 0 64px}
.bk h1{font-size:clamp(2rem,1.4rem + 2.6vw,3rem);margin-bottom:10px}
.bk-lead{color:var(--mu);margin:0 0 28px;max-width:52ch}
.bk-note{border-left:3px solid var(--ac);background:var(--sf);padding:12px 16px;margin:0 0 24px;font-size:.95rem}
.bk-alert{border:1.5px solid #b3261e;background:#fdf1f0;color:#7a1712;padding:12px 16px;border-radius:4px;margin:0 0 24px}
.bk-ok{border:1.5px solid #1f7a4a;background:#eef8f2;color:#14532d;padding:12px 16px;border-radius:4px;margin:0 0 24px}
.bk-step{padding:28px 0;border-top:1px solid var(--ln)}
.bk-step h2{font-size:1.35rem;display:flex;align-items:center;gap:12px;margin-bottom:18px}
.bk-num{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:50%;background:var(--ac);color:var(--on);font-size:.95rem;font-family:var(--text);font-weight:700;letter-spacing:0}
.bk-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bk-days{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 10px;margin:0 -2px 6px;scroll-snap-type:x proximity;scrollbar-width:thin}
.bk-day{flex:none;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:68px;min-height:64px;padding:8px 10px;border:1.5px solid var(--ln);border-radius:6px;background:var(--bg);cursor:pointer;line-height:1.2;position:relative;transition:border-color .16s,background .16s,color .16s}
.bk-day b{font-weight:700;font-size:.95rem}
.bk-day span{font-size:.85rem;color:var(--mu)}
.bk-day:hover{border-color:var(--ink)}
.bk-day:has(input:checked){background:var(--ink);border-color:var(--ink);color:var(--bg)}
.bk-day:has(input:checked) span{color:var(--bg);opacity:.85}
.bk-day:has(input:focus-visible),.bk-time:has(input:focus-visible){outline:3px solid var(--ac);outline-offset:2px}
.bk-dot{position:absolute;top:5px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--ac);opacity:0}
.bk-panel{display:none}
.bk-panel h3{display:none;font-size:1rem;margin:16px 0 8px}
.bk-times{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
.bk-time{display:flex;align-items:center;justify-content:center;min-height:48px;border:1.5px solid var(--ln);border-radius:6px;cursor:pointer;font-weight:600;transition:border-color .16s,background .16s,color .16s}
.bk-time:hover{border-color:var(--ink)}
.bk-time:has(input:checked){background:var(--ac);border-color:var(--ac);color:var(--on)}
.bk-meta{color:var(--mu);font-size:.92rem;margin:14px 0 0}
.bk-next{position:sticky;bottom:16px;z-index:5;display:flex;align-items:center;justify-content:center;gap:10px;margin:18px auto 0;width:max-content;max-width:100%;min-height:48px;padding:12px 22px;border-radius:999px;background:var(--ink);color:var(--bg);font-weight:700;text-decoration:none;box-shadow:0 6px 18px rgba(0,0,0,.18);opacity:0;transform:translateY(10px);pointer-events:none;visibility:hidden;transition:opacity .25s ease,transform .25s ease,visibility 0s linear .25s}
.bk-form:has(input[name=start]:checked) .bk-next{opacity:1;transform:none;pointer-events:auto;visibility:visible;transition:opacity .25s ease,transform .25s ease}
.bk-arrow{display:inline-block;animation:bk-bob 1.6s ease-in-out infinite}
@keyframes bk-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(3px)}}
.bk-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.bk-field{display:grid;gap:6px}
.bk-field.full{grid-column:1 / -1}
.bk-field label{font-weight:600;font-size:.95rem}
.bk-field small{font-weight:400;color:var(--mu)}
.bk-field input,.bk-field select,.bk-field textarea{font:inherit;color:var(--ink);background:#fff;border:1.5px solid var(--ln);border-radius:6px;padding:12px 14px;min-height:50px;width:100%}
.bk-field input:focus,.bk-field select:focus,.bk-field textarea:focus{outline:none;border-color:var(--ink);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac) 25%,transparent)}
.bk-consent{display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:start;font-size:.92rem;margin:4px 0 20px}
.bk-consent input{width:22px;height:22px;margin:2px 0 0;accent-color:var(--ac)}
.bk-consent a{color:var(--ink)}
.bk-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:14px 28px;border-radius:6px;border:1.5px solid var(--ac);background:var(--ac);color:var(--on);font:inherit;font-weight:700;cursor:pointer;transition:background .16s,border-color .16s}
.bk-btn:hover{background:var(--ink);border-color:var(--ink);color:var(--bg)}
.bk-btn:disabled{opacity:.55;cursor:not-allowed}
.bk-btn[data-sending]{pointer-events:none;opacity:.8}
.bk-spin{width:16px;height:16px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:bk-rot .7s linear infinite}
@keyframes bk-rot{to{transform:rotate(360deg)}}
.bk-btn.alt{background:transparent;color:var(--ink);border-color:var(--ink)}
.bk-btn.alt:hover{background:var(--ink);color:var(--bg)}
.bk-small{color:var(--mu);font-size:.9rem;margin:12px 0 0}
.bk-foot{border-top:1px solid var(--ln);color:var(--mu);font-size:.88rem}
.bk-foot .bk-wrap{padding:20px 0}
.bk-card{border:1px solid var(--ln);border-radius:8px;padding:24px;background:var(--bg)}
.bk-dl{display:grid;grid-template-columns:9rem 1fr;gap:8px 16px;margin:0 0 24px}
.bk-dl dt{font-weight:600}.bk-dl dd{margin:0}
.bk-two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@supports not selector(:has(*)){.bk-panel{display:block}.bk-panel h3{display:block}.bk-days{display:none}.bk-next{opacity:1;visibility:visible;pointer-events:auto}}
@media (max-width:640px){.bk-grid,.bk-two{grid-template-columns:1fr}.bk-main{padding:28px 0 48px}.bk-dl{grid-template-columns:1fr}.bk-dl dt{margin-top:6px}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.bk *{transition:none!important;animation:none!important}}
`;

export function BookingShell({
  company,
  theme,
  websiteUrl,
  backLabel = 'Zur Website',
  children,
}: {
  company: string;
  theme: SiteTheme;
  websiteUrl?: string | null;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="bk">
      <style>{themeCss(theme) + BASE_CSS}</style>
      <header className="bk-head">
        <div className="bk-wrap">
          {websiteUrl ? (
            <a className="bk-brand" href={websiteUrl}>
              {company}
            </a>
          ) : (
            <span className="bk-brand">{company}</span>
          )}
          {websiteUrl ? (
            <a className="bk-back" href={websiteUrl}>
              ← {backLabel}
            </a>
          ) : null}
        </div>
      </header>
      <main className="bk-wrap bk-main">{children}</main>
      <footer className="bk-foot">
        <div className="bk-wrap">Terminanfragen über die Website von {company} · technische Umsetzung SeitenWerk</div>
      </footer>
    </div>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section className="bk-card" style={style}>
      {children}
    </section>
  );
}

const weekday = (date: string) => new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
const dayMonth = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}.`;

export function BookingForm({
  action,
  days,
  services,
  slotMinutes,
  privacyUrl,
  preview = false,
  error,
}: {
  action: string;
  days: SlotDay[];
  services: string[];
  slotMinutes: number;
  privacyUrl: string | null;
  preview?: boolean;
  error?: string | null;
}) {
  // Welcher Tag seine Uhrzeiten zeigt und welcher Tag eine gewählte Zeit hat (Punkt), regelt CSS je Tag
  const dayCss = days
    .map(
      (d) =>
        `.bk-form:has(#tag-${d.date}:checked) .bk-panel[data-day="${d.date}"]{display:block}` +
        `.bk-form:has(.bk-panel[data-day="${d.date}"] input:checked) label[for="tag-${d.date}"] .bk-dot{opacity:1}`,
    )
    .join('');
  return (
    <form method="post" action={action} acceptCharset="utf-8" className="bk-form">
      <style>{dayCss}</style>
      {error ? (
        <p role="alert" className="bk-alert">
          {error}
        </p>
      ) : null}

      <section className="bk-step">
        <h2>
          <span className="bk-num">1</span> Tag und Uhrzeit
        </h2>
        {days.length === 0 ? (
          <p className="bk-note">Zurzeit sind keine freien Zeiten verfügbar. Bitte nutzen Sie das Anfrageformular auf der Website.</p>
        ) : (
          <>
            <div className="bk-days" role="radiogroup" aria-label="Tag wählen">
              {days.map((d, i) => (
                <label key={d.date} className="bk-day" htmlFor={`tag-${d.date}`}>
                  <input className="bk-sr" type="radio" name="tag" id={`tag-${d.date}`} value={d.date} defaultChecked={i === 0} />
                  <b>{weekday(d.date)}</b>
                  <span>{dayMonth(d.date)}</span>
                  <i className="bk-dot" aria-hidden="true" />
                </label>
              ))}
            </div>
            {days.map((d) => (
              <div key={d.date} className="bk-panel" data-day={d.date}>
                <h3>{d.label}</h3>
                <div className="bk-times" role="radiogroup" aria-label={`Uhrzeit am ${d.label}`}>
                  {d.slots.map((s) => (
                    <label key={s.start} className="bk-time">
                      <input className="bk-sr" type="radio" name="start" value={s.start} required />
                      {s.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <p className="bk-meta">Ein Termin dauert etwa {slotMinutes} Minuten. Es werden nur freie Zeiten angezeigt.</p>
            <a href="#angaben" className="bk-next">
              Weiter zu Ihren Angaben <span aria-hidden="true" className="bk-arrow">↓</span>
            </a>
          </>
        )}
      </section>

      <section id="angaben" className="bk-step" style={{ scrollMarginTop: 16 }}>
        <h2>
          <span className="bk-num">2</span> Ihre Angaben
        </h2>
        <div className="bk-grid">
          <div className="bk-field">
            <label htmlFor="b-name">Name</label>
            <input id="b-name" name="name" type="text" autoComplete="name" required maxLength={120} />
          </div>
          <div className="bk-field">
            <label htmlFor="b-phone">Telefon</label>
            <input id="b-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" required minLength={6} maxLength={40} />
          </div>
          <div className="bk-field full">
            <label htmlFor="b-email">
              E-Mail <small>– dorthin kommt die Bestätigung</small>
            </label>
            <input id="b-email" name="email" type="email" autoComplete="email" required maxLength={200} />
          </div>
          {services.length ? (
            <div className="bk-field full">
              <label htmlFor="b-leistung">
                Leistung <small>(optional)</small>
              </label>
              <select id="b-leistung" name="leistung">
                <option value="">Bitte wählen</option>
                {services.map((s) => (
                  <option key={s}>{s}</option>
                ))}
                <option>Etwas anderes</option>
              </select>
            </div>
          ) : null}
          <div className="bk-field full">
            <label htmlFor="b-message">Grund des Termins</label>
            <textarea
              id="b-message"
              name="message"
              rows={3}
              minLength={3}
              maxLength={2000}
              required
              placeholder="z. B. Ziegel nach Sturm locker"
            />
          </div>
        </div>
        <div className="bk-sr" aria-hidden="true">
          <label htmlFor="b-hp">Bitte leer lassen</label>
          <input id="b-hp" name="hp_sw_k7" type="text" tabIndex={-1} autoComplete="off" data-1p-ignore data-lpignore="true" />
        </div>
      </section>

      <section className="bk-step">
        <div className="bk-consent">
          <input id="b-consent" name="consent" type="checkbox" required />
          <label htmlFor="b-consent">
            Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser Terminanfrage verarbeitet und spätestens 30 Tage nach dem
            Termin gelöscht werden.
            {privacyUrl ? (
              <>
                {' '}
                Hinweise in der <a href={privacyUrl}>Datenschutzerklärung</a>.
              </>
            ) : null}
          </label>
        </div>
        <BookingSubmit disabled={preview} />
        {preview ? <p className="bk-small"><strong>Vorschau:</strong> Absenden ist im Entwurf gesperrt.</p> : null}
        <p className="bk-small">Verbindlich wird der Termin erst mit der Bestätigung per E-Mail.</p>
      </section>
    </form>
  );
}

/** Genaue Meldung, welche Angabe fehlt (statt „bitte alles ausfüllen“). */
export function bookingErrorText(fehler?: string, feld?: string): string | null {
  if (!fehler) return null;
  const fields: Record<string, string> = {
    start: 'Bitte wählen Sie Tag und Uhrzeit.',
    name: 'Bitte geben Sie Ihren Namen an.',
    phone: 'Bitte geben Sie eine Telefonnummer mit mindestens 6 Ziffern an.',
    email: 'Bitte prüfen Sie Ihre E-Mail-Adresse.',
    message: 'Bitte beschreiben Sie kurz den Grund des Termins (ohne viele Links).',
    consent: 'Bitte bestätigen Sie den Datenschutzhinweis.',
    service: 'Bitte wählen Sie eine Leistung aus der Liste.',
    spam: 'Die Anfrage wurde als automatisch erkannt. Bitte Seite neu laden und ohne automatisches Ausfüllen erneut senden.',
  };
  const other: Record<string, string> = {
    taken: 'Diese Zeit wurde gerade vergeben. Bitte wählen Sie eine andere Zeit.',
    rate_limited: 'Zu viele Anfragen in kurzer Zeit. Bitte später erneut versuchen.',
    unavailable: 'Die Anfrage konnte gerade nicht zugestellt werden. Bitte später erneut versuchen oder anrufen.',
  };
  if (fehler === 'invalid') return (feld && fields[feld]) || 'Bitte prüfen Sie Ihre Angaben.';
  return other[fehler] ?? 'Bitte prüfen Sie Ihre Angaben.';
}
