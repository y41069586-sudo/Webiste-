'use server';

import { redirect } from 'next/navigation';
import { simulateMockPayment, type CollectedCustomer, type MockOutcome } from '@wbm/core';

const OUTCOMES: MockOutcome[] = ['paid', 'sepa_processing', 'sepa_failed', 'cancel'];

/** Simulierte Bezahlseite: wie Stripe Checkout inkl. der dort erfassten Angaben (nur Test/Entwicklung). */
export async function mockPayAction(sessionId: string, form: FormData): Promise<void> {
  const outcome = String(form.get('outcome')) as MockOutcome;
  if (!OUTCOMES.includes(outcome)) throw new Error('Ungültige Auswahl');
  const v = (k: string) => String(form.get(k) ?? '').trim();
  const customer: CollectedCustomer | undefined = form.has('email')
    ? {
        businessName: v('company'),
        name: v('name'),
        email: v('email'),
        phone: v('phone') || undefined,
        address: { line1: v('street'), postalCode: v('postalCode'), city: v('city'), country: 'DE' },
        customFields: {
          wunschdomain: v('domain'),
          ...(form.get('b2b') === 'on' ? { unternehmer: 'ja' } : {}),
          ...(form.get('terms') === 'on' ? { agb: 'ja' } : {}),
        },
      }
    : undefined;
  redirect(await simulateMockPayment(sessionId, outcome, customer));
}
