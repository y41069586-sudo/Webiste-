'use server';

import { redirect } from 'next/navigation';
import { simulateMockPayment, type MockOutcome } from '@wbm/core';

const OUTCOMES: MockOutcome[] = ['paid', 'sepa_processing', 'sepa_failed', 'cancel'];

export async function mockPayAction(sessionId: string, form: FormData): Promise<void> {
  const outcome = String(form.get('outcome')) as MockOutcome;
  if (!OUTCOMES.includes(outcome)) throw new Error('Ungültige Auswahl');
  redirect(await simulateMockPayment(sessionId, outcome));
}
