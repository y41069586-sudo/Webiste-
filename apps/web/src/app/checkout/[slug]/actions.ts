'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { startCheckout } from '@wbm/core';
import { requestMetaFrom } from '@/lib/request';

export interface CheckoutState {
  error?: string;
  fieldErrors?: Record<string, string>;
  alternatives?: string[];
  values?: Record<string, string>;
}

const FIELDS = ['company', 'contactName', 'email', 'phone', 'street', 'postalCode', 'city', 'domain', 'plan'] as const;

export async function checkoutAction(slug: string, _prev: CheckoutState, form: FormData): Promise<CheckoutState> {
  const values = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? '')]));
  // Die Oberfläche verlangt eine aktive Wahl (keine Vorauswahl)
  if (values.plan !== 'one_time' && values.plan !== 'monthly') {
    return {
      error: 'Bitte wählen Sie, wie Sie zahlen möchten.',
      fieldErrors: { plan: 'Bitte wählen Sie eine der beiden Optionen.' },
      values,
    };
  }
  const res = await startCheckout(
    slug,
    {
      company: values.company!,
      contactName: values.contactName!,
      email: values.email!,
      phone: values.phone,
      street: values.street!,
      postalCode: values.postalCode!,
      city: values.city!,
      domain: values.domain!,
      b2b: form.get('b2b') === 'on',
      terms: form.get('terms') === 'on',
      plan: values.plan,
    } as Parameters<typeof startCheckout>[1],
    requestMetaFrom(await headers()),
  );
  if (res.ok) redirect(res.url);
  return { error: res.error, fieldErrors: res.fieldErrors, alternatives: res.alternatives, values };
}
