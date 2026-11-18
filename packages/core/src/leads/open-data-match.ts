import type { RawPlace, SourceMeta } from '../providers/types';
import { foldUmlauts, normalizeBusinessName } from './normalize';

/**
 * Abgleich eines Treffers aus OpenStreetMap mit offenen Firmendaten (Overture Maps, Lizenz CDLA-Permissive-2.0 /
 * Apache-2.0; Recherche „Leadauswahl drastisch verbessern“, 17.11.2026). OSM sagt oft nicht, ob es eine Website gibt
 * oder ob der Betrieb noch existiert; Overture führt Websites, Social-Links und „dauerhaft geschlossen“.
 * Es wird nichts zusammengeführt oder gespeichert außer dem Prüfergebnis am Lead (keine Datenbank-Vermischung).
 */
export interface OpenPlace {
  name: string;
  lat: number;
  lon: number;
  websites: string[];
  socials: string[];
  phones: string[];
  postcode?: string | null;
  street?: string | null;
  confidence?: number | null;
  status?: string | null;
}

/** Verzeichnis-, Bewertungs- und Profilseiten zählen nicht als eigene Website. */
const NOT_OWN_SITE =
  /(^|\.)(facebook|instagram|tiktok|linkedin|xing|youtube|twitter|x|pinterest|linktr|linktree|wa|whatsapp|google|goo|g|yelp|tripadvisor|gelbeseiten|dasoertliche|dastelefonbuch|11880|meinestadt|golocal|cylex|werkenntdenbesten|myhammer|blauarbeit|check24|treatwell|planity|booksy|fresha|studiobookr|lieferando|wolt|ubereats|uber|opentable|quandoo|thefork|stadtbranchenbuch|branchenbuch|firmenwissen|northdata|wlw|kennstdueinen|provenexpert|trustlocal|hotfrog|yably|unternehmensverzeichnis|bundes-telefonbuch|auskunft|herold|wogibtswas|marktplatz-mittelstand|handwerkerkatalog|meister-handwerk|ihk|hwk|handwerk)\.[a-z]{2,}$/i;

