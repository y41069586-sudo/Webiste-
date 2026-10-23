import { getConfig } from '../config/service';
import { foldUmlauts } from '../leads/normalize';
import { domainCandidates, isValidDeLabel } from '../letters/domain';
import { getProviders } from '../providers';

export type DomainParse = { ok: true; domain: string; label: string; tld: string } | { ok: false; error: string };

/** Eingabe wie „https://www.Müller-Maler.de/“ → „mueller-maler.de“. Nur eine Ebene, erlaubte Endungen. */
export function normalizeDomainInput(raw: string, allowedTlds: string[]): DomainParse {
  let s = foldUmlauts(raw.trim().toLowerCase())
    .replace(/^[a-z]+:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.$/, '')
    .replace(/\s+/g, '-');
  if (!s) return { ok: false, error: 'Bitte eine Wunschdomain eingeben.' };
  const tlds = allowedTlds.map((t) => t.replace(/^\./, '').toLowerCase());
  if (!s.includes('.')) s = `${s}.${tlds[0]}`;
  const parts = s.split('.');
  if (parts.length !== 2) return { ok: false, error: 'Bitte nur den Namen ohne Subdomain eingeben, z. B. maler-beispiel.de.' };
  const [label, tld] = parts as [string, string];
  if (!tlds.includes(tld))
    return { ok: false, error: `Möglich sind Domains mit der Endung ${tlds.map((t) => `.${t}`).join(', ')}.` };
  if (label.length < 3) return { ok: false, error: 'Der Name muss mindestens 3 Zeichen lang sein.' };
  if (!isValidDeLabel(label)) {
    return { ok: false, error: 'Erlaubt sind Buchstaben a–z, Ziffern und Bindestriche (nicht am Anfang oder Ende).' };
  }
  return { ok: true, domain: `${label}.${tld}`, label, tld };
}

export interface DomainCheckResult {
  input: string;
  domain: string | null;
  valid: boolean;
  available: boolean;
  message: string;
  alternatives: string[];
}

const cache = new Map<string, { at: number; available: boolean; reason?: string }>();
const CACHE_MS = 10 * 60 * 1000;

async function availability(domains: string[]): Promise<Map<string, { available: boolean; reason?: string }>> {
  const cfg = await getConfig();
  const now = Date.now();
  const out = new Map<string, { available: boolean; reason?: string }>();
  const missing = domains.filter((d) => {
    const c = cache.get(d);
    if (c && now - c.at < CACHE_MS) {
      out.set(d, c);
      return false;
    }
    return true;
  });
  if (missing.length) {
    const res = await getProviders().registrar.checkAvailability(missing);
    for (const r of res) {
      const premium = r.priceCents !== undefined && r.priceCents > cfg.checkout.maxDomainPriceCents;
      const entry = { available: r.available && !premium, reason: premium ? 'premium' : r.reason };
      cache.set(r.domain, { at: now, ...entry });
      out.set(r.domain, entry);
    }
  }
  return out;
}

/** Live-Prüfung der Wunschdomain (Checkout, Onboarding) inkl. freier Alternativen. */
export async function checkDomain(
  raw: string,
  ctx?: { businessName: string; city: string; branch: string },
): Promise<DomainCheckResult> {
  const cfg = await getConfig();
  const parsed = normalizeDomainInput(raw, cfg.checkout.allowedTlds);
  if (!parsed.ok) return { input: raw, domain: null, valid: false, available: false, message: parsed.error, alternatives: [] };
  const res = await availability([parsed.domain]);
  const r = res.get(parsed.domain);
  if (r?.available)
    return {
      input: raw,
      domain: parsed.domain,
      valid: true,
      available: true,
      message: `${parsed.domain} ist frei.`,
      alternatives: [],
    };
  let alternatives: string[] = [];
  if (ctx) {
    const candidates = domainCandidates(ctx.businessName, { city: ctx.city, branch: ctx.branch }).filter(
      (d) => d !== parsed.domain,
    );
    if (candidates.length) {
      const alt = await availability(candidates);
      alternatives = candidates.filter((d) => alt.get(d)?.available).slice(0, 3);
    }
  }
  const message =
    r?.reason === 'premium'
      ? `${parsed.domain} ist eine Premium-Domain und nicht im Paket enthalten.`
      : `${parsed.domain} ist leider schon vergeben.`;
  return { input: raw, domain: parsed.domain, valid: true, available: false, message, alternatives };
}

/** Nur für Tests. */
export function clearDomainCache(): void {
  cache.clear();
}
