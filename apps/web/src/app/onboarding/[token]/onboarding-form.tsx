'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { OnboardingData } from '@wbm/core';
import { onboardingAction, type OnboardingState } from './actions';

const inputCls =
  'block w-full rounded-lg border bg-white px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none sm:text-sm';

const DAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Montag' },
  { day: 2, label: 'Dienstag' },
  { day: 3, label: 'Mittwoch' },
  { day: 4, label: 'Donnerstag' },
  { day: 5, label: 'Freitag' },
  { day: 6, label: 'Samstag' },
  { day: 0, label: 'Sonntag' },
];

const LEGAL_FORMS = [
  'Einzelunternehmen',
  'e. K.',
  'GbR',
  'GmbH',
  'UG (haftungsbeschränkt)',
  'OHG',
  'KG',
  'GmbH & Co. KG',
  'Sonstige',
];

interface Props {
  token: string;
  initial: OnboardingData;
  photos: { id: string }[];
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titel`} className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 id={`${id}-titel`} className="text-lg font-semibold">
        {title}
      </h2>
      {intro ? <div className="mt-1 text-sm text-slate-600">{intro}</div> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function F(props: {
  name: string;
  label: string;
  value?: string;
  errors: Record<string, string>;
  type?: string;
  required?: boolean;
  hint?: string;
  textarea?: number;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: 'numeric' | 'tel' | 'email' | 'text';
}) {
  const err = props.errors[props.name];
  const id = props.name.replace(/[^a-zA-Z0-9]/g, '-');
  const describedBy = [err ? `${id}-fehler` : '', props.hint ? `${id}-hinweis` : ''].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name: props.name,
    defaultValue: props.value ?? '',
    maxLength: props.maxLength ?? 200,
    'aria-invalid': err ? true : undefined,
    'aria-describedby': describedBy,
    className: `${inputCls} ${err ? 'border-red-500' : 'border-slate-300'}`,
  };
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-800">
        {props.label}
        {props.required === false ? <span className="font-normal text-slate-500"> (optional)</span> : null}
      </label>
      {props.textarea ? (
        <textarea {...common} rows={props.textarea} />
      ) : (
        <input {...common} type={props.type ?? 'text'} autoComplete={props.autoComplete} inputMode={props.inputMode} />
      )}
      {props.hint ? (
        <p id={`${id}-hinweis`} className="mt-1 text-xs text-slate-500">
          {props.hint}
        </p>
      ) : null}
      {err ? (
        <p id={`${id}-fehler`} className="mt-1 text-sm text-red-700">
          {err}
        </p>
      ) : null}
    </div>
  );
}

export function OnboardingForm({ token, initial, photos }: Props) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(onboardingAction.bind(null, token), {});
  const v = state.values ?? initial;
  const e = state.fieldErrors ?? {};
  const [mode, setMode] = useState(v.hours.mode);
  const [legalForm, setLegalForm] = useState(v.impressum.legalForm);
  const [domain, setDomain] = useState(v.domain);
  const [domainMsg, setDomainMsg] = useState<{ ok: boolean; text: string; alternatives: string[] } | null>(null);
  const initialDomain = useRef(initial.domain);
  const msgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error || state.saved) msgRef.current?.focus();
  }, [state]);

  useEffect(() => {
    const d = domain.trim();
    if (d.length < 3 || d === initialDomain.current) {
      setDomainMsg(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/domain-check?d=${encodeURIComponent(d)}`, { signal: ctrl.signal });
        const j = (await r.json()) as { available: boolean; message: string; alternatives: string[] };
        setDomainMsg({ ok: j.available, text: j.message, alternatives: j.alternatives ?? [] });
      } catch {
        /* ignoriert */
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [domain]);

  const services = [...v.texts.services];
  while (services.length < 6) services.push({ title: '', text: '' });
  const registered = ['e. K.', 'GmbH', 'UG (haftungsbeschränkt)', 'OHG', 'KG', 'GmbH & Co. KG'].includes(legalForm);
  const errCount = Object.keys(e).length;

  // Mit JavaScript ohne automatisches Zurücksetzen absenden (Eingaben bleiben erhalten); ohne JS normales Formular
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const submitter = (ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(ev.currentTarget, submitter);
    startTransition(() => action(fd));
  };

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-6" noValidate>
      <div ref={msgRef} tabIndex={-1} aria-live="polite">
        {state.error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {state.error}
            {errCount ? ` (${errCount} ${errCount === 1 ? 'Feld' : 'Felder'})` : ''}
          </div>
        ) : state.saved ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Zwischengespeichert. Sie können jederzeit weitermachen.
          </div>
        ) : null}
      </div>

      <Section
        id="betrieb"
        title="2. Ihr Betrieb auf der Website"
        intro="Diese Angaben erscheinen auf der Website (Kontaktbereich, Kopfzeile)."
      >
        <F name="business.name" label="Name des Betriebs" value={v.business.name} errors={e} maxLength={80} />
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <F name="business.street" label="Straße" value={v.business.street} errors={e} autoComplete="address-line1" />
          <F name="business.houseNumber" label="Hausnr." value={v.business.houseNumber} errors={e} maxLength={12} />
        </div>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <F name="business.postalCode" label="PLZ" value={v.business.postalCode} errors={e} maxLength={5} inputMode="numeric" />
          <F name="business.city" label="Ort" value={v.business.city} errors={e} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <F
            name="business.phone"
            label="Telefon (wird angezeigt)"
            value={v.business.phone}
            errors={e}
            type="tel"
            inputMode="tel"
            required={false}
            maxLength={40}
          />
          <F
            name="business.email"
            label="E-Mail (wird angezeigt)"
            value={v.business.email}
            errors={e}
            type="email"
            inputMode="email"
            required={false}
            maxLength={254}
          />
        </div>
      </Section>

      <Section
        id="texte"
        title="3. Texte und Leistungen"
        intro="Wir haben Texte aus dem Entwurf vorbereitet. Passen Sie sie an – wir prüfen Rechtschreibung und Länge, erfinden aber nichts dazu."
      >
        <F name="texts.headline" label="Überschrift" value={v.texts.headline} errors={e} maxLength={70} />
        <F name="texts.subline" label="Untertitel" value={v.texts.subline} errors={e} maxLength={180} textarea={2} />
        <F
          name="texts.about"
          label="Über uns"
          value={v.texts.about}
          errors={e}
          maxLength={1200}
          textarea={5}
          hint="Hier dürfen gern echte Fakten stehen: Gründungsjahr, Meistertitel, Spezialisierungen – nur, was stimmt."
        />
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-800">Ihre Leistungen (bis zu 6)</legend>
          {e['texts.services'] ? <p className="mb-2 text-sm text-red-700">{e['texts.services']}</p> : null}
          <div className="space-y-3">
            {services.map((s, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[14rem_1fr]">
                <F
                  name={`services.${i}.title`}
                  label={`Leistung ${i + 1}`}
                  value={s.title}
                  errors={{ [`services.${i}.title`]: e[`texts.services.${i}.title`] ?? '' }}
                  required={false}
                  maxLength={40}
                />
                <F
                  name={`services.${i}.text`}
                  label="Kurzbeschreibung"
                  value={s.text}
                  errors={{ [`services.${i}.text`]: e[`texts.services.${i}.text`] ?? '' }}
                  required={false}
                  maxLength={200}
                />
              </div>
            ))}
          </div>
        </fieldset>
        <F
          name="texts.wishes"
          label="Weitere Wünsche oder Hinweise an uns"
          value={v.texts.wishes}
          errors={e}
          required={false}
          maxLength={2000}
          textarea={3}
        />
      </Section>

      <Section id="zeiten" title="4. Öffnungszeiten">
        <fieldset>
          <legend className="sr-only">Art der Öffnungszeiten</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hours.mode"
                value="fixed"
                checked={mode === 'fixed'}
                onChange={() => setMode('fixed')}
                className="h-4 w-4 accent-brand-600"
              />
              Feste Öffnungszeiten
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="hours.mode"
                value="appointment"
                checked={mode === 'appointment'}
                onChange={() => setMode('appointment')}
                className="h-4 w-4 accent-brand-600"
              />
              Nur nach Vereinbarung
            </label>
          </div>
        </fieldset>
        {e.hours ? <p className="text-sm text-red-700">{e.hours}</p> : null}
        <div className={mode === 'fixed' ? 'space-y-2' : 'hidden'}>
          {DAYS.map(({ day, label }, idx) => {
            const d = v.hours.days.find((x) => x.day === day) ?? { closed: true, open: '', close: '', open2: '', close2: '' };
            const err = e[`hours.days.${idx}`];
            return (
              <fieldset
                key={day}
                className="grid items-center gap-2 rounded-lg border border-slate-200 p-2 text-sm sm:grid-cols-[7rem_7rem_1fr]"
              >
                <legend className="sr-only">{label}</legend>
                <span className="font-medium">{label}</span>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name={`hours.${day}.closed`}
                    defaultChecked={d.closed}
                    className="h-4 w-4 accent-brand-600"
                  />
                  geschlossen
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    aria-label={`${label} von`}
                    type="time"
                    name={`hours.${day}.open`}
                    defaultValue={d.open}
                    className={`${inputCls} w-28 border-slate-300`}
                  />
                  <span aria-hidden="true">–</span>
                  <input
                    aria-label={`${label} bis`}
                    type="time"
                    name={`hours.${day}.close`}
                    defaultValue={d.close}
                    className={`${inputCls} w-28 border-slate-300`}
                  />
                  <span className="px-1 text-slate-500">und</span>
                  <input
                    aria-label={`${label} zweite Zeitspanne von`}
                    type="time"
                    name={`hours.${day}.open2`}
                    defaultValue={d.open2}
                    className={`${inputCls} w-28 border-slate-300`}
                  />
                  <span aria-hidden="true">–</span>
                  <input
                    aria-label={`${label} zweite Zeitspanne bis`}
                    type="time"
                    name={`hours.${day}.close2`}
                    defaultValue={d.close2}
                    className={`${inputCls} w-28 border-slate-300`}
                  />
                </div>
                {err ? <p className="text-red-700 sm:col-span-3">{err}</p> : null}
              </fieldset>
            );
          })}
        </div>
      </Section>

      <Section
        id="impressum"
        title="5. Impressum (Pflichtangaben)"
        intro="Jede geschäftliche Website braucht ein Impressum (§ 5 DDG). Bitte genau so angeben, wie Sie im Gewerbe- bzw. Handelsregister eingetragen sind."
      >
        <F
          name="impressum.company"
          label="Name des Unternehmens (laut Gewerbeanmeldung/Register)"
          value={v.impressum.company}
          errors={e}
          maxLength={120}
        />
        <div>
          <label htmlFor="impressum-legalForm" className="mb-1 block text-sm font-medium text-slate-800">
            Rechtsform
          </label>
          <select
            id="impressum-legalForm"
            name="impressum.legalForm"
            value={legalForm}
            onChange={(ev) => setLegalForm(ev.target.value)}
            aria-invalid={e['impressum.legalForm'] ? true : undefined}
            className={`${inputCls} ${e['impressum.legalForm'] ? 'border-red-500' : 'border-slate-300'}`}
          >
            <option value="">Bitte wählen</option>
            {LEGAL_FORMS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          {e['impressum.legalForm'] ? <p className="mt-1 text-sm text-red-700">{e['impressum.legalForm']}</p> : null}
        </div>
        <F
          name="impressum.owner"
          label="Inhaber bzw. vertretungsberechtigte Person (Vor- und Nachname)"
          value={v.impressum.owner}
          errors={e}
          maxLength={120}
        />
        <F
          name="impressum.street"
          label="Straße und Hausnummer (ladungsfähige Anschrift, kein Postfach)"
          value={v.impressum.street}
          errors={e}
          maxLength={120}
        />
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <F
            name="impressum.postalCode"
            label="PLZ"
            value={v.impressum.postalCode}
            errors={e}
            maxLength={5}
            inputMode="numeric"
          />
          <F name="impressum.city" label="Ort" value={v.impressum.city} errors={e} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <F
            name="impressum.phone"
            label="Telefon"
            value={v.impressum.phone}
            errors={e}
            type="tel"
            inputMode="tel"
            maxLength={40}
          />
          <F
            name="impressum.email"
            label="E-Mail"
            value={v.impressum.email}
            errors={e}
            type="email"
            inputMode="email"
            maxLength={254}
          />
        </div>
        <div className={registered ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-2'}>
          <F
            name="impressum.register"
            label="Registergericht"
            value={v.impressum.register}
            errors={e}
            required={registered}
            hint={registered ? 'z. B. Amtsgericht Dortmund' : 'Nur bei Handelsregister-Eintrag'}
            maxLength={120}
          />
          <F
            name="impressum.registerNumber"
            label="Registernummer"
            value={v.impressum.registerNumber}
            errors={e}
            required={registered}
            hint={registered ? 'z. B. HRB 12345' : undefined}
            maxLength={40}
          />
        </div>
        <F
          name="impressum.vatId"
          label="USt-IdNr."
          value={v.impressum.vatId}
          errors={e}
          required={false}
          hint="Nur angeben, wenn vorhanden (nicht die Steuernummer)."
          maxLength={20}
        />
        <F
          name="impressum.chamber"
          label="Zuständige Kammer"
          value={v.impressum.chamber}
          errors={e}
          required={false}
          hint="Für zulassungspflichtiges Handwerk: z. B. Handwerkskammer Dortmund, Reinoldistraße 7–9, 44135 Dortmund"
          maxLength={160}
        />
        <F
          name="impressum.professionalTitle"
          label="Gesetzliche Berufsbezeichnung"
          value={v.impressum.professionalTitle}
          errors={e}
          required={false}
          hint="z. B. Elektrotechnikermeister (verliehen in Deutschland)"
          maxLength={160}
        />
        <F
          name="impressum.supervisoryAuthority"
          label="Aufsichtsbehörde"
          value={v.impressum.supervisoryAuthority}
          errors={e}
          required={false}
          hint="Nur falls Ihre Tätigkeit genehmigungspflichtig ist."
          maxLength={200}
        />
      </Section>

      <Section
        id="datenschutz"
        title="6. Datenschutzerklärung"
        intro={
          <>
            Bitte fügen Sie hier Ihre Datenschutzerklärung ein. Sie sind als Betreiber der Website dafür verantwortlich; wir
            dürfen sie nicht für Sie verfassen. Kostenlose Generatoren gibt es z. B. von Datenschutz-Generator.de oder eRecht24.
            Bitte berücksichtigen Sie: <strong>Kontaktformular</strong> (Name, E-Mail, Telefon, Nachricht – Weiterleitung per
            E-Mail), <strong>Hosting</strong> bei unserem Dienstleister und <strong>keine Cookies, kein Tracking</strong>.
          </>
        }
      >
        <F
          name="privacyText"
          label="Ihre Datenschutzerklärung (Text einfügen)"
          value={v.privacyText}
          errors={e}
          textarea={10}
          maxLength={60000}
        />
      </Section>

      <Section id="kontakt" title="7. Kontaktformular und Domain">
        <F
          name="formTargetEmail"
          label="Nachrichten aus dem Kontaktformular gehen an"
          value={v.formTargetEmail}
          errors={e}
          type="email"
          inputMode="email"
          maxLength={254}
        />
        <div>
          <label htmlFor="domain" className="mb-1 block text-sm font-medium text-slate-800">
            Ihre Domain
          </label>
          <input
            id="domain"
            name="domain"
            value={domain}
            onChange={(ev) => setDomain(ev.target.value)}
            maxLength={80}
            spellCheck={false}
            autoComplete="off"
            aria-describedby="domain-status"
            aria-invalid={e.domain ? true : undefined}
            className={`${inputCls} ${e.domain ? 'border-red-500' : 'border-slate-300'}`}
          />
          <div id="domain-status" aria-live="polite" className="mt-1 min-h-5 text-sm">
            {domainMsg ? (
              <span className={domainMsg.ok ? 'text-emerald-700' : 'text-red-700'}>{domainMsg.text}</span>
            ) : e.domain ? (
              <span className="text-red-700">{e.domain}</span>
            ) : (
              <span className="text-slate-500">Aus Ihrer Bestellung. Ändern ist bis zur Veröffentlichung möglich.</span>
            )}
          </div>
          {(domainMsg?.alternatives ?? state.alternatives ?? []).length ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {(domainMsg?.alternatives ?? state.alternatives ?? []).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setDomain(a)}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-700"
                >
                  {a}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Section>

      {photos.length ? (
        <Section
          id="alt"
          title="Bildbeschreibungen"
          intro="Kurze Beschreibung je Foto (für Screenreader und Suchmaschinen), z. B. „Frisch gestrichenes Treppenhaus“."
        >
          {photos.map((p, i) => (
            <F
              key={p.id}
              name={`photoAlt.${p.id}`}
              label={`Foto ${i + 1}`}
              value={v.photoAlts[p.id] ?? ''}
              errors={e}
              required={false}
              maxLength={120}
            />
          ))}
        </Section>
      ) : null}

      <section className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="confirmed"
            defaultChecked={v.confirmed}
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
            aria-invalid={e.confirmed ? true : undefined}
          />
          <span>
            Ich bestätige, dass die Angaben (insbesondere Impressum und Datenschutzerklärung) korrekt sind und ich die Rechte an
            den hochgeladenen Bildern besitze.
            {e.confirmed ? <span className="mt-1 block text-red-700">{e.confirmed}</span> : null}
          </span>
        </label>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            className="rounded-[8px] border border-slate-300 bg-white px-4 py-3 font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            Zwischenspeichern
          </button>
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            className="btn-site btn-primary flex-1 disabled:opacity-60"
          >
            {pending ? 'Einen Moment …' : 'Angaben absenden – Vorschau erstellen'}
          </button>
        </div>
      </section>
    </form>
  );
}
