import { parseFragment, serialize, type DefaultTreeAdapterTypes as T } from 'parse5';
import type { SiteContent } from '../types';
/** Update exact copy without executing HTML or inventing a replacement layout. Unmatched changes need model review. */
export function updateAuthoredCopy(current: SiteContent, next: SiteContent): SiteContent {
  if (!current.design || next.design !== current.design) return next;
  const changes: [string, string][] = [];
  for (const key of ['hero_headline', 'hero_subline', 'about', 'cta_text'] as const)
    if (current[key] !== next[key]) changes.push([current[key], next[key]]);
  for (const [list, keys] of [
    ['services', ['title', 'text']],
    ['faq', ['q', 'a']],
  ] as const) {
    if (current[list].length !== next[list].length)
      throw Error('Die neue Inhaltsliste benötigt eine Überarbeitung des individuellen Entwurfs.');
    current[list].forEach((item, i) => {
      for (const k of keys) {
        const old = (item as unknown as Record<string, string>)[k]!,
          value = (next[list][i] as unknown as Record<string, string>)[k]!;
        if (old !== value) changes.push([old, value]);
      }
    });
  }
  if (!changes.length) return next;
  const tree = parseFragment(current.design.html);
  const plain = (node: T.Node): string =>
    node.nodeName === '#text'
      ? (node as T.TextNode).value
      : node.nodeName === 'br'
        ? ' '
        : 'childNodes' in node
          ? node.childNodes.map(plain).join('')
          : '';
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  for (const [old, value] of changes) {
    let found = false;
    if (!old.trim()) throw Error('Neuer Inhalt benötigt einen eigenen Platz im individuellen Entwurf.');
    const visit = (node: T.Node) => {
      if (node.nodeName === '#text') {
        const t = node as T.TextNode;
        if (t.value.includes(old)) {
          t.value = t.value.split(old).join(value);
          found = true;
        }
        return;
      }
      if ('childNodes' in node) {
        if ('tagName' in node && /^(?:h[1-4]|p|a|dt|dd|li|summary)$/.test(node.tagName) && norm(plain(node)) === norm(old)) {
          const text: T.TextNode = { nodeName: '#text', value, parentNode: node };
          node.childNodes = [text];
          found = true;
          return;
        }
        node.childNodes.forEach(visit);
      }
    };
    visit(tree);
    if (!found)
      throw Error('Geänderter Text lässt sich im individuellen Entwurf nicht eindeutig zuordnen; Gestaltung erneut prüfen.');
  }
  return { ...next, design: { ...current.design, html: serialize(tree) } };
}
