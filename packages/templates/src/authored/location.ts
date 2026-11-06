import { parseFragment, serialize, type DefaultTreeAdapterTypes as T } from 'parse5';
import type { BusinessFacts } from '../types';

/** Content purpose, not a claim about actual travel availability. Ambiguous businesses get directions. */
export function locationPurpose(f: Pick<BusinessFacts, 'group' | 'branchLabel'>): 'customer-site' | 'directions' {
  if (['beauty', 'gastronomie', 'einzelhandel', 'kurse'].includes(f.group) && !/mobil|hausbesuch/i.test(f.branchLabel))
    return 'directions';
  return /elektr|sanitär|heiz|maler|fliesen|reinig|garten|dach|tischler|schreiner|hausmeister|renovier|mobil|hausbesuch/i.test(
    f.branchLabel,
  )
    ? 'customer-site'
    : 'directions';
}

export function locationText(f: BusinessFacts, draft: boolean): string {
  if (locationPurpose(f) === 'customer-site')
    return draft
      ? `${f.city} und Umgebung · Vorschlag zum Einsatzgebiet, noch nicht bestätigt. Einsatzort vorab anfragen.`
      : f.city;
  const address = [`${f.street} ${f.houseNumber}`.trim(), `${f.postalCode} ${f.city}`.trim()].filter(Boolean).join(', ');
  return `${address}. Anfahrt zur angegebenen Anschrift planen; Besuch und Termin vorher direkt abstimmen.`;
}

/** Correct only an inappropriate travel heading in older authored studio drafts. */
export function adaptLocationHeading(html: string, f: Pick<BusinessFacts, 'group' | 'branchLabel'>): string {
  if (locationPurpose(f) === 'customer-site') return html;
  const tree = parseFragment(html);
  const walk = (node: T.Node, inArea = false) => {
    const area = inArea || ('attrs' in node && node.attrs.some((a) => a.name === 'data-ad-section' && a.value === 'area'));
    if (
      area &&
      'tagName' in node &&
      /^h[23]$/.test(node.tagName) &&
      /einsatzgebiet|einzugsgebiet|servicegebiet/i.test(serialize(node))
    ) {
      node.childNodes = [{ nodeName: '#text', value: 'Standort und Anfahrt', parentNode: node } as T.TextNode];
    }
    if ('childNodes' in node) node.childNodes.forEach((n) => walk(n, area));
  };
  walk(tree);
  return serialize(tree);
}
