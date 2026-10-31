'use server';

import { onboardingFromForm } from '@/lib/onboarding-form-data';
import { redirect } from 'next/navigation';
import { saveOnboarding, type OnboardingData } from '@wbm/core';

export interface OnboardingState {
  error?: string;
  saved?: boolean;
  fieldErrors?: Record<string, string>;
  alternatives?: string[];
  values?: OnboardingData;
}

export async function onboardingAction(token: string, _prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const values = onboardingFromForm(form);
  const submit = form.get('intent') === 'submit';
  const res = await saveOnboarding(token, values, { submit });
  if (res.ok && res.submitted) redirect(`/onboarding/${token}?abgeschickt=1`);
  if (res.ok) return { saved: true, values };
  return { error: res.error, fieldErrors: res.fieldErrors, alternatives: res.alternatives, values };
}
