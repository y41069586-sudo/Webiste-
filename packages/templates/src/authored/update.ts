import { parseFragment, serialize, type DefaultTreeAdapterTypes as T } from 'parse5';
import type { SiteContent } from '../types';
/** Update exact copy without executing HTML or inventing a replacement layout. Unmatched changes need model review. */
export function updateAuthoredCopy(current: SiteContent, next: SiteContent): SiteContent {
  if (!current.design || next.design !== current.design) return next;
  const changes: [string, string][] = [];
  const lengthChanged: ['services' | 'faq', readonly ['title', 'text'] | readonly ['q', 'a']][] = [];
  for (const key of ['hero_headline', 'hero_subline', 'about', 'cta_text'] as const)
    if (current[key] !== next[key]) changes.push([current[key], next[key]]);
  for (const [list, keys] of [
    ['services', ['title', 'text']],
    ['faq', ['q', 'a']],
  ] as const) {
    if (current[list].length !== next[list].length) {
      lengthChanged.push([list, keys]);
      continue;
    }
    current[list].forEach((item, i) => {
      for (const k of keys) {
        const old = (item as unknown as Record<string, string>)[k]!,
          value = (next[list][i] as unknown as Record<string, string>)[k]!;
        if (old !== value) changes.push([old, value]);
      }
    });
  }
  if (!changes.length && !lengthChanged.length) return next;
  const tree = parseFragment(current.design.html);
  // Mehr oder weniger Einträge (z. B. eine zusätzliche Leistung): Liste im Entwurf mit dem Aufbau eines vorhandenen
  // Eintrags neu aufbauen. Gelingt die Zuordnung nicht, bleibt es bei der überprüfbaren Blockierung.
  for (const [list, [tk, xk]] of lengthChanged) {
    const old = current[list] as unknown as Record<string, string>[];
    const neu = next[list] as unknown as Record<string, string>[];
    if (
      !rebuildList(
        tree,
        old.map((o) => [o[tk]!, o[xk]!]),
        neu.map((o) => [o[tk]!, o[xk]!]),
      )
    )
      throw Error('Die neue Inhaltsliste benötigt eine Überarbeitung des individuellen Entwurfs.');
  }
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

type El = T.Element;
const plainText = (node: T.Node): string =>
  node.nodeName === '#text' ? (node as T.TextNode).value : 'childNodes' in node ? node.childNodes.map(plainText).join('') : '';
const normText = (s: string) => s.replace(/\s+/g, ' ').trim();

function findByText(root: T.Node, text: string): El | null {
  let hit: El | null = null;
  const visit = (n: T.Node) => {
    if (hit) return;
    if (
      'tagName' in n &&
      normText(plainText(n)) === normText(text) &&
      !n.childNodes.some((c) => 'tagName' in c && normText(plainText(c)) === normText(text))
    )
      hit = n as El;
    else if ('childNodes' in n) n.childNodes.forEach(visit);
  };
  visit(root);
  return hit;
}

function contains(a: T.Node, b: T.Node): boolean {
  for (let n: T.Node | null = b; n; n = (n as T.ChildNode).parentNode ?? null) if (n === a) return true;
  return false;
}

function cloneNode<N extends T.Node>(node: N, parent: T.ParentNode | null): N {
  const copy = { ...node } as N & { parentNode?: T.ParentNode | null; childNodes?: T.ChildNode[]; attrs?: T.Element['attrs'] };
  if ('attrs' in node) copy.attrs = (node as El).attrs.map((a) => ({ ...a }));
  copy.parentNode = parent;
  if ('childNodes' in node)
    copy.childNodes = (node as unknown as El).childNodes.map((c) => cloneNode(c, copy as unknown as T.ParentNode));
  return copy;
}

function setText(el: El, value: string) {
  el.childNodes = [{ nodeName: '#text', value, parentNode: el } as T.TextNode];
}

/** Einträge einer Liste (Titel + Text) im Entwurf ersetzen; false, wenn der Aufbau nicht eindeutig erkennbar ist. */
function rebuildList(tree: T.DocumentFragment, old: [string, string][], neu: [string, string][]): boolean {
  if (!old.length) return false;
  const titles = old.map(([t]) => findByText(tree, t));
  if (titles.some((t) => !t)) return false;
  // Eintrag = höchster Vorfahre des Titels, der keinen anderen Titel enthält
  const items = titles.map((t, i) => {
    let item = t!;
    while (item.parentNode && 'tagName' in item.parentNode && !titles.some((o, j) => j !== i && contains(item.parentNode!, o!)))
      item = item.parentNode as El;
    return item;
  });
  const parent = items[0]!.parentNode;
  if (!parent || items.some((it) => it.parentNode !== parent)) return false;
  const template = items[0]!;
  const fresh = neu.map(([title, text]) => {
    const copy = cloneNode(template, parent);
    const t = findByText(copy, old[0]![0]);
    if (!t) return null;
    setText(t, title);
    const x = old[0]![1] ? findByText(copy, old[0]![1]) : null;
    if (x) setText(x, text);
    return copy;
  });
  if (fresh.some((f) => !f)) return false;
  const at = parent.childNodes.indexOf(template);
  parent.childNodes = parent.childNodes.filter((c) => !items.includes(c as El));
  parent.childNodes.splice(at, 0, ...(fresh as El[]));
  return true;
}
