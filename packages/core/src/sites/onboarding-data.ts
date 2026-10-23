import { z } from 'zod';
import type { ImpressumData } from '../db/schema';
import type { OpeningHours } from '../types';

/** Reihenfolge im Formular: Montag … Sonntag (Tagesindex wie Google: 0 = Sonntag). */
export const WEEK_DAYS: { day: number; label: string }[] = [
  { day: 1, label: 'Montag' },
  { day: 2, label: 'Dienstag' },
  { day: 3, label: 'Mittwoch' },
  { day: 4, label: 'Donnerstag' },
  { day: 5, label: 'Freitag' },
  { day: 6, label: 'Samstag' },
  { day: 0, label: 'Sonntag' },
];

export const LEGAL_FORMS = [
  'Einzelunternehmen',
  'e. K.',
  'GbR',
  'GmbH',
  'UG (haftungsbeschränkt)',
  'OHG',
  'KG',
  'GmbH & Co. KG',
  'Sonstige',
] as const;
/** Rechtsformen mit Handelsregister-Eintrag (Registergericht + Nummer sind Pflicht) */
export const REGISTERED_FORMS = new Set<string>(['e. K.', 'GmbH', 'UG (haftungsbeschränkt)', 'OHG', 'KG', 'GmbH & Co. KG']);

export interface OnboardingDay {
  day: number;
  closed: boolean;
  open: string;
  close: string;
  open2: string;
  close2: string;
}

export interface OnboardingData {
  business: { name: string; phone: string; email: string; street: string; houseNumber: string; postalCode: string; city: string };
  texts: { headline: string; subline: string; about: string; services: { title: string; text: string }[]; wishes: string };
  hours: { mode: 'fixed' | 'appointment'; days: OnboardingDay[] };
  impressum: {
    company: string;
    legalForm: string;
    owner: string;
    street: string;
    postalCode: string;
    city: string;
    phone: string;
    email: string;
    register: string;
    registerNumber: string;
    vatId: string;
    chamber: string;
    professionalTitle: string;
    supervisoryAuthority: string;
  };
  privacyText: string;
  formTargetEmail: string;
  domain: string;
  /** Alternativtexte je Foto-ID */
  photoAlts: Record<string, string>;
  confirmed: boolean;
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL = z.string().trim().toLowerCase().pipe(z.email('Bitte eine gültige E-Mail-Adresse angeben.'));
const req = (msg: string, max = 200) => z.string().trim().min(1, msg).max(max, 'Text ist zu lang.');
const opt = (max = 200) => z.string().trim().max(max, 'Text ist zu lang.');

const daySchema = z
  .object({
    day: z.number().int().min(0).max(6),
    closed: z.boolean(),
    open: z.string(),
    close: z.string(),
    open2: z.string(),
    close2: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.closed) return;
    if (!TIME.test(d.open) || !TIME.test(d.close) || d.open >= d.close) {
      ctx.addIssue({ code: 'custom', message: 'Bitte gültige Zeiten (Beginn vor Ende) angeben oder „geschlossen“ wählen.' });
    }
    if ((d.open2 || d.close2) && (!TIME.test(d.open2) || !TIME.test(d.close2) || d.open2 >= d.close2 || d.open2 <= d.close)) {
      ctx.addIssue({ code: 'custom', message: 'Die zweite Zeitspanne muss nach der ersten liegen.' });
    }
  });

