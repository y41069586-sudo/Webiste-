import { sha256 } from '../util/crypto';

const UMLAUTS: [RegExp, string][] = [
  [/ä/g, 'ae'],
  [/ö/g, 'oe'],
  [/ü/g, 'ue'],
  [/ß/g, 'ss'],
  [/é|è|ê/g, 'e'],
  [/á|à|â/g, 'a'],
  [/ó|ò|ô/g, 'o'],
  [/í|ì|î/g, 'i'],
  [/ú|ù|û/g, 'u'],
  [/ç/g, 'c'],
  [/ñ/g, 'n'],
];

export function foldUmlauts(s: string): string {
  let out = s.toLowerCase();
  for (const [re, rep] of UMLAUTS) out = out.replace(re, rep);
  return out;
}

const LEGAL_FORMS =
  /\b(gmbh\s*&\s*co\.?\s*kg|gmbh|ug\s*\(haftungsbeschr(ae|ä)nkt\)|ug|e\.?\s?k\.?|e\.?\s?kfm\.?|e\.?\s?kfr\.?|kg|ohg|gbr|ag|mbh|inh\.?|inhaber(in)?|meisterbetrieb)\b/g;

/** Firmenname normalisieren (Umlaute, Rechtsform, Satzzeichen). */
export function normalizeBusinessName(name: string): string {
  return foldUmlauts(name)
    .replace(LEGAL_FORMS, ' ')
    .replace(/&/g, ' und ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeStreet(street: string): string {
  return foldUmlauts(street)
    .replace(/strasse\b|str\.?(?=\s|$)/g, 'str')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function normalizeHouseNumber(hn: string): string {
  return foldUmlauts(hn).replace(/\s+/g, '').replace(/[^a-z0-9-]/g, '');
}

export interface AddressParts {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
}

export function normalizeAddress(a: AddressParts): string {
  return [normalizeStreet(a.street ?? ''), normalizeHouseNumber(a.houseNumber ?? ''), (a.postalCode ?? '').replace(/\D/g, '')].join('|');
}

/** Hash aus Name + Anschrift (Sperrliste, Dubletten). Keine Klartextdaten. */
export function businessHash(name: string, a: AddressParts): string {
  return sha256(`biz:${normalizeBusinessName(name)}|${normalizeAddress(a)}`);
}

/** Hash nur aus der Anschrift (greift auch bei Namensänderung). */
export function addressHash(a: AddressParts): string {
  return sha256(`addr:${normalizeAddress(a)}`);
}

export function sourceHash(source: string, sourceId: string): string {
  return sha256(`src:${source}:${sourceId}`);
}

export function emailHash(email: string): string {
  return sha256(`mail:${email.trim().toLowerCase()}`);
}

/** URL-/Schlüssel-tauglicher Slug. */
export function slugify(s: string, max = 60): string {
  return foldUmlauts(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

export function segmentKey(city: string, group: string, branch: string): string {
  return `${slugify(city)}:${group}:${branch}`;
}

/** Telefonnummer für die Anzeige: +49 231 … → 0231 … */
export function formatPhoneDe(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let p = phone.trim().replace(/[^\d+]/g, ' ').replace(/\s+/g, ' ').trim();
  p = p.replace(/^\+49\s?(\(0\))?\s?/, '0').replace(/^0049\s?/, '0');
  const digits = p.replace(/\s/g, '');
  if (!/^0\d{5,14}$/.test(digits) && !/^\+\d{6,15}$/.test(digits)) return phone.trim();
  // Gruppierung der Quelle beibehalten (Vorwahllängen variieren)
  return p;
}

/** Telefonnummer als tel:-Link (E.164 für DE). */
export function phoneHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return `tel:${digits}`;
  if (digits.startsWith('00')) return `tel:+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `tel:+49${digits.slice(1)}`;
  return `tel:${digits}`;
}
