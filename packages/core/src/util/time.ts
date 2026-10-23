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

/** Werktage (Mo–Fr) addieren; Feiertage werden nicht berücksichtigt (Schätzung der Postlaufzeit). */
export function addBusinessDays(d: Date, days: number): Date {
  let r = new Date(d.getTime());
  let left = days;
  while (left > 0) {
    r = addDays(r, 1);
    const dow = r.getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return r;
}

/**
 * Spätabends (22/23 Uhr deutscher Zeit) am selben Kalendertag in Berlin – für Zusagen wie
 * „online bis {Datum}“: der genannte Tag gilt vollständig.
 */
export function endOfDayBerlin(d: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(d)
    .split('-')
    .map(Number);
  return new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!, 21, 0, 0));
}

/** Montag 00:00 (Europe/Berlin näherungsweise über UTC) der Woche von `d`. */
export function startOfIsoWeek(d: Date): Date {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (r.getUTCDay() + 6) % 7; // 0 = Montag
  return new Date(r.getTime() - dow * DAY_MS);
}

export function formatDateDe(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Berlin',
  }).format(d);
}

export function formatDateLongDe(d: Date): string {
  return new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' }).format(
    d,
  );
}

export function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

/** 590 € statt 590,00 € für runde Beträge (Werbetext) */
export function formatEuroShort(cents: number): string {
  // geschütztes Leerzeichen, damit „590 €“ nicht umbricht
  if (cents % 100 === 0) return `${new Intl.NumberFormat('de-DE').format(cents / 100)}\u00a0€`;
  return formatEuro(cents);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