/** Vollständige Prüfung beim Absenden. */
export const onboardingSubmitSchema = z
  .object({
    business: z.object({
      name: req('Bitte den Namen des Betriebs angeben.', 80),
      phone: opt(40).regex(/^[0-9+()/\s-]*$/, 'Telefonnummer bitte nur mit Ziffern, Leerzeichen, +, -, / angeben.'),
      email: z.union([z.literal(''), EMAIL]),
      street: req('Bitte die Straße angeben.', 100),
      houseNumber: req('Bitte die Hausnummer angeben.', 12),
      postalCode: z
        .string()
        .trim()
        .regex(/^\d{5}$/, 'Bitte eine fünfstellige Postleitzahl angeben.'),
      city: req('Bitte den Ort angeben.', 80),
    }),
    texts: z.object({
      headline: req('Bitte eine Überschrift angeben.', 70),
      subline: req('Bitte einen Untertitel angeben.', 180),
      about: req('Bitte einen Text für „Über uns“ angeben.', 1200),
      services: z
        .array(z.object({ title: req('Titel fehlt.', 40), text: req('Beschreibung fehlt.', 200) }))
        .min(1, 'Bitte mindestens eine Leistung angeben.')
        .max(6, 'Höchstens 6 Leistungen.'),
      wishes: opt(2000),
    }),
    hours: z.object({ mode: z.enum(['fixed', 'appointment']), days: z.array(daySchema).length(7) }),
    impressum: z
      .object({
        company: req('Bitte den Namen laut Gewerbeanmeldung bzw. Register angeben.', 120),
        legalForm: z.enum(LEGAL_FORMS, 'Bitte die Rechtsform wählen.'),
        owner: req('Bitte den Inhaber bzw. die vertretungsberechtigte Person angeben.', 120),
        street: req('Bitte Straße und Hausnummer angeben.', 120),
        postalCode: z
          .string()
          .trim()
          .regex(/^\d{5}$/, 'Bitte eine fünfstellige Postleitzahl angeben.'),
        city: req('Bitte den Ort angeben.', 80),
        phone: req('Telefon ist im Impressum Pflicht (schnelle Kontaktaufnahme).', 40),
        email: EMAIL,
        register: opt(120),
        registerNumber: opt(40),
        vatId: opt(20).regex(/^(|DE\s?\d{9})$/i, 'USt-IdNr. im Format DE123456789 (oder leer lassen).'),
        chamber: opt(160),
        professionalTitle: opt(160),
        supervisoryAuthority: opt(200),
      })
      .superRefine((i, ctx) => {
        if (REGISTERED_FORMS.has(i.legalForm)) {
          if (!i.register)
            ctx.addIssue({
              code: 'custom',
              path: ['register'],
              message: 'Bei dieser Rechtsform ist das Registergericht Pflicht.',
            });
          if (!i.registerNumber)
            ctx.addIssue({
              code: 'custom',
              path: ['registerNumber'],
              message: 'Bei dieser Rechtsform ist die Registernummer Pflicht.',
            });
        }
      }),
    privacyText: z
      .string()
      .trim()
      .min(400, 'Bitte fügen Sie Ihre vollständige Datenschutzerklärung ein (mindestens einige Absätze).')
      .max(60_000, 'Die Datenschutzerklärung ist zu lang.'),
    formTargetEmail: EMAIL,
    domain: req('Bitte die Domain angeben.', 80),
    photoAlts: z.record(z.string(), opt(120)),
    confirmed: z.literal(true, 'Bitte bestätigen Sie die Richtigkeit der Angaben.'),
  })
  .superRefine((d, ctx) => {
    if (d.hours.mode === 'fixed' && d.hours.days.every((x) => x.closed)) {
      ctx.addIssue({ code: 'custom', path: ['hours'], message: 'Bitte Öffnungszeiten angeben oder „nach Vereinbarung“ wählen.' });
    }
  });

