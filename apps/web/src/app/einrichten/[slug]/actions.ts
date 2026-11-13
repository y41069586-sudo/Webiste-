'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { checkoutPreparedDraft, saveCheckoutDraft, setupCookieName, startHostedCheckout } from '@wbm/core';
import { onboardingFromForm } from '@/lib/onboarding-form-data';
import { requestMetaFrom } from '@/lib/request';
import type { OnboardingState } from '../../onboarding/[token]/actions';

export async function saveSetup(slug: string, _prev: OnboardingState, form: FormData): Promise<OnboardingState> {
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  const submit = form.get('intent') === 'submit';
  const result = await saveCheckoutDraft(slug, token, onboardingFromForm(form), submit);
  if (!result) return { error: 'Ihr Entwurf ist abgelaufen. Bitte beginnen Sie erneut über Ihre Demo.' };
  if (result.saved && submit) redirect(`/einrichten/${slug}/pruefen`);
  return result;
}

export async function paySetup(slug: string, _prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const token = (await cookies()).get(setupCookieName(slug))?.value ?? '';
  const result = await checkoutPreparedDraft(
    slug,
    token,
    String(form.get('plan') ?? ''),
    {
      b2b: form.get('b2b') === 'on',
      terms: form.get('terms') === 'on',
      subscription: form.get('subscription') === 'on',
    },
    String(form.get('fingerprint') ?? ''),
    requestMetaFrom(await headers()),
  );
  if (result?.ok) redirect(result.url);
  return { error: result?.error ?? 'Der Entwurf ist abgelaufen. Bitte beginnen Sie erneut über Ihre Demo.' };
}

/**
 * Schnellbestellung (13.11.2026): Tarif wählen und direkt zur Bezahlseite des Zahlungsanbieters. Firmenname, Name,
 * E-Mail, Rechnungsadresse, Wunschdomain, Unternehmer-Bestätigung und AGB-Zustimmung erfasst die Bezahlseite; die
 * Angaben für die Website (Impressum, Texte, Fotos, Datenschutzerklärung) folgen nach der Zahlung über den Link aus der
 * Bestellbestätigung. Nur dieser ausdrückliche POST erzeugt eine Bezahlsitzung; Preise kommen ausschließlich vom Server.
 */
export async function quickOrder(slug: string, _prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const meta = requestMetaFrom(await headers());
  if (meta.isBot) return { error: 'Die Bestellung ist gerade nicht möglich. Bitte versuchen Sie es erneut.' };
  const result = await startHostedCheckout(slug, String(form.get('plan') ?? ''), meta);
  if (result.ok) redirect(result.url);
  return { error: result.error };
}
