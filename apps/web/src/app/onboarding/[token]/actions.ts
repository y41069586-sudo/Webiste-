'use server';

import { redirect } from 'next/navigation';
import { saveOnboarding, WEEK_DAYS, type OnboardingData } from '@wbm/core';

export interface OnboardingState {
  error?: string;
  saved?: boolean;
  fieldErrors?: Record<string, string>;
  alternatives?: string[];
  values?: OnboardingData;
}

const str = (f: FormData, k: string) => String(f.get(k) ?? '');

/** Formulardaten in die Struktur des Onboardings überführen (Feldnamen wie „impressum.company“). */
function fromForm(f: FormData): OnboardingData {
  const services: { title: string; text: string }[] = [];
  for (let i = 0; i < 6; i++) services.push({ title: str(f, `services.${i}.title`), text: str(f, `services.${i}.text`) });
  const photoAlts: Record<string, string> = {};
  for (const [k, v] of f.entries()) if (k.startsWith('photoAlt.')) photoAlts[k.slice(9)] = String(v);
  return {
    business: {
      name: str(f, 'business.name'),
      phone: str(f, 'business.phone'),
      email: str(f, 'business.email'),
      street: str(f, 'business.street'),
      houseNumber: str(f, 'business.houseNumber'),
      postalCode: str(f, 'business.postalCode'),
      city: str(f, 'business.city'),
    },
    texts: {
      headline: str(f, 'texts.headline'),
      subline: str(f, 'texts.subline'),
      about: str(f, 'texts.about'),
      services: services.filter((s) => s.title || s.text),
      wishes: str(f, 'texts.wishes'),
    },
    hours: {
      mode: str(f, 'hours.mode') === 'appointment' ? 'appointment' : 'fixed',
      days: WEEK_DAYS.map(({ day }) => ({
        day,
        closed: f.get(`hours.${day}.closed`) === 'on',
        open: str(f, `hours.${day}.open`),
        close: str(f, `hours.${day}.close`),
        open2: str(f, `hours.${day}.open2`),
        close2: str(f, `hours.${day}.close2`),
      })),
    },
    impressum: {
      company: str(f, 'impressum.company'),
      legalForm: str(f, 'impressum.legalForm'),
      owner: str(f, 'impressum.owner'),
      street: str(f, 'impressum.street'),
      postalCode: str(f, 'impressum.postalCode'),
      city: str(f, 'impressum.city'),
      phone: str(f, 'impressum.phone'),
      email: str(f, 'impressum.email'),
      register: str(f, 'impressum.register'),
      registerNumber: str(f, 'impressum.registerNumber'),
      vatId: str(f, 'impressum.vatId'),
      chamber: str(f, 'impressum.chamber'),
      professionalTitle: str(f, 'impressum.professionalTitle'),
      supervisoryAuthority: str(f, 'impressum.supervisoryAuthority'),
    },
    privacyText: str(f, 'privacyText'),
    formTargetEmail: str(f, 'formTargetEmail'),
    domain: str(f, 'domain'),
    photoAlts,
    confirmed: f.get('confirmed') === 'on',
  };
}

export async function onboardingAction(token: string, _prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const values = fromForm(form);
  const submit = form.get('intent') === 'submit';
  const res = await saveOnboarding(token, values, { submit });
  if (res.ok && res.submitted) redirect(`/onboarding/${token}?abgeschickt=1`);
  if (res.ok) return { saved: true, values };
  return { error: res.error, fieldErrors: res.fieldErrors, alternatives: res.alternatives, values };
}
