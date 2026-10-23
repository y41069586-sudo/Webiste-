'use client';

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from 'react';
import { checkoutAction, type CheckoutState } from './actions';

const input =
  'block w-full rounded-lg border bg-white px-3 py-2.5 text-base shadow-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none sm:text-sm';

export interface PlanOffer {
  id: 'one_time' | 'monthly';
  title: string;
  price: string;
  unit: string;
  points: string[];
  /** Kurzform für den Absende-Button, z. B. „590 €“ bzw. „49 € pro Monat“ */
  buttonLabel: string;
}

interface Props {
  slug: string;
  prefill: { company: string; street: string; postalCode: string; city: string; domain: string };
  plans: PlanOffer[];
  /** Auf der Demo-Preiskarte selbst gewählte Option (sonst keine Vorauswahl) */
  initialPlan: PlanOffer['id'] | null;
  guaranteeNote: string | null;
  minTermNote: string | null;
  termsVersion: string;
}

type DomainStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'result'; available: boolean; domain: string | null; message: string; alternatives: string[] }
  | { state: 'error' };

function Field(props: {
  id: string;
  label: string;
  defaultValue?: string;
  error?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  inputMode?: 'numeric' | 'tel' | 'email' | 'text';
  hint?: string;
  maxLength?: number;
}) {
  const errId = `${props.id}-fehler`;
  const hintId = `${props.id}-hinweis`;
  const describedBy = [props.error ? errId : '', props.hint ? hintId : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={props.id} className="mb-1 block text-sm font-medium text-slate-800">
        {props.label}
        {props.required === false ? <span className="font-normal text-slate-500"> (optional)</span> : null}
      </label>
      <input
        id={props.id}
        name={props.id}
        type={props.type ?? 'text'}
        defaultValue={props.defaultValue}
        autoComplete={props.autoComplete}
        required={props.required !== false}
        inputMode={props.inputMode}
        maxLength={props.maxLength ?? 120}
        aria-invalid={props.error ? true : undefined}
        aria-describedby={describedBy}
        className={`${input} ${props.error ? 'border-red-500' : 'border-slate-300'}`}
      />
      {props.hint ? (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {props.hint}
        </p>
      ) : null}
      {props.error ? (
        <p id={errId} className="mt-1 text-sm text-red-700">
          {props.error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutForm({ slug, prefill, plans, initialPlan, guaranteeNote, minTermNote, termsVersion }: Props) {
  const [state, action, pending] = useActionState<CheckoutState, FormData>(checkoutAction.bind(null, slug), {});
  const v = state.values ?? {};
  const fe = state.fieldErrors ?? {};
  // Keine Vorauswahl: der Kunde wählt aktiv eine der beiden gleichwertigen Optionen
  const [plan, setPlan] = useState<string>(v.plan ?? initialPlan ?? (plans.length === 1 ? plans[0]!.id : ''));
  const chosen = plans.find((p) => p.id === plan);
  const [domain, setDomain] = useState(v.domain ?? prefill.domain);
  const [status, setStatus] = useState<DomainStatus>({ state: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const d = domain.trim();
    if (d.length < 3) {
      setStatus({ state: 'idle' });
      return;
    }
    setStatus({ state: 'checking' });
    const ctrl = new AbortController();
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/domain-check?d=${encodeURIComponent(d)}&s=${encodeURIComponent(slug)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const j = (await res.json()) as { available: boolean; domain: string | null; message: string; alternatives: string[] };
        setStatus({ state: 'result', ...j });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setStatus({ state: 'error' });
      }
    }, 450);
    return () => ctrl.abort();
  }, [domain, slug]);

  // Eigenes Absenden: verhindert das automatische Zurücksetzen des Formulars durch React 19,
  // das sonst die gesteuerte Plan-Auswahl und die Domain optisch leeren würde
  const onSubmit = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => action(fd));
  };

  const domainError = fe.domain;
  const alternatives = status.state === 'result' && !status.available ? status.alternatives : (state.alternatives ?? []);

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-6" noValidate>
      {state.error ? (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {state.error}
        </div>
      ) : null}

      <fieldset aria-describedby={fe.plan ? 'plan-fehler' : undefined}>
        <legend className="mb-2 text-base font-semibold text-slate-900">Ihre Option</legend>
        <div className={`grid gap-3 ${plans.length > 1 ? 'sm:grid-cols-2' : ''}`}>
          {plans.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer flex-col rounded-xl border-2 bg-white p-4 shadow-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-300 ${
                plan === p.id ? 'border-brand-600' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={plan === p.id}
                  onChange={() => setPlan(p.id)}
                  required
                  className="mt-1 h-5 w-5 shrink-0 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{p.title}</span>
                  <span className="mt-1 block text-2xl font-semibold tracking-tight text-slate-900">
                    {p.price} <span className="text-base font-normal text-slate-600">{p.unit}</span>
                  </span>
                </span>
              </span>
              <ul className="mt-3 space-y-1.5 pl-8 text-sm text-slate-700">
                {p.points.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span aria-hidden="true" className="text-emerald-600">
                      ✓
                    </span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </label>
          ))}
        </div>
        {fe.plan ? (
          <p id="plan-fehler" className="mt-2 text-sm text-red-700">
            {fe.plan}
          </p>
        ) : null}
        {guaranteeNote ? <p className="mt-3 text-sm text-slate-600">{guaranteeNote}</p> : null}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold text-slate-900">Rechnungsadresse</legend>
        <Field
          id="company"
          label="Firma"
          defaultValue={v.company ?? prefill.company}
          autoComplete="organization"
          error={fe.company}
        />
        <Field
          id="contactName"
          label="Ihr Name (Vor- und Nachname)"
          defaultValue={v.contactName}
          autoComplete="name"
          error={fe.contactName}
        />
        <Field
          id="street"
          label="Straße und Hausnummer"
          defaultValue={v.street ?? prefill.street}
          autoComplete="street-address"
          error={fe.street}
        />
        <div className="grid grid-cols-[8rem_1fr] gap-3">
          <Field
            id="postalCode"
            label="PLZ"
            defaultValue={v.postalCode ?? prefill.postalCode}
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={5}
            error={fe.postalCode}
          />
          <Field id="city" label="Ort" defaultValue={v.city ?? prefill.city} autoComplete="address-level2" error={fe.city} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-base font-semibold text-slate-900">Kontakt</legend>
        <Field
          id="email"
          label="E-Mail"
          type="email"
          inputMode="email"
          defaultValue={v.email}
          autoComplete="email"
          error={fe.email}
          hint="Hierhin schicken wir Rechnung und den Link für Ihre Angaben."
          maxLength={254}
        />
        <Field
          id="phone"
          label="Telefon"
          type="tel"
          inputMode="tel"
          defaultValue={v.phone}
          autoComplete="tel"
          required={false}
          error={fe.phone}
          maxLength={40}
        />
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-base font-semibold text-slate-900">Ihre Domain</legend>
        <label htmlFor="domain" className="mb-1 block text-sm font-medium text-slate-800">
          Wunschdomain
        </label>
        <input
          id="domain"
          name="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          required
          aria-invalid={domainError || (status.state === 'result' && !status.available) ? true : undefined}
          aria-describedby="domain-status"
          className={`${input} ${domainError ? 'border-red-500' : 'border-slate-300'}`}
        />
        <div id="domain-status" aria-live="polite" className="mt-1.5 min-h-5 text-sm">
          {status.state === 'checking' ? <span className="text-slate-500">Prüfe Verfügbarkeit …</span> : null}
          {status.state === 'result' ? (
            <span className={status.available ? 'text-emerald-700' : 'text-red-700'}>
              {status.available ? '✓ ' : ''}
              {status.message}
            </span>
          ) : null}
          {status.state === 'error' ? (
            <span className="text-slate-500">
              Verfügbarkeit konnte gerade nicht geprüft werden – wir prüfen beim Absenden erneut.
            </span>
          ) : null}
          {status.state === 'idle' && domainError ? <span className="text-red-700">{domainError}</span> : null}
        </div>
        {alternatives.length ? (
          <div className="mt-2">
            <p className="text-sm text-slate-600">Noch frei:</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {alternatives.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setDomain(a)}
                  className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-sm text-brand-700 hover:bg-brand-100"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">Die Domain wird auf Ihren Namen registriert und gehört Ihnen.</p>
      </fieldset>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <legend className="sr-only">Bestätigungen</legend>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="b2b"
            required
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
            aria-invalid={fe.b2b ? true : undefined}
          />
          <span>
            Ich bestelle als <strong>Unternehmer</strong> (§ 14 BGB) für meinen Betrieb, nicht als Verbraucher.
            {fe.b2b ? <span className="mt-1 block text-red-700">{fe.b2b}</span> : null}
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="terms"
            required
            className="mt-0.5 h-5 w-5 shrink-0 accent-brand-600"
            aria-invalid={fe.terms ? true : undefined}
          />
          <span>
            Ich akzeptiere die{' '}
            <a href="/agb" target="_blank" rel="noopener" className="text-brand-700 underline">
              AGB
            </a>{' '}
            (Stand {termsVersion}) und habe die{' '}
            <a href="/datenschutz" target="_blank" rel="noopener" className="text-brand-700 underline">
              Datenschutzhinweise
            </a>{' '}
            gelesen.
            {plan === 'monthly' && minTermNote ? <strong className="mt-1 block font-medium">{minTermNote}</strong> : null}
            {fe.terms ? <span className="mt-1 block text-red-700">{fe.terms}</span> : null}
          </span>
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-brand-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? 'Einen Moment …' : chosen ? `Weiter zur Zahlung (${chosen.buttonLabel})` : 'Weiter zur Zahlung'}
      </button>
      <p className="text-center text-xs text-slate-500">
        Sie werden zu unserem Zahlungsdienstleister Stripe weitergeleitet. Zahlung per Karte oder SEPA-Lastschrift.
      </p>
    </form>
  );
}
