'use server';

import { headers } from 'next/headers';
import { handleContactForm } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export type ContactState = { status: 'idle' | 'sent' | 'error'; message?: string };

export async function sendContactAction(_prev: ContactState, form: FormData): Promise<ContactState> {
  const res = await handleContactForm(
    {
      name: String(form.get('name') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      message: String(form.get('message') ?? ''),
      consent: form.get('consent') === 'on',
      honeypot: String(form.get('website') ?? ''),
      ts: Number(form.get('ts') ?? 0),
    },
    requestMetaFrom(await headers()),
  );
  // Spam bekommt dieselbe Antwort wie echte Nachrichten
  if (res.ok || res.reason === 'spam') return { status: 'sent' };
  return {
    status: 'error',
    message:
      res.reason === 'rate_limited'
        ? 'Sie haben in kurzer Zeit mehrere Nachrichten gesendet. Bitte versuchen Sie es später erneut.'
        : 'Bitte füllen Sie Name, E-Mail und Nachricht aus und bestätigen Sie den Datenschutzhinweis.',
  };
}
