'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { sendContactAction, type ContactState } from './actions';

const field =
  'mt-1.5 block w-full rounded-[8px] border border-[#e3e7ee] bg-white px-4 py-3 text-[1rem] text-slate-900 transition-colors duration-300 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none';

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactAction, { status: 'idle' });
  const [ts] = useState(() => Date.now());
  if (state.status === 'sent') {
    return (
      <div className="price-in card-site p-8 text-center" role="status">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-[8px] bg-emerald-50 text-emerald-600">
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-6 w-6" fill="currentColor">
            <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" />
          </svg>
        </span>
        <h2 className="mt-4 text-xl font-semibold text-slate-900">Danke, Ihre Nachricht ist angekommen.</h2>
        <p className="mt-2 text-slate-600">Ich antworte per E-Mail, meist am selben Werktag.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card-site space-y-5 p-6 sm:p-8">
      <input type="hidden" name="ts" value={ts} />
      <div className="hidden" aria-hidden="true">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Name
          <input name="name" required minLength={2} autoComplete="name" className={field} />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          E-Mail
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
      </div>
      <label className="block text-sm font-medium text-slate-700">
        Telefon <span className="font-normal text-slate-500">(optional)</span>
        <input name="phone" type="tel" autoComplete="tel" className={field} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Nachricht
        <textarea name="message" required minLength={5} rows={5} className={field} />
      </label>
      <label className="flex gap-3 text-sm leading-relaxed text-slate-600">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0 accent-[#1f4fd8]" />
        <span>
          Ich bin einverstanden, dass meine Angaben zur Beantwortung meiner Anfrage gespeichert werden. Details in der{' '}
          <Link href="/datenschutz" className="text-brand-700 underline underline-offset-4">
            Datenschutzerklärung
          </Link>
          .
        </span>
      </label>
      {state.status === 'error' ? (
        <p role="alert" className="rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.message}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-site btn-primary w-full sm:w-auto">
        {pending ? 'Wird gesendet …' : 'Nachricht senden'}
      </button>
    </form>
  );
}
