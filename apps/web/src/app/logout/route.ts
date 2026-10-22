import { cookies } from 'next/headers';
import { appUrl, logout, SESSION_COOKIE } from '@wbm/core';

export async function POST() {
  const store = await cookies();
  await logout(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
  return Response.redirect(appUrl('/login'), 303);
}
