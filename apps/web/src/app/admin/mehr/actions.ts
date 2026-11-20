'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { TEST_DEVICE_COOKIE } from '@/lib/request';

/** Dieses Gerät als eigenes Testgerät markieren oder wieder freigeben (nur Betreiber). */
export async function toggleTestDevice(): Promise<void> {
  await requireAdmin();
  const jar = await cookies();
  if (jar.get(TEST_DEVICE_COOKIE)?.value === '1') jar.delete(TEST_DEVICE_COOKIE);
  else jar.set(TEST_DEVICE_COOKIE, '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 });
  revalidatePath('/admin/mehr');
}
