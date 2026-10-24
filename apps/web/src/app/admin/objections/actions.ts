'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { recordManualObjection } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

/** WhatsApp-Frage von Hand erfassen (es gibt keine WhatsApp-Anbindung – der Betrieb schreibt uns per Link). */
export async function recordObjectionAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const leadId = String(form.get('leadId') ?? '').trim();
  const text = String(form.get('text') ?? '');
  const source = form.get('source') === 'email' ? 'email' : 'whatsapp';
  const category = await recordManualObjection(
    { leadId: /^[0-9a-f-]{36}$/.test(leadId) ? leadId : null, text, source },
    actorOf(s),
  );
  const back = String(form.get('back') ?? '/admin/objections');
  revalidatePath('/admin/objections');
  redirect(
    `${back.startsWith('/admin/') ? back : '/admin/objections'}${back.includes('?') ? '&' : '?'}einwand=${category ?? 'keiner'}`,
  );
}
