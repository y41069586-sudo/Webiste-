import { foldUmlauts, normalizeBusinessName } from '../leads/normalize';
import type { RegistrarProvider } from '../providers/types';

/** Gültiges .de-Label: 1–63 Zeichen, a–z, 0–9, Bindestrich (nicht am Anfang/Ende, nicht an Pos. 3+4). */
export function isValidDeLabel(label: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label) && label.slice(2, 4) !== '--';
}

const STOPWORDS = new Set(['und', 'the', 'der', 'die', 'das', 'by', 'von', 'am', 'im', 'in', 'zum', 'zur', 'co', 'inh']);

/** Wörter, die als Branchenkürzel taugen (für Kombinationen wie „maler-kowalski“). */
const BRANCH_WORDS: Record<string, string> = {
  maler: 'maler',
  elektriker: 'elektro',
  nagelstudio: 'nails',
  kosmetikstudio: 'kosmetik',
};

/**
 * Domain-Vorschläge aus dem Firmennamen: Umlaute auflösen, Sonderzeichen entfernen,
 * Rechtsform weglassen, ggf. Branche oder Ort ergänzen. Reihenfolge = Präferenz.
 */
export function domainCandidates(name: string, opts: { city: string; branch: string }): string[] {
  // Apostrophe ersatzlos entfernen („Kim's“ → „kims“)
  const tokens = normalizeBusinessName(name.replace(/['’`´]/g, ''))
    .split(' ')
    .filter((t) => t && !STOPWORDS.has(t));
  const city = foldUmlauts(opts.city).replace(/[^a-z0-9]+/g, '');
  const branchWord = BRANCH_WORDS[opts.branch] ?? foldUmlauts(opts.branch).replace(/[^a-z0-9]+/g, '');
  const out: string[] = [];
  const push = (label: string) => {
    const l = label.replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (l.length >= 3 && isValidDeLabel(l) && !out.includes(`${l}.de`)) out.push(`${l}.de`);
  };
  if (tokens.length === 0) return [];
  const hyphen = tokens.join('-');
  const joined = tokens.join('');
  push(hyphen);
  if (joined.length <= 24) push(joined);
  const hasBranch = tokens.some((t) => t.startsWith(branchWord.slice(0, 5)));
  if (!hasBranch) push(`${branchWord}-${hyphen}`);
  if (!tokens.includes(city)) push(`${hyphen}-${city}`);
  if (tokens.length > 2) push(tokens.slice(0, 2).join('-'));
  if (!hasBranch && !tokens.includes(city)) push(`${branchWord}-${tokens[0]}-${city}`);
  return out.filter((d) => d.length <= 40).slice(0, 6);
}

/** Erster verfügbarer Vorschlag laut Registrar, sonst null (Brief ohne Beispiel-Domain). */
export async function suggestDomain(
  registrar: RegistrarProvider,
  name: string,
  opts: { city: string; branch: string },
): Promise<string | null> {
  const candidates = domainCandidates(name, opts);
  if (!candidates.length) return null;
  const res = await registrar.checkAvailability(candidates);
  const available = new Set(res.filter((r) => r.available).map((r) => r.domain));
  return candidates.find((c) => available.has(c)) ?? null;
}
