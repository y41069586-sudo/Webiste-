import { parseFragment, serialize, type DefaultTreeAdapterTypes as T } from 'parse5';
import postcss from 'postcss';
import { contrastRatio } from '../palettes';
import type { KitDisplayFont } from '../kits/fonts';
import selectorParser from 'postcss-selector-parser';

export const FREE_DESIGN_VERSION = 'free-design-1';
export interface AuthoredDesign {
  concept: string;
  html: string;
  css: string;
  displayFont: KitDisplayFont;
  contentVersion?: 'full-page-1' | 'full-page-2';
  colors: { background: string; foreground: string; accent: string; onAccent: string };
  textFont: 'karla' | 'atkinson';
}
const TAGS = new Set(
  'section article header footer nav div span p h1 h2 h3 h4 ul ol li dl dt dd a img figure figcaption details summary strong em b i small br hr'.split(
    ' ',
  ),
);
const ATTRS = new Set(
  'data-ad-section data-ad-placeholder class id href src alt width height loading decoding aria-label aria-labelledby aria-describedby aria-hidden role open'.split(
    ' ',
  ),
);
const TOKENS = new Set([
  'name',
  'city',
  'branch',
  'phone',
  'street',
  'postal_code',
  'image_1',
  'image_2',
  'image_3',
  'phone_url',
  'map_url',
  'service_area',
  'placeholder_photos',
  'placeholder_team',
  'placeholder_references',
]);
const GLOBAL = new Set(['html', 'body']);

/** Reject rather than execute or silently repair model HTML. The renderer only sees checked fragments. */
export function checkAuthoredDesign(d: AuthoredDesign): string[] {
  const errors: string[] = [];
  if (!d || typeof d.html !== 'string' || typeof d.css !== 'string' || typeof d.concept !== 'string')
    return ['Individueller HTML/CSS-Entwurf fehlt.'];
  if (!d.concept.trim() || d.concept.length > 700) errors.push('Konzept fehlt oder ist zu lang.');
  if (d.html.length > 30000 || d.css.length > 20000 || !d.html.trim() || !d.css.trim())
    return ['HTML/CSS leer oder zu umfangreich.'];
  if (
    ![
      'archivo',
      'archivo-free',
      'archivo-maler',
      'archivo-fliesen',
      'archivo-elektro',
      'archivo-reinigung',
      'bodoni',
      'gloock',
    ].includes(d.displayFont) ||
    !['karla', 'atkinson'].includes(d.textFont)
  )
    errors.push('Schriftdatei nicht aus der lokal verfügbaren Bibliothek.');
  if (
    !d.colors ||
    ['background', 'foreground', 'accent', 'onAccent'].some(
      (k) => !/^#[0-9a-f]{6}$/i.test((d.colors as unknown as Record<string, string>)[k] ?? ''),
    )
  )
    errors.push('Vier gültige Hex-Farbrollen erforderlich.');
  else if (
    contrastRatio(d.colors.foreground, d.colors.background) < 4.5 ||
    contrastRatio(d.colors.onAccent, d.colors.accent) < 4.5
  )
    errors.push('Text- und Akzentfarben brauchen mindestens 4,5:1 Kontrast.');
  if (d.contentVersion && !['full-page-1', 'full-page-2'].includes(d.contentVersion)) errors.push('Unbekannter Inhaltsstandard.');
  const tree = parseFragment(d.html, { onParseError: (e) => errors.push(`HTML: ${e.code}`) });
  let h1 = 0;
  const ids = new Set<string>();
  const links: string[] = [];
  walk(tree, (node) => {
    if (!('tagName' in node)) return;
    if (!TAGS.has(node.tagName)) errors.push(`Nicht erlaubtes Element: ${node.tagName}`);
    if (node.tagName === 'h1') h1++;
    for (const a of node.attrs) {
      if (!ATTRS.has(a.name)) errors.push(`Nicht erlaubtes Attribut: ${a.name}`);
      if (
        a.name === 'data-ad-section' &&
        !['services', 'process', 'preparation', 'inquiry', 'area', 'gallery', 'faq', 'placeholders'].includes(a.value)
      )
        errors.push('Unbekannter Inhaltsbereich.');
      if (a.name === 'data-ad-placeholder' && !['photos', 'team', 'references'].includes(a.value))
        errors.push('Unbekannter Entwurfsplatzhalter.');
      if (a.name === 'id') {
        if (!/^ad-[a-z0-9-]+$/.test(a.value) || ids.has(a.value)) errors.push('IDs müssen eindeutig sein und mit ad- beginnen.');
        ids.add(a.value);
      }
      if (a.name === 'href') {
        if (!/^(#[a-zA-Z0-9_-]+|\{\{(?:phone_url|map_url)\}\})$/.test(a.value))
          errors.push('Links nur zu internen Zielen oder geprüften Telefon-/Karten-Tokens.');
        if (a.value.startsWith('#')) links.push(a.value.slice(1));
      }
      if (a.name === 'src' && !/^\{\{image_[123]\}\}$/.test(a.value))
        errors.push('Bilder ausschließlich aus den freigegebenen Bildslots.');
      if (a.name.startsWith('aria-') && /[<>]/.test(a.value)) errors.push('Ungültiger ARIA-Text.');
    }
    if (node.tagName === 'img' && (!node.attrs.some((a) => a.name === 'src') || !node.attrs.some((a) => a.name === 'alt')))
      errors.push('Bild braucht Bildslot und Alternativtext.');
  });
  if (h1 !== 1) errors.push('Genau eine Hauptüberschrift erforderlich.');
  for (const target of links)
    if (!ids.has(target) && target !== 'anfrage' && target !== 'inhalt') errors.push(`Sprungziel fehlt: ${target}`);
  for (const token of d.html.matchAll(/\{\{([^}]+)\}\}/g))
    if (!TOKENS.has(token[1]!)) errors.push(`Unbekannter Platzhalter: ${token[1]}`);
  try {
    scopedDesignCss(d.css);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : String(e));
  }
  return [...new Set(errors)].slice(0, 15);
}
function walk(node: T.Node, visit: (node: T.Node) => void) {
  visit(node);
  if ('childNodes' in node) for (const child of node.childNodes) walk(child, visit);
}