function hostOf(url: string): string | null {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** Eigene Website (keine Verzeichnis-/Profilseite) aus einer Liste von Links, sonst null. */
export function ownWebsite(urls: string[]): string | null {
  for (const u of urls) {
    const host = hostOf(u);
    // Baukasten-Seiten (Jimdo, Wix …) sind eigene Websites; Googles eingestellte „business.site“-Seiten nicht
    if (host && !NOT_OWN_SITE.test(host) && !host.endsWith('.business.site')) return u;
  }
  return null;
}

/**
 * Telefonnummer vergleichbar machen, auch für uneinheitliche Schreibweisen der offenen Daten
 * („49230259347“, „04923 0272387“, „+49 2302 59347“ → „230259347“ bzw. „230272387“).
 */
export function comparablePhone(p: string | null | undefined): string | null {
  if (!p) return null;
  let d = p.replace(/\D+/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  if (d.startsWith('49') && d.length >= 11) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d.length >= 7 ? d : null;
}

function tokens(name: string): Set<string> {
  return new Set(
    normalizeBusinessName(name)
      .split(' ')
      .filter((t) => t.length >= 3),
  );
}

/** Namensähnlichkeit 0–1 (Anteil gemeinsamer Wörter am kürzeren Namen, ohne Rechtsform). */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.min(ta.size, tb.size);
}

/** Entfernung in Metern (Haversine). */
export function distanceM(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function streetKey(s: string | null | undefined): string {
  return foldUmlauts(s ?? '')
    .replace(/str\.?(?=\s|\d|$)/g, 'strasse')
    .replace(/[^a-z]+/g, '');
}

export interface OpenMatch {
  place: OpenPlace;
  matchedBy: 'phone' | 'name_near' | 'name_address';
}

/**
 * Besten Treffer finden. Sicher genug für einen Ausschluss:
 * - gleiche Telefonnummer (innerhalb 2 km), oder
 * - ähnlicher Name (≥ 0,6) und höchstens 150 m entfernt, oder
 * - ähnlicher Name (≥ 0,6), gleiche PLZ und gleiche Straße.
 */
export function matchOpenPlace(place: RawPlace, candidates: OpenPlace[]): OpenMatch | null {
  const phone = comparablePhone(place.phone);
  const loc = place.location;
  const street = streetKey(place.street);
  let best: { m: OpenMatch; score: number } | null = null;
  for (const c of candidates) {
    const dist = loc ? distanceM(loc, c) : null;
    if (dist !== null && dist > 2000) continue;
    const sim = nameSimilarity(place.name, c.name);
    let m: OpenMatch | null = null;
    let score = 0;
    if (phone && c.phones.some((p) => comparablePhone(p) === phone)) {
      m = { place: c, matchedBy: 'phone' };
      score = 3 + sim;
    } else if (sim >= 0.6 && dist !== null && dist <= 150) {
      m = { place: c, matchedBy: 'name_near' };
      score = 2 + sim - dist / 1000;
    } else if (
      sim >= 0.6 &&
      place.postalCode &&
      c.postcode === place.postalCode &&
      street.length >= 4 &&
      streetKey(c.street).startsWith(street)
    ) {
      m = { place: c, matchedBy: 'name_address' };
      score = 1.5 + sim;
    }
    if (m && (!best || score > best.score)) best = { m, score };
  }
  return best?.m ?? null;
}

/** Prüfergebnis als Quellsignal am Treffer (wird in Qualifizierung und Vorauswahl ausgewertet). */
export function openDataSignal(match: OpenMatch, release: string): NonNullable<SourceMeta['openData']> {
  const c = match.place;
  const website = ownWebsite(c.websites);
  const status =
    c.status === 'permanently_closed' || c.status === 'temporarily_closed' || c.status === 'open' ? c.status : undefined;
  const socialOnly = !website && (c.socials.length > 0 || c.websites.length > 0);
  return {
    source: 'overture',
    release,
    matchedBy: match.matchedBy,
    ...(typeof c.confidence === 'number' ? { confidence: Math.round(c.confidence * 100) / 100 } : {}),
    ...(status ? { status } : {}),
    ...(website ? { website } : {}),
    ...(socialOnly ? { socialOnly: true } : {}),
  };
}

/** „Konrad-Adenauer-Straße 17A“ → Straße + Hausnummer; null, wenn keine Hausnummer erkennbar ist. */
export function splitStreet(freeform: string | null | undefined): { street: string; houseNumber: string } | null {
  const m = /^\s*(.*?[a-zäöüß.])\s+(\d{1,4}\s?[a-zA-Z]?(?:\s?[-/]\s?\d{1,4}\s?[a-zA-Z]?)?)\s*$/i.exec(freeform ?? '');
  if (!m || m[1]!.length < 3) return null;
  return { street: m[1]!.trim(), houseNumber: m[2]!.replace(/\s+/g, '') };
}

/**
 * Fehlende Anschrift aus den offenen Daten ergänzen (17.11.2026: 864 von 2 124 Treffern scheiterten an
 * „Postanschrift unvollständig“). Nur bei sicherem Treffer (gleiche Telefonnummer oder gleicher Name ≤ 150 m),
 * nur wenn PLZ fünfstellig ist und die Hausnummer erkennbar. Vorhandene Angaben werden nie überschrieben.
 */
export function openAddressFill(
  place: RawPlace,
  match: OpenMatch,
): { street: string; houseNumber: string; postalCode: string } | null {
  if (match.matchedBy === 'name_address') return null;
  if (place.street?.trim() && place.houseNumber?.trim() && place.postalCode?.trim()) return null;
  const parts = splitStreet(match.place.street);
  const pc = match.place.postcode?.trim() ?? '';
  if (!parts || !/^\d{5}$/.test(pc)) return null;
  if (place.postalCode && place.postalCode.trim() !== pc) return null;
  if (
    place.street &&
    foldUmlauts(place.street)
      .replace(/[^a-z]/g, '')
      .slice(0, 6) !==
      foldUmlauts(parts.street)
        .replace(/[^a-z]/g, '')
        .slice(0, 6)
  )
    return null;
  return {
    street: place.street?.trim() || parts.street,
    houseNumber: place.houseNumber?.trim() || parts.houseNumber,
    postalCode: pc,
  };
}

/**
 * Wendet das Signal auf den Treffer an: eigene Website → `websiteUri` (Qualifizierung schließt aus),
 * dauerhaft geschlossen → `businessStatus` (schließt aus), nur Profile → Social-Signal. Gibt den neuen Ort zurück.
 */
export function applyOpenData(
  place: RawPlace,
  signal: NonNullable<SourceMeta['openData']>,
  address?: { street: string; houseNumber: string; postalCode: string } | null,
): RawPlace {
  const meta: SourceMeta = { ...(place.sourceMeta ?? {}), openData: address ? { ...signal, addressFilled: true } : signal };
  if (signal.socialOnly) meta.socialLinks = Math.max(1, meta.socialLinks ?? 0);
  return {
    ...place,
    sourceMeta: meta,
    ...(signal.website && !place.websiteUri ? { websiteUri: signal.website } : {}),
    ...(signal.status === 'permanently_closed' ? { businessStatus: 'CLOSED_PERMANENTLY' } : {}),
    ...(address ?? {}),
  };
}
