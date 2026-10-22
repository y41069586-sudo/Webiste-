'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getEnv, login, SESSION_COOKIE } from '@wbm/core';
import { clientIpFrom, dailyIpHash } from '@/lib/request';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, form: FormData): Promise<LoginState> {
  const h = await headers();
  const res = await login({
    email: String(form.get('email') ?? ''),
    password: String(form.get('password') ?? ''),
    totp: String(form.get('totp') ?? ''),
    clientKey: dailyIpHash(clientIpFrom(h)),
  });
  if (!res.ok) {
    return {
      error:
        res.reason === 'rate_limited'
          ? 'Zu viele Versuche. Bitte in 15 Minuten erneut versuchen.'
          : res.reason === 'totp_required'
            ? 'Bitte den 6-stelligen Code aus der Authenticator-App eingeben.'
            : 'Anmeldung fehlgeschlagen.',
    };
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, res.token, {
    httpOnly: true,
    secure: getEnv().APP_URL.startsWith('https://'),
    sameSite: 'strict',
    path: '/',
    expires: res.expiresAt,
  });
  redirect('/admin');
}
