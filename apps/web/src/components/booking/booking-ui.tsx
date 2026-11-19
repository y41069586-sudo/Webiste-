import type { ReactNode } from 'react';
import type { SlotDay } from '@wbm/core';

/**
 * Terminbuchung im Namen des Betriebs (19.11.2026): schlicht, gut lesbar, ohne JavaScript (Auswahl über Radio-Knöpfe),
 * mit Hinweis, dass erst die Bestätigung des Betriebs den Termin verbindlich macht.
 */
export function BookingShell({ company, children, footer }: { company: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f6f6f4] text-[#1b1c1e]">
      <header className="border-b border-[#e2e2df] bg-white">
        <div className="mx-auto flex min-h-16 max-w-3xl items-center px-5 py-3">
          <p className="text-lg font-semibold">{company}</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">{children}</main>
      <footer className="border-t border-[#e2e2df] bg-white">
        <div className="mx-auto max-w-3xl space-y-1 px-5 py-6 text-sm text-[#55554f]">
          {footer}
          <p>Terminanfragen über die Website von {company}. Technische Umsetzung: SeitenWerk.</p>
        </div>
      </footer>
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-lg border border-[#e2e2df] bg-white p-5 sm:p-7">{children}</section>;
}

const input =
  'block w-full rounded-md border border-[#8a8a84] bg-white px-3 py-3 text-base text-[#1b1c1e] focus:border-[#1b1c1e] focus:outline-none focus:ring-2 focus:ring-[#1b1c1e]/20 disabled:bg-[#f1f1ee]';

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
  // Vorschau: alles bedienbar (Zeit wählen, Felder ausfüllen), nur Absenden ist gesperrt
  return (
    <form method="post" action={action} acceptCharset="utf-8" className="space-y-7">
      {error ? (
        <p role="alert" className="rounded-md border border-[#b3261e] bg-[#fdf1f0] px-4 py-3 text-[#7a1712]">
          {error}
        </p>
      ) : null}
      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">1. Zeit wählen</legend>
        <p className="text-sm text-[#55554f]">Termine dauern etwa {slotMinutes} Minuten. Angezeigt werden nur freie Zeiten.</p>
        {days.length === 0 ? (
          <p className="rounded-md bg-[#f1f1ee] px-4 py-3">Zurzeit sind keine freien Zeiten verfügbar. Bitte nutzen Sie das Anfrageformular auf der Website.</p>
        ) : (
          <div className="divide-y divide-[#e2e2df] rounded-md border border-[#e2e2df]">
            {days.map((d, i) => (
              // name: nur ein Tag gleichzeitig aufgeklappt (exklusives Akkordeon); die Uhrzeit ist ein Radio-Knopf → immer genau eine Auswahl
              <details key={d.date} name="tag" open={i === 0} className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-medium group-has-[:checked]:bg-[#f1f1ee]">
                  <span>{d.label}</span>
                  <span className="text-sm text-[#55554f] group-has-[:checked]:hidden">{d.slots.length} frei</span>
                  <span className="hidden rounded bg-[#1b1c1e] px-2 py-0.5 text-sm text-white group-has-[:checked]:inline">✓ gewählt</span>
                </summary>
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {d.slots.map((s) => (
                    <label
                      key={s.start}
                      className="cursor-pointer rounded-md border border-[#8a8a84] px-4 py-2.5 text-base has-[:checked]:border-[#1b1c1e] has-[:checked]:bg-[#1b1c1e] has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#1b1c1e]/40"
                    >
                      <input type="radio" name="start" value={s.start} required className="sr-only" />
                      {s.label} Uhr
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">2. Ihre Angaben</legend>
        {services.length ? (
          <div>
            <label htmlFor="b-leistung" className="mb-1 block font-medium">
              Leistung <span className="font-normal text-[#55554f]">(optional)</span>
            </label>
            <select id="b-leistung" name="leistung" className={input}>
              <option value="">Bitte wählen</option>
              {services.map((s) => (
                <option key={s}>{s}</option>
              ))}
              <option>Etwas anderes</option>
            </select>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="b-name" className="mb-1 block font-medium">Name</label>
            <input id="b-name" name="name" type="text" autoComplete="name" required maxLength={120} className={input} />
          </div>
          <div>
            <label htmlFor="b-email" className="mb-1 block font-medium">E-Mail</label>
            <input id="b-email" name="email" type="email" autoComplete="email" required maxLength={200} className={input} />
            <p className="mt-1 text-sm text-[#55554f]">Dorthin kommt die Bestätigung.</p>
          </div>
        </div>
        <div>
          <label htmlFor="b-phone" className="mb-1 block font-medium">
            Telefon <span className="font-normal text-[#55554f]">(optional)</span>
          </label>
          <input id="b-phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={40} className={input} />
        </div>
        <div>
          <label htmlFor="b-message" className="mb-1 block font-medium">
            Grund des Termins
          </label>
          <textarea
            id="b-message"
            name="message"
            rows={3}
            minLength={3}
            maxLength={2000}
            required
            className={input}
            placeholder="z. B. Ziegel nach Sturm locker, Besichtigung für neues Dach"
          />
        </div>
        <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="b-website">Website</label>
          <input id="b-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="flex items-start gap-3">
          <input id="b-consent" name="consent" type="checkbox" required className="mt-1 h-5 w-5 accent-[#1b1c1e]" />
          <label htmlFor="b-consent" className="text-sm">
            Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser Terminanfrage verarbeitet und spätestens 30 Tage nach dem Termin
            gelöscht werden.{privacyUrl ? (
              <>
                {' '}
                Hinweise in der <a className="underline" href={privacyUrl}>Datenschutzerklärung</a>.
              </>
            ) : null}
          </label>
        </div>
      </fieldset>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={preview}
          className="min-h-12 w-full rounded-md bg-[#1b1c1e] px-6 py-3 text-base font-semibold text-white hover:bg-[#33342f] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          Termin anfragen
        </button>
        {preview ? <p className="text-sm font-medium">Vorschau: Absenden ist im Entwurf gesperrt.</p> : null}
        <p className="text-sm text-[#55554f]">
          Der Termin ist erst verbindlich, wenn der Betrieb ihn bestätigt. Sie erhalten dazu eine E-Mail.
        </p>
      </div>
    </form>
  );
}
