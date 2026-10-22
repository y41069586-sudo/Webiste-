export const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  const day = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, lastDay));
  return r;
}

/** Montag 00:00 (Europe/Berlin näherungsweise über UTC) der Woche von `d`. */
export function startOfIsoWeek(d: Date): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (r.getUTCDay() + 6) % 7; // 0 = Montag
  return new Date(r.getTime() - dow * DAY_MS);
}

export function formatDateDe(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Berlin' }).format(d);
}

export function formatDateLongDe(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }).format(d);
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** 390 € statt 390,00 € für runde Beträge (Werbetext) */
export function formatEuroShort(cents: number): string {
  if (cents % 100 === 0) return `${new Intl.NumberFormat('de-DE').format(cents / 100)} €`;
  return formatEuro(cents);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
