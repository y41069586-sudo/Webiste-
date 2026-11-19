import { and, eq, gt, inArray, lt, or, sql } from 'drizzle-orm';
import { appUrl } from '../config/env';
import { getConfig } from '../config/service';
import { getDb, type DbOrTx } from '../db/client';
import { bookings, customers, orders, sites, type BookingStatus } from '../db/schema';
import { renderEmail, type EmailContent } from '../emails/templates';
import { esc } from '../util/html';
import { logger } from '../logger';
import { getProviders } from '../providers';
import type { EmailProvider } from '../providers/types';
import { BOOKING_SLOT_MINUTES, type OnboardingData, type OnboardingDay } from '../sites/onboarding-data';
import { randomToken, sha256 } from '../util/crypto';
import { sendTransactionalEmail } from './email';

/** Gestaltung des Betriebs für die Terminseiten (gleiche Farben/Schriften wie seine Website) */
export { siteThemeFor, type SiteTheme } from '@wbm/templates';
import { rateLimit } from './rate-limit';
import { recordEvent, type RequestMeta } from './tracking';

/**
 * Terminbuchung auf Kunden-Websites (19.11.2026, Betreiberauftrag):
 * Besucher wählt eine freie Uhrzeit aus den Öffnungszeiten → Anfrage ist für 48 Stunden reserviert →
 * der Betrieb bestätigt oder lehnt per Link aus der E-Mail ab → der Besucher erhält Bestätigung (mit Kalenderdatei)
 * oder Absage. Erst nach der Bestätigung heißt es „bestätigt“. Keine Doppelbuchung (Sperre + Teil-Eindeutigkeit).
 * Personenbezogene Angaben werden 30 Tage nach dem Termin bzw. nach Absage/Ablauf gelöscht.
 */
export const BOOKING_RULES = {
  /** frühestens ab dem nächsten Kalendertag */
  leadDays: 1,
  /** höchstens so viele Tage im Voraus */
  horizonDays: 21,
  /** so lange bleibt eine unbestätigte Anfrage reserviert */
  requestHours: 48,
  /** danach werden Name, Kontakt und Nachricht gelöscht */
  retentionDays: 30,
} as const;

const TZ = 'Europe/Berlin';
const MAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;
const ACTIVE: BookingStatus[] = ['requested', 'confirmed'];

export interface BookingConfig {
  slotMinutes: number;
  days: OnboardingDay[];
}

type Site = typeof sites.$inferSelect;
type Booking = typeof bookings.$inferSelect;

/** Online-Terminwahl nur mit festen Öffnungszeiten und eingeschaltetem Schalter. */
export function bookingConfigFor(site: Pick<Site, 'onboardingJson'>): BookingConfig | null {
  const hours = (site.onboardingJson as Partial<OnboardingData> | null)?.hours;
  if (!hours || hours.mode !== 'fixed' || hours.booking === false || !Array.isArray(hours.days)) return null;
  const T = /^([01]\d|2[0-3]):[0-5]\d$/;
  const days = hours.days
    .filter((d): d is OnboardingDay => !!d && typeof d.day === 'number')
    .map((d) => ({
      day: d.day,
      closed: Boolean(d.closed) || !T.test(String(d.open)) || !T.test(String(d.close)) || String(d.open) >= String(d.close),
      open: String(d.open ?? ''),
      close: String(d.close ?? ''),
      open2: T.test(String(d.open2)) && T.test(String(d.close2)) ? String(d.open2) : '',
      close2: T.test(String(d.open2)) && T.test(String(d.close2)) ? String(d.close2) : '',
    }));
  if (!days.some((d) => !d.closed)) return null;
  const slotMinutes = BOOKING_SLOT_MINUTES.includes(Number(hours.slotMinutes) as never) ? Number(hours.slotMinutes) : 60;
  return { slotMinutes, days };
}

// ---------- Zeit (Europe/Berlin, Sommerzeit-fest) ----------

function berlinParts(d: Date): { y: number; m: number; day: number; h: number; min: number; dow: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      weekday: 'short',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday!);
  return { y: +p.year!, m: +p.month!, day: +p.day!, h: +p.hour!, min: +p.minute!, dow };
}

