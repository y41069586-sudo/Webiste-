import { eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { leads } from '../db/schema';
import type { Actor, LeadStatus } from '../types';
import { audit } from './audit';

/** Hauptpipeline in Reihenfolge – Index = Fortschritt. */
export const PIPELINE: LeadStatus[] = [
  'discovered',
  'qualified',
  'demo_built',
  'demo_approved',
  'demo_published',
  'letter_generated',
  'letter_approved',
  'letter_sent',
  'letter_delivered',
  'followup_sent',
  'scanned',
  'cta_clicked',
  'checkout_started',
  'paid',
  'onboarding',
  'preview_approved',
  'live',
];

export function pipelineRank(status: LeadStatus): number {
  return PIPELINE.indexOf(status);
}

const REACTION_STATES: LeadStatus[] = ['scanned', 'cta_clicked', 'checkout_started'];

/** Erlaubte Übergänge (von → nach). */
export const TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  discovered: ['qualified', 'rejected', 'suppressed', 'failed'],
  qualified: ['demo_built', 'rejected', 'suppressed', 'failed', 'expired'],
  demo_built: ['demo_approved', 'qualified', 'suppressed', 'failed', 'rejected'],
  demo_approved: ['demo_published', 'qualified', 'suppressed', 'failed'],
  demo_published: ['letter_generated', 'suppressed', 'failed', 'expired', ...REACTION_STATES],
  letter_generated: ['letter_approved', 'demo_published', 'suppressed', 'failed', 'expired'],
  letter_approved: ['letter_sent', 'letter_generated', 'demo_published', 'suppressed', 'failed'],
  letter_sent: ['letter_delivered', 'suppressed', 'failed', 'expired', ...REACTION_STATES],
  letter_delivered: ['followup_sent', 'suppressed', 'expired', 'failed', ...REACTION_STATES],
  followup_sent: ['suppressed', 'expired', 'failed', ...REACTION_STATES],
  scanned: ['cta_clicked', 'checkout_started', 'paid', 'suppressed', 'expired'],
  cta_clicked: ['checkout_started', 'paid', 'suppressed', 'expired'],
  checkout_started: ['paid', 'cta_clicked', 'suppressed', 'expired'],
  paid: ['onboarding', 'failed'],
  onboarding: ['preview_approved', 'failed'],
  preview_approved: ['live', 'onboarding', 'failed'],
  live: [],
  rejected: ['qualified', 'suppressed', 'discovered'],
  suppressed: [],
  expired: ['qualified', 'suppressed', 'scanned', 'cta_clicked', 'checkout_started', 'paid'],
  failed: [
    'discovered',
    'qualified',
    'demo_built',
    'demo_published',
    'letter_generated',
    'letter_approved',
    'letter_sent',
    'paid',
    'onboarding',
    'preview_approved',
    'suppressed',
    'expired',
  ],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from].includes(to);
}

export class TransitionError extends Error {
  constructor(
    public readonly from: LeadStatus,
    public readonly to: LeadStatus,
  ) {
    super(`Unzulässiger Statuswechsel ${from} → ${to}`);
    this.name = 'TransitionError';
  }
}

export interface TransitionOptions {
  actor: Actor | string;
  reason?: string;
  context?: Record<string, unknown>;
  /** Nur in der Pipeline vorwärts gehen (für Tracking-Events); sonst still ignorieren */
  onlyForward?: boolean;
  /** Statt Fehler bei unzulässigem Wechsel `false` zurückgeben */
  soft?: boolean;
  /** Zusätzliche Felder, die mit dem Wechsel gesetzt werden */
  patch?: Partial<typeof leads.$inferInsert>;
}

/**
 * Führt einen Statuswechsel aus (mit Zeilensperre) und protokolliert ihn im Audit-Log.
 * Rückgabe: true, wenn gewechselt wurde.
 */
export async function transitionLead(db: DbOrTx, leadId: string, to: LeadStatus, opts: TransitionOptions): Promise<boolean> {
  const rows = await db.execute<{ status: LeadStatus }>(sql`SELECT status FROM leads WHERE id = ${leadId} FOR UPDATE`);
  const current = rows.rows[0]?.status;
  if (!current) throw new Error(`Lead ${leadId} nicht gefunden`);
  if (current === to) return false;

  if (opts.onlyForward) {
    const rc = pipelineRank(current);
    const rt = pipelineRank(to);
    if (rc >= 0 && rt >= 0 && rt <= rc) return false;
  }

  if (!canTransition(current, to)) {
    if (opts.soft || opts.onlyForward) return false;
    throw new TransitionError(current, to);
  }

  await db
    .update(leads)
    .set({
      ...opts.patch,
      status: to,
      statusReason: opts.reason ?? null,
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId));

  await audit(db, {
    entity: 'lead',
    entityId: leadId,
    action: `status:${current}->${to}`,
    actor: opts.actor,
    context: { from: current, to, ...(opts.reason ? { reason: opts.reason } : {}), ...opts.context },
  });
  return true;
}
