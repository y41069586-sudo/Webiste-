'use server';

import { revalidatePath } from 'next/cache';
import {
  adminChangeRequest,
  approveDomainPurchase,
  changeCustomerDomain,
  enqueue,
  QUEUES,
  rebuildPreview,
  redeploySite,
  resolveChangeRequest,
  setSiteSuspended,
} from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

const back = (id: string) => revalidatePath(`/admin/customers/${id}`);

export async function approveDomainAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  if (form.get('confirm') !== 'on') throw new Error('Bitte bestätigen, dass die Domain kostenpflichtig registriert werden soll.');
  const id = String(form.get('customerId'));
  await approveDomainPurchase(id, actorOf(s));
  back(id);
}

export async function rebuildAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await rebuildPreview(String(form.get('siteId')), actorOf(s));
  back(String(form.get('customerId')));
}

export async function redeployAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await redeploySite(String(form.get('siteId')), actorOf(s));
  back(String(form.get('customerId')));
}

export async function liveCheckAction(form: FormData): Promise<void> {
  await requireAdmin();
  await enqueue(
    QUEUES.liveCheck,
    { siteId: String(form.get('siteId')), attempt: 0 },
    { singletonKey: `live-manual-${Date.now()}` },
  );
  back(String(form.get('customerId')));
}

export async function adminChangeAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const resolves = String(form.get('resolves') ?? '') || undefined;
  await adminChangeRequest(String(form.get('siteId')), String(form.get('text') ?? ''), actorOf(s), resolves);
  back(String(form.get('customerId')));
}

export async function resolveChangeAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await resolveChangeRequest(String(form.get('id')), actorOf(s), String(form.get('note') ?? ''));
  back(String(form.get('customerId')));
}

export async function suspendAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await setSiteSuspended(String(form.get('siteId')), form.get('suspend') === '1', actorOf(s));
  back(String(form.get('customerId')));
}

export async function changeDomainAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('customerId'));
  await changeCustomerDomain(id, String(form.get('domain') ?? ''), actorOf(s));
  back(id);
}