/** Lokale Berliner Uhrzeit → UTC (Offset zweimal bestimmt, damit Umstellungstage stimmen). */
export function berlinToUtc(y: number, m: number, day: number, h: number, min: number): Date {
  const guess = Date.UTC(y, m - 1, day, h, min);
  const offset = (t: number) => {
    const p = berlinParts(new Date(t));
    return Date.UTC(p.y, p.m - 1, p.day, p.h, p.min) - t;
  };
  let utc = guess - offset(guess);
  utc = guess - offset(utc);
  return new Date(utc);
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const pad = (n: number) => String(n).padStart(2, '0');

export function formatBookingTime(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    timeZone: TZ,
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export interface SlotDay {
  date: string;
  label: string;
  slots: { start: string; label: string }[];
}

/** Freie Zeiten der nächsten Wochen: Öffnungszeiten im Raster der Terminlänge, ohne belegte Zeiten. */
export function openSlots(cfg: BookingConfig, busy: { startsAt: Date; endsAt: Date }[], now = new Date()): SlotDay[] {
  const out: SlotDay[] = [];
  const today = berlinParts(now);
  for (let i = BOOKING_RULES.leadDays; i <= BOOKING_RULES.horizonDays; i++) {
    const noon = berlinToUtc(today.y, today.m, today.day, 12, 0);
    const date = berlinParts(new Date(noon.getTime() + i * 86_400_000));
    const day = cfg.days.find((d) => d.day === date.dow);
    if (!day || day.closed) continue;
    const periods = [
      [day.open, day.close],
      ...(day.open2 && day.close2 ? [[day.open2, day.close2]] : []),
    ].filter(([a, b]) => /^\d\d:\d\d$/.test(a!) && /^\d\d:\d\d$/.test(b!) && a! < b!);
    const slots: SlotDay['slots'] = [];
    for (const [a, b] of periods) {
      for (let t = toMin(a!); t + cfg.slotMinutes <= toMin(b!); t += cfg.slotMinutes) {
        const start = berlinToUtc(date.y, date.m, date.day, Math.floor(t / 60), t % 60);
        const end = new Date(start.getTime() + cfg.slotMinutes * 60_000);
        if (start.getTime() <= now.getTime()) continue;
        if (busy.some((x) => x.startsAt < end && x.endsAt > start)) continue;
        slots.push({ start: start.toISOString(), label: `${pad(Math.floor(t / 60))}:${pad(t % 60)}` });
      }
    }
    if (!slots.length) continue;
    out.push({
      date: `${date.y}-${pad(date.m)}-${pad(date.day)}`,
      label: new Intl.DateTimeFormat('de-DE', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(noon.getTime() + i * 86_400_000),
      slots,
    });
  }
  return out;
}

async function busyTimes(db: DbOrTx, siteId: string, now: Date) {
  return db
    .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
    .from(bookings)
    .where(
      and(
        eq(bookings.siteId, siteId),
        gt(bookings.endsAt, now),
        or(eq(bookings.status, 'confirmed'), and(eq(bookings.status, 'requested'), gt(bookings.requestExpiresAt, now))),
      ),
    );
}

export interface PublicBookingSite {
  site: Site;
  company: string;
  services: string[];
  cfg: BookingConfig;
  privacyUrl: string | null;
  websiteUrl: string | null;
}

/** Nur live geschaltete, bezahlte Websites mit Online-Terminwahl. */
export async function findBookingSite(formKey: string, db: DbOrTx = getDb()): Promise<PublicBookingSite | null> {
  if (!/^[A-Za-z0-9]{24}$/.test(formKey)) return null;
  const site = await db.query.sites.findFirst({ where: eq(sites.formKey, formKey) });
  if (!site || site.status !== 'live' || !site.formTargetEmail) return null;
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, site.customerId) });
  const order = customer ? await db.query.orders.findFirst({ where: eq(orders.id, customer.orderId) }) : null;
  if (!customer || !order || order.status !== 'paid') return null;
  if (order.provider === 'stripe' && order.paymentMode === 'test') return null;
  const cfg = bookingConfigFor(site);
  if (!cfg) return null;
  const content = site.contentJson as { services?: { title?: string }[] } | null;
  const services = (content?.services ?? []).map((s) => String(s.title ?? '').trim()).filter(Boolean).slice(0, 8);
  const base = site.productionUrl ?? null;
  return {
    site,
    company: customer.company,
    services,
    cfg,
    privacyUrl: base ? new URL('datenschutz.html', base).toString() : null,
    websiteUrl: base,
  };
}

