import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, validateSession, type AdminSession } from '@wbm/core';

export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  return validateSession(store.get(SESSION_COOKIE)?.value);
});

/** Für Seiten und Server Actions: ohne gültige Session → Login. */
export async function requireAdmin(): Promise<AdminSession> {
  const s = await getAdminSession();
  if (!s) redirect('/login');
  return s;
}

/** Für API-Routen: null, wenn nicht angemeldet. */
export async function adminOrNull(): Promise<AdminSession | null> {
  return getAdminSession();
}

export function actorOf(s: AdminSession): `admin:${string}` {
  return `admin:${s.adminId}`;
}
