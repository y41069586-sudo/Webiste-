'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { approveClaim, blockClaim, ClaimApprovalError, getDb, maintainClaims, unblockClaim } from '@wbm/core';
import { actorOf, requireAdmin } from '@/lib/auth';

function back(error?: string): never {
  revalidatePath('/admin/claims');
  redirect(error ? `/admin/claims?error=${encodeURIComponent(error)}` : '/admin/claims');
}

/** Freigabe durch den Betreiber (B2) – nur mit Bestätigung, dass die Quelle selbst geprüft wurde. */
export async function approveClaimAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  const id = String(form.get('id'));
  if (form.get('checked') !== 'on') back('Bitte bestätigen, dass Sie Zahl, Wortlaut, Jahr und Stichprobe selbst geprüft haben.');
  try {
    await approveClaim(getDb(), id, actorOf(s));
  } catch (err) {
    if (err instanceof ClaimApprovalError) back(`${id}: ${err.message}`);
    throw err;
  }
  back();
}

export async function blockClaimAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  await blockClaim(getDb(), String(form.get('id')), actorOf(s));
  back();
}

export async function unblockClaimAction(form: FormData): Promise<void> {
  const s = await requireAdmin();
  try {
    await unblockClaim(getDb(), String(form.get('id')), actorOf(s));
  } catch (err) {
    if (err instanceof ClaimApprovalError) back(err.message);
    throw err;
  }
  back();
}

/** Claims-Datei neu einlesen und abgelaufene Quellen sperren (sonst täglich per Job). */
export async function syncClaimsAction(): Promise<void> {
  await requireAdmin();
  await maintainClaims(getDb());
  back();
}