export async function bookingSlotsFor(b: PublicBookingSite, now = new Date()): Promise<SlotDay[]> {
  return openSlots(b.cfg, await busyTimes(getDb(), b.site.id, now), now);
}

export interface BookingInput {
  start: string;
  service: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean;
  honeypot: string;
}

export function bookingInput(form: FormData): BookingInput {
  const f = (k: string) => (typeof form.get(k) === 'string' ? String(form.get(k)) : '');
  return {
    start: f('start'),
    service: f('leistung'),
    name: f('name'),
    email: f('email'),
    phone: f('phone'),
    message: f('message'),
    consent: form.get('consent') === 'on',
    honeypot: f('website'),
  };
}

export type BookingRequestResult =
  | { ok: true; bookingId: string; startsAt: Date }
  | { ok: false; reason: 'not_found' | 'invalid' | 'taken' | 'rate_limited' | 'unavailable' };

const clean = (s: string, max: number) => s.trim().replace(/[\r\n]+/g, ' ').slice(0, max);

/** Terminanfrage annehmen: Zeit unter Sperre erneut prüfen, speichern, Betrieb und Besucher benachrichtigen. */
export async function requestBooking(
  formKey: string,
  input: BookingInput,
  meta: RequestMeta,
  opts: { now?: Date; provider?: EmailProvider } = {},
): Promise<BookingRequestResult> {
  const now = opts.now ?? new Date();
  const db = getDb();
  const b = await findBookingSite(formKey, db);
  if (!b) return { ok: false, reason: 'not_found' };
  // Honeypot: wie Erfolg aussehen lassen, aber nichts tun
  if (input.honeypot.trim()) return { ok: false, reason: 'invalid' };
  const email = input.email.trim();
  const start = new Date(input.start);
  if (
    !input.consent ||
    input.name.trim().length < 2 ||
    input.name.trim().length > 120 ||
    !MAIL_RE.test(email) ||
    email.length > 254 ||
    input.phone.replace(/\D/g, '').length < 6 ||
    input.phone.length > 40 ||
    input.message.trim().length < 3 ||
    input.message.length > 2000 ||
    input.service.length > 120 ||
    (input.message.match(/https?:\/\//g) ?? []).length > 2 ||
    Number.isNaN(start.getTime())
  )
    return { ok: false, reason: 'invalid' };
  const provider = opts.provider ?? getProviders().email;
  if (provider.name === 'mock') return { ok: false, reason: 'unavailable' };
  const r1 = await rateLimit(db, `booking:${b.site.id}:${meta.ipHash}`, 4, 3600);
  const r2 = await rateLimit(db, `booking:${b.site.id}`, 60, 86_400);
  if (!r1.allowed || !r2.allowed) return { ok: false, reason: 'rate_limited' };

  const businessToken = randomToken(32);
  const visitorToken = randomToken(32);
  const end = new Date(start.getTime() + b.cfg.slotMinutes * 60_000);
  let bookingId: string;
  try {
    bookingId = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`booking:${b.site.id}`}))`);
      // Abgelaufene Anfragen freigeben, bevor die Zeit erneut geprüft wird
      await tx
        .update(bookings)
        .set({ status: 'expired', updatedAt: now })
        .where(and(eq(bookings.siteId, b.site.id), eq(bookings.status, 'requested'), lt(bookings.requestExpiresAt, now)));
      const free = openSlots(b.cfg, await busyTimes(tx, b.site.id, now), now).some((d) =>
        d.slots.some((s) => s.start === start.toISOString()),
      );
      if (!free) throw new SlotTakenError();
      const [row] = await tx
        .insert(bookings)
        .values({
          siteId: b.site.id,
          status: 'requested',
          service: clean(input.service, 120) || null,
          startsAt: start,
          endsAt: end,
          visitorName: clean(input.name, 120),
          visitorEmail: email,
          visitorPhone: clean(input.phone, 40),
          message: input.message.trim().slice(0, 2000) || null,
          businessTokenHash: sha256(businessToken),
          visitorTokenHash: sha256(visitorToken),
          requestExpiresAt: new Date(now.getTime() + BOOKING_RULES.requestHours * 3_600_000),
        })
        .returning({ id: bookings.id });
      return row!.id;
    });
  } catch (err) {
    if (err instanceof SlotTakenError || (err as { code?: string }).code === '23505') return { ok: false, reason: 'taken' };
    throw err;
  }
  const booking = (await db.query.bookings.findFirst({ where: eq(bookings.id, bookingId) }))!;
  const cfg = await getConfig();
  try {
    await sendTransactionalEmail(
      {
        kind: 'booking_request_business',
        idempotencyKey: `booking:${bookingId}:request:business`,
        to: b.site.formTargetEmail!,
        replyTo: email,
        customerId: b.site.customerId,
        ...businessRequestEmail(cfg, b.company, booking, businessToken),
      },
      { provider },
    );
  } catch (err) {
    // Ohne Nachricht an den Betrieb keine offene Reservierung: Zeit sofort wieder freigeben
    await db.update(bookings).set({ status: 'cancelled', updatedAt: new Date() }).where(eq(bookings.id, bookingId));
    logger.error({ siteId: b.site.id, errorClass: err instanceof Error ? err.name : 'Error' }, 'Terminanfrage: Betrieb nicht erreichbar');
    return { ok: false, reason: 'unavailable' };
  }
  await sendTransactionalEmail(
    {
      kind: 'booking_request_visitor',
      idempotencyKey: `booking:${bookingId}:request:visitor`,
      to: email,
      replyTo: b.site.formTargetEmail!,
      customerId: b.site.customerId,
      ...visitorEmail(b.company, booking, 'requested', visitorToken),
    },
    { provider },
  ).catch((err) =>
    logger.warn({ siteId: b.site.id, errorClass: err instanceof Error ? err.name : 'Error' }, 'Terminanfrage: Eingangsbestätigung fehlgeschlagen'),
  );
  await bookingEvent(b.site.customerId, b.site.id, 'requested');
  return { ok: true, bookingId, startsAt: start };
}

class SlotTakenError extends Error {}

async function bookingEvent(customerId: string, siteId: string, step: 'requested' | 'confirmed' | 'declined' | 'cancelled' | 'expired') {
  const db = getDb();
  const customer = await db.query.customers.findFirst({ where: eq(customers.id, customerId) });
  if (!customer?.leadId) return;
  // Nur Schritt und Website, keine Namen, Kontakte oder Zeiten (Datensparsamkeit)
  await recordEvent(db, { leadId: customer.leadId, type: 'site_booking', meta: { siteId, step } }).catch(() => undefined);
}

export interface BookingView {
  booking: Booking;
  company: string;
  siteId: string;
  templateId: string;
  formTargetEmail: string;
}

async function viewFor(booking: Booking | undefined): Promise<BookingView | null> {
  if (!booking) return null;
  const db = getDb();
  const site = await db.query.sites.findFirst({ where: eq(sites.id, booking.siteId) });
  const customer = site ? await db.query.customers.findFirst({ where: eq(customers.id, site.customerId) }) : null;
  if (!site || !customer || !site.formTargetEmail) return null;
  return { booking, company: customer.company, siteId: site.id, templateId: site.templateId, formTargetEmail: site.formTargetEmail };
}

const tokenOk = (t: string) => /^[A-Za-z0-9]{32}$/.test(t);

export async function bookingForBusiness(token: string): Promise<BookingView | null> {
  if (!tokenOk(token)) return null;
  return viewFor(await getDb().query.bookings.findFirst({ where: eq(bookings.businessTokenHash, sha256(token)) }));
}

export async function bookingForVisitor(token: string): Promise<BookingView | null> {
  if (!tokenOk(token)) return null;
  return viewFor(await getDb().query.bookings.findFirst({ where: eq(bookings.visitorTokenHash, sha256(token)) }));
}

export type DecisionResult =
  | { ok: true; status: BookingStatus }
  | { ok: false; reason: 'not_found' | 'not_open' | 'expired' | 'past' | 'reason_required' };

/**
 * Entscheidung des Betriebs (Bestätigen / Ablehnen / bestätigten Termin absagen). Nur per POST aus der Aktionsseite,
 * damit Link-Vorschauen von Mailprogrammen nichts auslösen. Idempotent: gleiche Entscheidung zweimal = kein Fehler.
 */
export async function decideBooking(
  token: string,
  action: 'confirm' | 'decline' | 'cancel',
  note = '',
  opts: { now?: Date; provider?: EmailProvider } = {},
): Promise<DecisionResult> {
  const now = opts.now ?? new Date();
  const view = await bookingForBusiness(token);
  if (!view) return { ok: false, reason: 'not_found' };
  const target: BookingStatus = action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : 'cancelled';
  const cur = view.booking;
  if (cur.status === target) return { ok: true, status: target };
  if (action === 'cancel' ? cur.status !== 'confirmed' : cur.status !== 'requested') return { ok: false, reason: 'not_open' };
  if (cur.startsAt <= now) return { ok: false, reason: 'past' };
  if (action !== 'cancel' && cur.requestExpiresAt < now) return { ok: false, reason: 'expired' };
  // Ablehnen und Absagen nur mit Grund (Betreiber, 19.11.2026): der Besucher erfährt, warum
  if (action !== 'confirm' && clean(note, 500).length < 3) return { ok: false, reason: 'reason_required' };
  const db = getDb();
  const [row] = await db
    .update(bookings)
    .set({ status: target, decidedAt: now, decisionNote: clean(note, 500) || null, updatedAt: now })
    .where(and(eq(bookings.id, cur.id), eq(bookings.status, cur.status)))
    .returning();
  if (!row) return { ok: false, reason: 'not_open' };
  if (row.visitorEmail) {
    await sendTransactionalEmail(
      {
        kind: `booking_${target}_visitor`,
        idempotencyKey: `booking:${row.id}:${target}:visitor`,
        to: row.visitorEmail,
        replyTo: view.formTargetEmail,
        customerId: null,
        ...visitorEmail(view.company, row, target, null),
        ...(target === 'confirmed'
          ? { attachments: [{ filename: 'termin.ics', content: Buffer.from(icsFor(view.company, row)), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }] }
          : {}),
      },
      { provider: opts.provider },
    );
  }
  const site = await db.query.sites.findFirst({ where: eq(sites.id, view.siteId) });
  if (site) await bookingEvent(site.customerId, site.id, target === 'confirmed' ? 'confirmed' : target === 'declined' ? 'declined' : 'cancelled');
  return { ok: true, status: target };
}

/** Absage durch den Besucher (Link aus seiner E-Mail, ebenfalls nur per POST). */
export async function cancelByVisitor(token: string, opts: { now?: Date; provider?: EmailProvider } = {}): Promise<DecisionResult> {
  const now = opts.now ?? new Date();
  const view = await bookingForVisitor(token);
  if (!view) return { ok: false, reason: 'not_found' };
  const cur = view.booking;
  if (cur.status === 'cancelled') return { ok: true, status: 'cancelled' };
  if (!ACTIVE.includes(cur.status)) return { ok: false, reason: 'not_open' };
  if (cur.startsAt <= now) return { ok: false, reason: 'past' };
  const db = getDb();
  const [row] = await db
    .update(bookings)
    .set({ status: 'cancelled', decidedAt: now, updatedAt: now })
    .where(and(eq(bookings.id, cur.id), inArray(bookings.status, ACTIVE)))
    .returning();
  if (!row) return { ok: false, reason: 'not_open' };
  const cfg = await getConfig();
  await sendTransactionalEmail(
    {
      kind: 'booking_cancelled_business',
      idempotencyKey: `booking:${row.id}:cancelled:business`,
      to: view.formTargetEmail,
      ...(row.visitorEmail ? { replyTo: row.visitorEmail } : {}),
      ...renderEmail(cfg, {
        subject: `Termin abgesagt: ${formatBookingTime(row.startsAt)}`,
        heading: 'Termin vom Kunden abgesagt',
        noGreeting: true,
        noSpamHint: true,
        blocks: [
          `${row.visitorName ?? 'Die anfragende Person'} hat den Termin am ${formatBookingTime(row.startsAt)} Uhr abgesagt.`,
          'Die Zeit ist auf Ihrer Website wieder frei.',
        ],
      }),
    },
    { provider: opts.provider },
  );
  const site = await db.query.sites.findFirst({ where: eq(sites.id, view.siteId) });
  if (site) await bookingEvent(site.customerId, site.id, 'cancelled');
  return { ok: true, status: 'cancelled' };
}

/**
 * Regelmäßiger Lauf: unbeantwortete Anfragen nach 48 Stunden schließen (Besucher und Betrieb erfahren es),
 * Angaben alter Termine löschen.
 */
export async function sweepBookings(now = new Date(), opts: { provider?: EmailProvider } = {}): Promise<{ expired: number; purged: number }> {
  const db = getDb();
  const due = await db
    .update(bookings)
    .set({ status: 'expired', updatedAt: now })
    .where(and(eq(bookings.status, 'requested'), lt(bookings.requestExpiresAt, now)))
    .returning();
  for (const row of due) {
    const view = await viewFor(row);
    if (!view || !row.visitorEmail) continue;
    await sendTransactionalEmail(
      {
        kind: 'booking_expired_visitor',
        idempotencyKey: `booking:${row.id}:expired:visitor`,
        to: row.visitorEmail,
        replyTo: view.formTargetEmail,
        ...visitorEmail(view.company, row, 'expired', null),
      },
      { provider: opts.provider },
    ).catch(() => undefined);
    const site = await db.query.sites.findFirst({ where: eq(sites.id, view.siteId) });
    if (site) await bookingEvent(site.customerId, site.id, 'expired');
  }
  const cutoff = new Date(now.getTime() - BOOKING_RULES.retentionDays * 86_400_000);
  const purged = await db
    .delete(bookings)
    .where(
      or(
        lt(bookings.endsAt, cutoff),
        and(inArray(bookings.status, ['declined', 'cancelled', 'expired']), lt(bookings.updatedAt, cutoff)),
      ),
    )
    .returning({ id: bookings.id });
  return { expired: due.length, purged: purged.length };
}

// ---------- E-Mails ----------

function businessRequestEmail(cfg: Awaited<ReturnType<typeof getConfig>>, company: string, b: Booking, token: string): EmailContent {
  const when = formatBookingTime(b.startsAt);
  const link = appUrl(`/termin/aktion/${token}`);
  return renderEmail(cfg, {
    subject: `Neue Terminanfrage: ${when} Uhr – ${b.visitorName ?? ''}`.trim(),
    heading: 'Neue Terminanfrage über Ihre Website',
    preheader: `${when} Uhr – bitte bestätigen oder ablehnen`,
    noGreeting: true,
    noSpamHint: true,
    blocks: [
      {
        box: [
          `Termin: ${when} Uhr (${Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000)} Minuten)`,
          ...(b.service ? [`Leistung: ${b.service}`] : []),
          `Name: ${b.visitorName ?? ''}`,
          `E-Mail: ${b.visitorEmail ?? ''}`,
          ...(b.visitorPhone ? [`Telefon: ${b.visitorPhone}`] : []),
          ...(b.message ? ['', b.message] : []),
        ].join('\n'),
      },
      `Die Zeit ist für Sie reserviert, bis Sie entscheiden – höchstens bis ${formatBookingTime(b.requestExpiresAt)} Uhr. Ohne Entscheidung wird die Anfrage dann automatisch abgesagt und die Zeit wieder frei.`,
      { button: { href: link, label: 'Termin bestätigen oder ablehnen' } },
      'Anderen Termin vorschlagen: Antworten Sie einfach auf diese E-Mail – die Antwort geht direkt an die anfragende Person. Lehnen Sie die Anfrage danach über den Knopf ab, damit die Zeit wieder frei ist.',
      { small: `Gesendet über die Website von ${company}. Erst nach Ihrer Bestätigung erhält die Person eine Terminbestätigung.` },
    ],
  });
}

function visitorEmail(company: string, b: Booking, state: BookingStatus, cancelToken: string | null): EmailContent {
  const when = formatBookingTime(b.startsAt);
  const name = b.visitorName ? `Guten Tag ${b.visitorName},` : 'Guten Tag,';
  const cancel = cancelToken ? appUrl(`/termin/absagen/${cancelToken}`) : null;
  const t: Record<string, { subject: string; lines: string[] }> = {
    requested: {
      subject: `Ihre Terminanfrage bei ${company}: ${when} Uhr`,
      lines: [
        `Ihre Terminanfrage für ${when} Uhr ist bei ${company} eingegangen.`,
        'Der Termin ist noch nicht bestätigt. Sie erhalten eine weitere E-Mail, sobald der Betrieb bestätigt oder absagt.',
        ...(b.service ? [`Leistung: ${b.service}`] : []),
      ],
    },
    confirmed: {
      subject: `Termin bestätigt: ${when} Uhr bei ${company}`,
      lines: [
        `${company} hat Ihren Termin am ${when} Uhr bestätigt.`,
        ...(b.decisionNote ? [`Hinweis vom Betrieb: ${b.decisionNote}`] : []),
        'Im Anhang finden Sie den Termin für Ihren Kalender. Bei Fragen antworten Sie einfach auf diese E-Mail.',
      ],
    },
    declined: {
      subject: `Terminanfrage abgesagt: ${when} Uhr bei ${company}`,
      lines: [
        `${company} kann den Termin am ${when} Uhr leider nicht wahrnehmen.`,
        ...(b.decisionNote ? [`Hinweis vom Betrieb: ${b.decisionNote}`] : []),
        'Sie können auf der Website eine andere Zeit wählen oder auf diese E-Mail antworten.',
      ],
    },
    cancelled: {
      subject: `Termin abgesagt: ${when} Uhr bei ${company}`,
      lines: [
        `${company} musste den Termin am ${when} Uhr leider absagen.`,
        ...(b.decisionNote ? [`Hinweis vom Betrieb: ${b.decisionNote}`] : []),
        'Antworten Sie auf diese E-Mail, um einen neuen Termin abzustimmen.',
      ],
    },
    expired: {
      subject: `Terminanfrage nicht bestätigt: ${when} Uhr bei ${company}`,
      lines: [
        `Ihre Terminanfrage für ${when} Uhr wurde von ${company} nicht rechtzeitig bestätigt und ist deshalb nicht zustande gekommen.`,
        'Sie können auf der Website eine neue Zeit wählen oder auf diese E-Mail antworten.',
      ],
    },
  };
  const c = t[state]!;
  const footer = `Diese Nachricht wurde über die Website von ${company} versendet. Ihre Angaben werden nur für diesen Termin verwendet und spätestens ${BOOKING_RULES.retentionDays} Tage nach dem Termin gelöscht.`;
  const text = [name, '', ...c.lines, ...(cancel ? ['', `Termin absagen: ${cancel}`] : []), '', `Viele Grüße`, company, '', '--', footer].join('\n');
  const p = (s: string) => `<p style="margin:0 0 14px;font:16px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1b1c1e">${esc(s)}</p>`;
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title></head><body style="margin:0;padding:24px 12px;background:#f5f5f4"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e2df;border-radius:8px"><tr><td style="padding:28px 24px">${p(name)}${c.lines.map(p).join('')}${cancel ? `<p style="margin:18px 0"><a href="${esc(cancel)}" style="display:inline-block;padding:12px 18px;border:1.5px solid #1b1c1e;border-radius:6px;color:#1b1c1e;font:600 15px -apple-system,Segoe UI,Roboto,Arial,sans-serif;text-decoration:none">Termin absagen</a></p>` : ''}${p('Viele Grüße')}${p(company)}<p style="margin:20px 0 0;font:12px/1.5 -apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#6b6b66">${esc(footer)}</p></td></tr></table></body></html>`;
  return { subject: c.subject, text, html };
}

/** Kalenderdatei (RFC 5545) in UTC, ohne personenbezogene Angaben außer dem Betrieb. */
export function icsFor(company: string, b: Pick<Booking, 'id' | 'startsAt' | 'endsAt' | 'service'>): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const escIcs = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SeitenWerk//Termin//DE',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@seitenwerk`,
    `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(b.startsAt)}`,
    `DTEND:${f(b.endsAt)}`,
    `SUMMARY:${escIcs(`Termin bei ${company}${b.service ? `: ${b.service}` : ''}`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}
