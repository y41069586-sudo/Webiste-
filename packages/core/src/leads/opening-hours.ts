import type { OpeningHours, OpeningHoursDay } from '../types';

const OSM_DAYS: Record<string, number> = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };
const ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_NAMES_DE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function expandDays(spec: string): number[] | null {
  const out: number[] = [];
  for (const part of spec.split(',')) {
    const range = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/.exec(part.trim());
    if (!range) return null;
    const from = ORDER.indexOf(OSM_DAYS[range[1]!]!);
    const to = range[2] ? ORDER.indexOf(OSM_DAYS[range[2]]!) : from;
    if (to < from) return null;
    for (let i = from; i <= to; i++) out.push(ORDER[i]!);
  }
  return out;
}

function normTime(t: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

/**
 * Parser für die häufigsten OSM-opening_hours-Formate, z. B.
 * „Mo-Fr 08:00-17:00; Sa 09:00-13:00“, „Mo,We 09:00-12:00,14:00-18:00“, „Su off“.
 * Gibt null zurück, wenn das Format nicht sicher verstanden wird (dann keine Anzeige
 * erfundener Zeiten – lieber „nach Vereinbarung“).
 */
export function parseOsmOpeningHours(raw: string | undefined | null): OpeningHours | null {
  if (!raw) return null;
  const text = raw.trim();
  if (!text || /24\/7/.test(text)) return null;
  const map = new Map<number, { open: string; close: string }[]>();
  for (const rule of text
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean)) {
    if (/^PH\b/.test(rule)) continue; // Feiertage ignorieren
    const m = /^([A-Za-z,\s-]+?)\s+(off|closed|[\d:,\s-]+)$/.exec(rule);
    if (!m) return null;
    const days = expandDays(m[1]!.replace(/\s+/g, ''));
    if (!days) return null;
    if (/^(off|closed)$/.test(m[2]!.trim())) {
      days.forEach((d) => map.set(d, []));
      continue;
    }
    const periods: { open: string; close: string }[] = [];
    for (const span of m[2]!.split(',')) {
      const [a, b] = span.split('-');
      const open = a ? normTime(a) : null;
      const close = b ? normTime(b) : null;
      if (!open || !close) return null;
      periods.push({ open, close });
    }
    days.forEach((d) => map.set(d, periods));
  }
  if (map.size === 0) return null;
  const days: OpeningHoursDay[] = ORDER.filter((d) => map.has(d) && map.get(d)!.length > 0).map((d) => ({
    day: d,
    periods: map.get(d)!,
  }));
  return { days, weekdayText: formatOpeningHours({ days }) };
}

/** Zeilen wie „Montag – Freitag: 08:00 – 17:00 Uhr“ (aufeinanderfolgende gleiche Tage zusammengefasst). */
export function formatOpeningHours(oh: OpeningHours | null | undefined): string[] {
  if (!oh || oh.days.length === 0) return [];
  const byDay = new Map(oh.days.map((d) => [d.day, d.periods]));
  const key = (d: number) => JSON.stringify(byDay.get(d) ?? []);
  const lines: string[] = [];
  let i = 0;
  while (i < ORDER.length) {
    const d = ORDER[i]!;
    let j = i;
    while (j + 1 < ORDER.length && key(ORDER[j + 1]!) === key(d)) j++;
    const periods = byDay.get(d);
    const label = i === j ? DAY_NAMES_DE[d]! : `${DAY_NAMES_DE[d]} – ${DAY_NAMES_DE[ORDER[j]!]}`;
    if (periods && periods.length) {
      lines.push(`${label}: ${periods.map((p) => `${p.open} – ${p.close} Uhr`).join(', ')}`);
    } else {
      lines.push(`${label}: geschlossen`);
    }
    i = j + 1;
  }
  // Trailing „geschlossen“ nur behalten, wenn es echte Öffnungstage gibt
  return lines;
}

/** Google-Places regularOpeningHours → eigenes Format. */
export function fromGoogleOpeningHours(
  g:
    | {
        periods?: {
          open?: { day?: number; hour?: number; minute?: number };
          close?: { day?: number; hour?: number; minute?: number };
        }[];
        weekdayDescriptions?: string[];
      }
    | null
    | undefined,
): OpeningHours | null {
  if (!g?.periods?.length) return null;
  const map = new Map<number, { open: string; close: string }[]>();
  const t = (h?: number, m?: number) => `${String(h ?? 0).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
  for (const p of g.periods) {
    if (!p.open || p.open.day === undefined) continue;
    const list = map.get(p.open.day) ?? [];
    list.push({ open: t(p.open.hour, p.open.minute), close: p.close ? t(p.close.hour, p.close.minute) : '24:00' });
    map.set(p.open.day, list);
  }
  const days = ORDER.filter((d) => map.has(d)).map((d) => ({ day: d, periods: map.get(d)! }));
  return { days, weekdayText: formatOpeningHours({ days }) };
}
