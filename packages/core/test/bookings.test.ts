import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetEnvCache } from '../src/config/env';
import { getDb } from '../src/db/client';
import { bookings, customers, demos, events, leads, orders, sites } from '../src/db/schema';
import { updateConfig } from '../src/config/service';
import { resetProviders, setProviders } from '../src/providers';
import type { OutgoingEmail } from '../src/providers/types';
import {
  berlinToUtc,
  bookingConfigFor,
  bookingForBusiness,
  cancelByVisitor,
  decideBooking,
  findBookingSite,
  icsFor,
  openSlots,
  requestBooking,
  requestDemoTestBooking,
  sweepBookings,
  type BookingInput,
} from '../src/services/bookings';
import { randomToken } from '../src/util/crypto';
import { resetDb } from './helpers';

const meta = { ua: 'test-browser', ipHash: 'test-ip-hash', isBot: false };
const sent: OutgoingEmail[] = [];
// Montag, 23.11.2026, 10:00 Uhr Berlin
const NOW = berlinToUtc(2026, 11, 23, 10, 0);
const week = [1, 2, 3, 4, 5, 6, 0].map((day) => ({
  day,
  closed: day === 0 || day === 6,
  open: '08:00',
  close: '12:00',
  open2: '',
  close2: '',
}));

beforeEach(async () => {
  await resetDb();
  resetEnvCache();
  resetProviders();
  sent.length = 0;
  setProviders({
    email: {
      name: 'resend',
      async send(mail) {
        sent.push(mail);
        return { messageId: `test-mail-${sent.length}` };
      },
    },
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  resetEnvCache();
  resetProviders();
});

async function fixture(opts: { booking?: boolean; sandbox?: boolean; mode?: 'fixed' | 'appointment' } = {}) {
  const db = getDb();
  const [lead] = await db
    .insert(leads)
    .values({
      source: 'mock',
      sourceId: randomUUID(),
      businessName: 'FIKTIVER TEST Dachdeckerei',
      branch: 'dachdecker',
      branchGroup: 'handwerk',
      city: 'Testort',
      segmentKey: 'test',
      trackToken: randomToken(24),
    })
    .returning();
  const [order] = await db
    .insert(orders)
    .values({
      leadId: lead!.id,
      provider: 'stripe',
      paymentMode: opts.sandbox ? 'test' : 'live',
      status: 'paid',
      amountCents: 59700,
      netCents: 59700,
      customerEmail: 'billing@client.test',
      customerCompany: 'FIKTIVER TEST Dachdeckerei',
      customerName: 'Testinhaber',
      billingAddressJson: { street: 'Testweg 1', postalCode: '12345', city: 'Testort', country: 'DE' },
    })
    .returning();
  const [customer] = await db
    .insert(customers)
    .values({
      orderId: order!.id,
      leadId: lead!.id,
      company: order!.customerCompany,
      contactName: 'Testinhaber',
      email: order!.customerEmail,
      accessToken: randomToken(32),
      domain: 'dach.example.test',
    })
    .returning();
  const [site] = await db
    .insert(sites)
    .values({
      customerId: customer!.id,
      templateId: 'praxis-projekt',
      palette: 'anthrazit',
      contentJson: { services: [{ title: 'Dachreparatur' }, { title: 'Dachsanierung' }] },
      onboardingJson: { hours: { mode: opts.mode ?? 'fixed', days: week, booking: opts.booking ?? true, slotMinutes: 60 } },
      formKey: randomToken(24),
      formTargetEmail: 'betrieb@client.test',
      status: 'live',
      productionUrl: 'https://dach.example.test/',
    })
    .returning();
  return { lead: lead!, site: site! };
}

const input = (start: Date, extra: Partial<BookingInput> = {}): BookingInput => ({
  start: start.toISOString(),
  service: 'Dachreparatur',
  name: 'Testbesucherin',
  email: 'besucherin@request.test',
  phone: '0123 456789',
  message: 'Ziegel locker',
  consent: true,
  honeypot: '',
  ...extra,
});

const tokenFrom = (mail: OutgoingEmail, path: string) => mail.text.match(new RegExp(`${path}/([A-Za-z0-9]{32})`))![1]!;

describe('Freie Zeiten', () => {
  it('rechnet Berliner Zeit sommerzeitfest in UTC um', () => {
    expect(berlinToUtc(2026, 11, 24, 9, 0).toISOString()).toBe('2026-11-24T08:00:00.000Z');
    expect(berlinToUtc(2026, 7, 14, 9, 0).toISOString()).toBe('2026-07-14T07:00:00.000Z');
    expect(berlinToUtc(2027, 3, 29, 9, 0).toISOString()).toBe('2027-03-29T07:00:00.000Z');
  });

  it('nur Öffnungszeiten im Terminraster, frühestens morgen, ohne Wochenende und ohne belegte Zeiten', () => {
    const days = openSlots({ slotMinutes: 60, days: week }, [], NOW);
    expect(days[0]!.date).toBe('2026-11-24');
    expect(days[0]!.slots.map((s) => s.label)).toEqual(['08:00', '09:00', '10:00', '11:00']);
    expect(days.some((d) => d.date === '2026-11-28' || d.date === '2026-11-29')).toBe(false);
    expect(days.every((d) => d.date <= '2026-12-14')).toBe(true);
    const busy = [{ startsAt: berlinToUtc(2026, 11, 24, 9, 30), endsAt: berlinToUtc(2026, 11, 24, 10, 30) }];
    expect(openSlots({ slotMinutes: 60, days: week }, busy, NOW)[0]!.slots.map((s) => s.label)).toEqual(['08:00', '11:00']);
  });

  it('Terminwahl nur mit festen Öffnungszeiten und eingeschaltetem Schalter', () => {
    expect(bookingConfigFor({ onboardingJson: { hours: { mode: 'fixed', days: week } } })).toMatchObject({ slotMinutes: 60 });
    expect(bookingConfigFor({ onboardingJson: { hours: { mode: 'fixed', days: week, booking: false } } })).toBeNull();
    expect(bookingConfigFor({ onboardingJson: { hours: { mode: 'appointment', days: week } } })).toBeNull();
    expect(bookingConfigFor({ onboardingJson: null })).toBeNull();
  });
});

describe('Buchung, Bestätigung, Absage', () => {
  it('Anfrage reserviert die Zeit, Betrieb bekommt Bestätigen/Ablehnen, Besucher eine Eingangsmail; keine Doppelbuchung', async () => {
    const { site } = await fixture();
    const slot = berlinToUtc(2026, 11, 24, 9, 0);
    const res = await requestBooking(site.formKey, input(slot), meta, { now: NOW });
    expect(res.ok).toBe(true);
    expect(sent.map((m) => m.to).sort()).toEqual(['besucherin@request.test', 'betrieb@client.test']);
    const toBusiness = sent.find((m) => m.to === 'betrieb@client.test')!;
    const toVisitor = sent.find((m) => m.to === 'besucherin@request.test')!;
    expect(toBusiness.replyTo).toBe('besucherin@request.test');
    expect(toBusiness.text).toContain('Termin bestätigen oder ablehnen');
    expect(toBusiness.text).toContain('Dachreparatur');
    expect(toVisitor.replyTo).toBe('betrieb@client.test');
    expect(toVisitor.text).toContain('noch nicht bestätigt');
    // gleiche Zeit nochmal: vergeben
    expect(await requestBooking(site.formKey, input(slot, { email: 'zweite@request.test' }), { ...meta, ipHash: 'x' }, { now: NOW })).toEqual({
      ok: false,
      reason: 'taken',
    });
    const b = (await findBookingSite(site.formKey))!;
    const free = openSlots(b.cfg, [{ startsAt: slot, endsAt: new Date(slot.getTime() + 3_600_000) }], NOW)[0]!.slots.map((s) => s.label);
    expect(free).not.toContain('09:00');
  });

  it('gleichzeitige Anfragen für dieselbe Zeit: genau eine gewinnt', async () => {
    const { site } = await fixture();
    const slot = berlinToUtc(2026, 11, 25, 8, 0);
    const results = await Promise.all(
      [1, 2, 3].map((i) => requestBooking(site.formKey, input(slot, { email: `p${i}@request.test` }), { ...meta, ipHash: `ip${i}` }, { now: NOW })),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === 'taken')).toHaveLength(2);
    expect(await getDb().select().from(bookings)).toHaveLength(1);
  });

  it('ungültige Zeiten und Angaben werden abgelehnt', async () => {
    const { site } = await fixture();
    for (const bad of [
      input(berlinToUtc(2026, 11, 23, 11, 0)), // heute (zu früh)
      input(berlinToUtc(2026, 11, 28, 9, 0)), // Samstag geschlossen
      input(berlinToUtc(2026, 11, 24, 9, 30)), // nicht im Raster
      input(berlinToUtc(2026, 11, 24, 12, 0)), // nach Ladenschluss
      input(berlinToUtc(2027, 1, 20, 9, 0)), // zu weit voraus
    ])
      expect((await requestBooking(site.formKey, bad, meta, { now: NOW })).ok).toBe(false);
    const slot = berlinToUtc(2026, 11, 24, 10, 0);
    expect(await requestBooking(site.formKey, input(slot, { email: '' }), meta, { now: NOW })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await requestBooking(site.formKey, input(slot, { consent: false }), meta, { now: NOW })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await requestBooking(site.formKey, input(slot, { message: '  ' }), meta, { now: NOW })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await requestBooking(site.formKey, input(slot, { phone: '' }), meta, { now: NOW })).toMatchObject({ ok: false, reason: 'invalid' });
    expect(await requestBooking(site.formKey, input(slot, { phone: '12' }), meta, { now: NOW })).toMatchObject({ ok: false, reason: 'invalid' });
    // genaue Meldung je Feld; Autofill im (umbenannten) Spam-Feld wird als solches erkannt
    expect(await requestBooking(site.formKey, input(slot, { phone: '12' }), meta, { now: NOW })).toMatchObject({ field: 'phone' });
    expect(await requestBooking(site.formKey, input(slot, { consent: false }), meta, { now: NOW })).toMatchObject({ field: 'consent' });
    expect(await requestBooking(site.formKey, input(slot, { honeypot: 'https://x.test' }), meta, { now: NOW })).toMatchObject({ field: 'spam' });
    expect(sent).toHaveLength(0);
  });

  it('Bestätigen: Besucher bekommt Bestätigung mit Kalenderdatei; nur offene Anfragen; zweimal klicken schadet nicht', async () => {
    const { site, lead } = await fixture();
    await requestBooking(site.formKey, input(berlinToUtc(2026, 11, 24, 8, 0)), meta, { now: NOW });
    const token = tokenFrom(sent.find((m) => m.text.includes('/termin/aktion'))!, '/termin/aktion');
    sent.length = 0;
    expect(await decideBooking(token, 'confirm', 'Bitte bei Müller klingeln', { now: NOW })).toEqual({ ok: true, status: 'confirmed' });
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('besucherin@request.test');
    expect(sent[0]!.subject).toContain('Termin bestätigt');
    expect(sent[0]!.text).toContain('Bitte bei Müller klingeln');
    expect(sent[0]!.attachments?.[0]?.filename).toBe('termin.ics');
    expect(String(sent[0]!.attachments?.[0]?.content)).toContain('DTSTART:20261124T070000Z');
    expect(await decideBooking(token, 'confirm', '', { now: NOW })).toEqual({ ok: true, status: 'confirmed' });
    expect(await decideBooking(token, 'decline', '', { now: NOW })).toEqual({ ok: false, reason: 'not_open' });
    expect(sent).toHaveLength(1);
    // Ereignisse ohne Namen, Kontakte oder Zeiten
    const ev = await getDb().select().from(events).where(eq(events.leadId, lead.id));
    expect(ev.map((e) => (e.metaJson as { step?: string }).step).sort()).toEqual(['confirmed', 'requested']);
    expect(JSON.stringify(ev.map((e) => e.metaJson))).not.toMatch(/besucherin|Testbesucherin|0123|2026-11-24/);
    // bestätigten Termin absagen
    sent.length = 0;
    expect(await decideBooking(token, 'cancel', 'Krankheit', { now: NOW })).toEqual({ ok: true, status: 'cancelled' });
    expect(sent[0]!.subject).toContain('Termin abgesagt');
  });

  it('Ablehnen gibt die Zeit frei und informiert den Besucher', async () => {
    const { site } = await fixture();
    const slot = berlinToUtc(2026, 11, 24, 11, 0);
    await requestBooking(site.formKey, input(slot), meta, { now: NOW });
    const token = tokenFrom(sent.find((m) => m.text.includes('/termin/aktion'))!, '/termin/aktion');
    sent.length = 0;
    expect(await decideBooking(token, 'decline', '', { now: NOW })).toEqual({ ok: false, reason: 'reason_required' });
    expect(sent).toHaveLength(0);
    expect(await decideBooking(token, 'decline', 'Gern Donnerstag', { now: NOW })).toEqual({ ok: true, status: 'declined' });
    expect(sent[0]!.subject).toContain('abgesagt');
    expect(sent[0]!.text).toContain('Gern Donnerstag');
    expect((await requestBooking(site.formKey, input(slot, { email: 'neu@request.test' }), { ...meta, ipHash: 'y' }, { now: NOW })).ok).toBe(true);
  });

  it('Absage durch den Besucher informiert den Betrieb', async () => {
    const { site } = await fixture();
    await requestBooking(site.formKey, input(berlinToUtc(2026, 11, 26, 9, 0)), meta, { now: NOW });
    const visitorToken = tokenFrom(sent.find((m) => m.text.includes('/termin/absagen'))!, '/termin/absagen');
    sent.length = 0;
    expect(await cancelByVisitor(visitorToken, { now: NOW })).toEqual({ ok: true, status: 'cancelled' });
    expect(sent[0]!.to).toBe('betrieb@client.test');
    expect(sent[0]!.subject).toContain('Termin abgesagt');
  });

  it('ohne Antwort nach 48 Stunden verfällt die Anfrage; alte Angaben werden gelöscht', async () => {
    const { site } = await fixture();
    const slot = berlinToUtc(2026, 12, 1, 9, 0);
    await requestBooking(site.formKey, input(slot), meta, { now: NOW });
    const token = tokenFrom(sent.find((m) => m.text.includes('/termin/aktion'))!, '/termin/aktion');
    sent.length = 0;
    const later = new Date(NOW.getTime() + 49 * 3_600_000);
    expect(await sweepBookings(later)).toMatchObject({ expired: 1 });
    expect(sent[0]!.to).toBe('besucherin@request.test');
    expect(sent[0]!.subject).toContain('nicht bestätigt');
    expect(await decideBooking(token, 'confirm', '', { now: later })).toEqual({ ok: false, reason: 'not_open' });
    // Zeit wieder frei
    expect((await requestBooking(site.formKey, input(slot, { email: 'neu@request.test' }), { ...meta, ipHash: 'z' }, { now: later })).ok).toBe(true);
    // 30 Tage nach dem Termin: gelöscht
    expect((await sweepBookings(new Date(slot.getTime() + 31 * 86_400_000))).purged).toBeGreaterThanOrEqual(2);
    expect(await bookingForBusiness(token)).toBeNull();
  });

  it('nicht verfügbar: Terminwahl aus, nur nach Vereinbarung oder Testbestellung', async () => {
    for (const opts of [{ booking: false }, { mode: 'appointment' as const }, { sandbox: true }]) {
      const { site } = await fixture(opts);
      expect(await findBookingSite(site.formKey)).toBeNull();
      expect(await requestBooking(site.formKey, input(berlinToUtc(2026, 11, 24, 9, 0)), meta, { now: NOW })).toEqual({
        ok: false,
        reason: 'not_found',
      });
    }
  });

  it('Kalenderdatei ist gültig und enthält keine Kontaktdaten', () => {
    const ics = icsFor('Test; Betrieb', {
      id: 'x',
      startsAt: new Date('2026-11-24T08:00:00Z'),
      endsAt: new Date('2026-11-24T09:00:00Z'),
      service: 'Dach',
    });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Termin bei Test\\; Betrieb: Dach');
    expect(ics.split('\r\n').length).toBeGreaterThan(8);
  });
});

describe('Testlauf über den Entwurf eines fiktiven Testbetriebs', () => {
  async function demoFixture(source: 'mock' | 'osm') {
    const db = getDb();
    const [lead] = await db
      .insert(leads)
      .values({
        source,
        sourceId: randomUUID(),
        businessName: 'FIKTIVER TEST Dachdeckerei',
        branch: 'dachdecker',
        branchGroup: 'handwerk',
        city: 'Testort',
        segmentKey: 'test',
        trackToken: randomToken(24),
      })
      .returning();
    const slug = randomToken(24);
    await db.insert(demos).values({
      leadId: lead!.id,
      slug,
      templateId: 'praxis-projekt',
      palette: 'anthrazit',
      status: 'published',
      contentJson: {},
      publishedAt: NOW,
      expiresAt: new Date(NOW.getTime() + 20 * 86_400_000),
    } as never);
    return slug;
  }

  it('fiktiver Testbetrieb: Anfrage geht an die eigene SeitenWerk-Adresse, Bestätigung an den Tester, alles mit [TEST]', async () => {
    await updateConfig({ sender: { email: 'betreiber@seitenwerk.test' } }, 'test:booking');
    const slug = await demoFixture('mock');
    // Termin innerhalb der Laufzeit der Demo; Beispielzeiten Mo–Fr 8–16 Uhr
    const slot = berlinToUtc(2026, 11, 24, 9, 0);
    const res = await requestDemoTestBooking(slug, input(slot, { email: 'tester@request.test' }), meta, { now: NOW });
    expect(res.ok).toBe(true);
    expect(sent.map((m) => m.to).sort()).toEqual(['betreiber@seitenwerk.test', 'tester@request.test']);
    expect(sent.every((m) => m.subject.startsWith('[TEST]'))).toBe(true);
    expect(sent.find((m) => m.to === 'betreiber@seitenwerk.test')!.text).toContain('TESTLAUF');
    const token = tokenFrom(sent.find((m) => m.text.includes('/termin/aktion'))!, '/termin/aktion');
    sent.length = 0;
    expect(await decideBooking(token, 'confirm', '', { now: NOW })).toEqual({ ok: true, status: 'confirmed' });
    expect(sent[0]!.to).toBe('tester@request.test');
    expect(sent[0]!.subject).toMatch(/^\[TEST\] Termin bestätigt/);
    expect(sent[0]!.attachments?.[0]?.filename).toBe('termin.ics');
    const row = (await getDb().select().from(bookings))[0]!;
    expect(row.siteId).toBeNull();
    expect(row.demoId).toBeTruthy();
    // keine Messereignisse aus Testläufen
    expect(await getDb().select().from(events).where(eq(events.type, 'site_booking'))).toHaveLength(0);
  });

  it('echter Betrieb (nicht fiktiv): keine Buchung, keine Mail', async () => {
    await updateConfig({ sender: { email: 'betreiber@seitenwerk.test' } }, 'test:booking');
    const slug = await demoFixture('osm');
    expect(await requestDemoTestBooking(slug, input(berlinToUtc(2026, 11, 24, 9, 0)), meta, { now: NOW })).toEqual({
      ok: false,
      reason: 'not_found',
    });
    expect(sent).toHaveLength(0);
  });
});