/** Fehler als flache Feldliste („impressum.register“ → Meldung) für das Formular. */
export function onboardingErrors(data: unknown): Record<string, string> | null {
  const r = onboardingSubmitSchema.safeParse(data);
  if (r.success) return null;
  const out: Record<string, string> = {};
  for (const i of r.error.issues) {
    const k = i.path.join('.') || 'form';
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

const s = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');

/** Entwurf normalisieren (alles optional, Längen begrenzt) – zum Zwischenspeichern. */
export function normalizeOnboarding(raw: Partial<Record<keyof OnboardingData, unknown>>, base: OnboardingData): OnboardingData {
  const r = raw as Record<string, Record<string, unknown> | undefined>;
  const b = r.business ?? {};
  const t = r.texts ?? {};
  const h = r.hours ?? {};
  const i = r.impressum ?? {};
  const services = Array.isArray(t.services) ? (t.services as { title?: unknown; text?: unknown }[]) : base.texts.services;
  const days = Array.isArray(h.days) ? (h.days as Partial<OnboardingDay>[]) : base.hours.days;
  return {
    business: {
      name: s(b.name, 80),
      phone: s(b.phone, 40),
      email: s(b.email, 254),
      street: s(b.street, 100),
      houseNumber: s(b.houseNumber, 12),
      postalCode: s(b.postalCode, 5),
      city: s(b.city, 80),
    },
    texts: {
      headline: s(t.headline, 70),
      subline: s(t.subline, 180),
      about: s(t.about, 1200),
      services: services
        .slice(0, 6)
        .map((x) => ({ title: s(x.title, 40), text: s(x.text, 200) }))
        .filter((x) => x.title || x.text),
      wishes: s(t.wishes, 2000),
    },
    hours: {
      mode: h.mode === 'appointment' ? 'appointment' : 'fixed',
      days: WEEK_DAYS.map(({ day }) => {
        const d = days.find((x) => x.day === day) ?? {};
        return {
          day,
          closed: Boolean(d.closed),
          open: s(d.open, 5),
          close: s(d.close, 5),
          open2: s(d.open2, 5),
          close2: s(d.close2, 5),
        };
      }),
    },
    impressum: {
      company: s(i.company, 120),
      legalForm: s(i.legalForm, 40),
      owner: s(i.owner, 120),
      street: s(i.street, 120),
      postalCode: s(i.postalCode, 5),
      city: s(i.city, 80),
      phone: s(i.phone, 40),
      email: s(i.email, 254),
      register: s(i.register, 120),
      registerNumber: s(i.registerNumber, 40),
      vatId: s(i.vatId, 20),
      chamber: s(i.chamber, 160),
      professionalTitle: s(i.professionalTitle, 160),
      supervisoryAuthority: s(i.supervisoryAuthority, 200),
    },
    privacyText: s(raw.privacyText, 60_000),
    formTargetEmail: s(raw.formTargetEmail, 254),
    domain: s(raw.domain, 80),
    photoAlts:
      raw.photoAlts && typeof raw.photoAlts === 'object' && !Array.isArray(raw.photoAlts)
        ? Object.fromEntries(
            Object.entries(raw.photoAlts as Record<string, unknown>)
              .slice(0, 12)
              .map(([k, v]) => [k.slice(0, 40), s(v, 120)]),
          )
        : base.photoAlts,
    confirmed: raw.confirmed === true,
  };
}

export function hoursToOpeningHours(h: OnboardingData['hours']): OpeningHours | null {
  if (h.mode === 'appointment') return null;
  return {
    days: h.days
      .filter((d) => !d.closed)
      .map((d) => ({
        day: d.day,
        periods: [{ open: d.open, close: d.close }, ...(d.open2 && d.close2 ? [{ open: d.open2, close: d.close2 }] : [])],
      })),
  };
}

export function openingHoursToDays(oh: OpeningHours | null | undefined): OnboardingDay[] {
  return WEEK_DAYS.map(({ day }) => {
    const d = oh?.days.find((x) => x.day === day);
    const p = d?.periods ?? [];
    return {
      day,
      closed: !d || p.length === 0,
      open: p[0]?.open ?? '',
      close: p[0]?.close ?? '',
      open2: p[1]?.open ?? '',
      close2: p[1]?.close ?? '',
    };
  });
}

export function toImpressumData(i: OnboardingData['impressum']): ImpressumData {
  return {
    company: i.company,
    owner: i.owner,
    legalForm: i.legalForm,
    street: i.street,
    postalCode: i.postalCode,
    city: i.city,
    phone: i.phone,
    email: i.email,
    ...(i.register ? { register: i.register } : {}),
    ...(i.registerNumber ? { registerNumber: i.registerNumber } : {}),
    ...(i.vatId ? { vatId: i.vatId.replace(/\s/g, '').toUpperCase() } : {}),
    ...(i.chamber ? { chamber: i.chamber } : {}),
    ...(i.professionalTitle ? { professionalTitle: i.professionalTitle } : {}),
    ...(i.supervisoryAuthority ? { supervisoryAuthority: i.supervisoryAuthority } : {}),
  };
}