/** Parser-based scoping: even nested selectors cannot reach checkout, forms or outer chrome. */
export function scopedDesignCss(css: string): string {
  if (css.includes('<')) throw Error('Kein HTML in CSS.');
  const ast = postcss.parse(css);
  ast.walkAtRules((rule) => {
    if (!['media', 'supports'].includes(rule.name.toLowerCase())) throw Error(`CSS @${rule.name} nicht erlaubt.`);
    if (/[{};]|url\s*\(|expression\s*\(/i.test(rule.params)) throw Error('Ungültige CSS-Bedingung.');
  });
  ast.walkDecls((decl) => {
    if (decl.parent?.type !== 'rule') throw Error('CSS-Deklarationen nur innerhalb eigener Regeln.');
    const v = decl.value.replace(/\/\*[\s\S]*?\*\//g, '');
    if (
      /\\|url\s*\(|image-set\s*\(|expression\s*\(|javascript|behavior|-moz-binding|[<>]/i.test(v) ||
      /^(?:behavior|-moz-binding)$/i.test(decl.prop)
    )
      throw Error('Externe Ressourcen oder aktiver CSS-Inhalt nicht erlaubt.');
    if (decl.prop.toLowerCase() === 'content' && !/^(?:""|''|none|normal)$/.test(v.trim()))
      throw Error('Inhaltliche Texte gehören ins HTML; CSS content nur leer.');
    if (decl.important) throw Error('Keine !important-Regeln; geschützte Bereiche bleiben unabhängig.');
  });
  ast.walkRules((rule) => {
    if (rule.parent?.type === 'rule') throw Error('Verschachtelte CSS-Regeln nicht erlaubt; flache Regeln verwenden.');
    if (rule.selector.includes('\\')) throw Error('Keine maskierten CSS-Selektoren.');
    rule.selector = selectorParser((root) => {
      root.each((selector) => {
        if (selector.nodes[0]?.type === 'combinator') throw Error('Keine relativen CSS-Selektoren.');
        selector.walkNesting(() => {
          throw Error('Keine verschachtelten Selektoren.');
        });
        selector.walkTags((tag) => {
          if (GLOBAL.has(tag.value.toLowerCase())) throw Error('CSS auf eigene Klassen begrenzen, keine html/body-Selektoren.');
        });
        selector.walkPseudos((p) => {
          if ([':root', ':host', ':host-context', '::part', '::slotted'].includes(p.value))
            throw Error('Keine globalen oder Shadow-DOM-Selektoren.');
        });
        selector.prepend(selectorParser.combinator({ value: ' ' }));
        selector.prepend(selectorParser.id({ value: 'sw-ai-design' }));
      });
    }).processSync(rule.selector);
  });
  return ast.toString();
}

/** Visible model prose for the existing source/factual checks; no layout tokens or decorative indices. */
export function authoredText(html: string): string {
  const tree = parseFragment(html);
  const parts: string[] = [];
  const collect = (node: T.Node) => {
    if ('tagName' in node && node.attrs.some((a) => a.name === 'aria-hidden' && a.value === 'true')) {
      const text = serialize(node)
        .replace(/<[^>]*>/g, '')
        .replace(/\{\{[a-z0-9_]+\}\}/g, '');
      if (/^[\d\s\p{P}\p{S}]*$/u.test(text)) return;
    }
    if (node.nodeName === '#text') parts.push((node as T.TextNode).value.replace(/\{\{[a-z0-9_]+\}\}/g, ' '));
    if ('childNodes' in node) node.childNodes.forEach(collect);
  };
  collect(tree);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function authoredFragment(
  html: string,
  replacements: Record<string, string>,
  images: { src: string; alt: string; example: boolean }[],
  draft = true,
): string {
  const tree = parseFragment(html);
  const visit = (parent: T.ParentNode) => {
    for (const node of [...parent.childNodes]) {
      if (
        !draft &&
        'attrs' in node &&
        node.attrs.some(
          (a) =>
            a.name === 'data-ad-placeholder' ||
            (a.name === 'data-ad-section' && (a.value === 'placeholders' || (a.value === 'gallery' && images.length === 0))),
        )
      ) {
        parent.childNodes = parent.childNodes.filter((n) => n !== node);
        continue;
      }
      if ('tagName' in node && node.tagName === 'img') {
        const src = node.attrs.find((a) => a.name === 'src');
        const match = src?.value.match(/^\{\{image_([123])\}\}$/);
        const image = match ? images[Number(match[1]) - 1] : undefined;
        if (!image) {
          parent.childNodes = parent.childNodes.filter((n) => n !== node);
          continue;
        }
        src!.value = image.src;
        node.attrs.find((a) => a.name === 'alt')!.value = image.alt;
        if (image.example) {
          const note = parseFragment('<span class="ad-stock-note">Symbolbild · keine Aufnahme des Betriebs</span>')
            .childNodes[0]!;
          node.parentNode!.childNodes.splice(node.parentNode!.childNodes.indexOf(node) + 1, 0, note);
          (note as T.ChildNode).parentNode = parent;
        }
      }
      if ('attrs' in node)
        for (const a of node.attrs) a.value = a.value.replace(/\{\{([a-z0-9_]+)\}\}/g, (_, k: string) => replacements[k] ?? '');
      if (node.nodeName === '#text')
        (node as T.TextNode).value = (node as T.TextNode).value.replace(
          /\{\{([a-z0-9_]+)\}\}/g,
          (_, k: string) => replacements[k] ?? '',
        );
      if ('childNodes' in node) visit(node);
    }
  };
  visit(tree);
  return serialize(tree);
}
