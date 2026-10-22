export function dt(d: Date | string | null | undefined): string {
  if (!d) return '–';
  const date = typeof d === 'string' ? new Date(d) : d;
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Berlin' }).format(date);
}

export function eur(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '–';
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

export function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '–';
  return `${(v * 100).toFixed(digits).replace('.', ',')} %`;
}

export function num(v: number | null | undefined): string {
  if (v === null || v === undefined) return '–';
  return new Intl.NumberFormat('de-DE').format(v);
}
