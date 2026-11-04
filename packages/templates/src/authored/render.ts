import type { BranchGroup, RenderContext, TemplateDef } from '../types';
import { documentShell } from '../partials/shared';
import { kitFontCss, kitFontFamily } from '../kits/fonts';
import { protectedBusinessContact } from '../kits/render';
import { authoredFragment, checkAuthoredDesign, scopedDesignCss, FREE_DESIGN_VERSION } from './design';

export const authoredTemplateId = (group: BranchGroup) => `authored-${group}`;
export const isAuthoredTemplate = (id: string) => id.startsWith('authored-');
export const AUTHORED_TEMPLATES: TemplateDef[] = (['handwerk', 'beauty', 'gastronomie', 'einzelhandel', 'kurse'] as const).map(
  (group) => ({
    id: authoredTemplateId(group),
    group,
    name: 'Individueller KI-Entwurf',
    description: 'Freies HTML und CSS nach Qualitätskriterien; keine feste Seitenkomposition.',
    palettes: ['custom'],
    render: renderAuthored,
  }),
);
export function renderAuthored(ctx: RenderContext): string {
  const d = ctx.content.design;
  if (!d || checkAuthoredDesign(d).length)
    throw Error('Individueller Entwurf fehlt oder ist ungeprüft; keine stillschweigende Vorlagen-Ersatzseite.');
  const f = ctx.facts,
    p = ctx.parts;
  const replacements = {
    name: f.name,
    city: f.city,
    branch: f.branchLabel,
    phone: p.phoneLabel ?? '',
    street: `${f.street} ${f.houseNumber}`,
    postal_code: f.postalCode,
    phone_url: p.callHref && p.callHref.startsWith('tel:') ? p.callHref : '#anfrage',
    map_url: p.mapsHref,
  };
  const fragment = authoredFragment(d.html, replacements, p.photos(3));
  const contact = protectedBusinessContact(ctx, d);
  const body = `<main id="inhalt"><div id="sw-ai-design">${fragment}</div></main>${contact.html}${p.footer({ className: 'sw-authored-footer', linkClass: 'underline' })}`;
  const fonts = kitFontCss([d.displayFont, d.textFont]);
  const vars = `--display:'${kitFontFamily(d.displayFont)}',serif;--body:'${kitFontFamily(d.textFont)}',sans-serif;--design-bg:${d.colors.background};--design-ink:${d.colors.foreground};--design-accent:${d.colors.accent};--design-on:${d.colors.onAccent};`;
  return documentShell(p, 'k sw-authored', body)
    .replace('<body ', `<body data-design="${FREE_DESIGN_VERSION}" `)
    .replace(
      '</head>',
      `<style>${fonts}${contact.css}#sw-ai-design{${vars}position:relative;isolation:isolate;contain:layout paint;background:var(--design-bg);color:var(--design-ink);font-family:var(--body)}#sw-ai-design *{box-sizing:border-box}#sw-ai-design img{max-width:100%;height:auto}#sw-ai-design .ad-stock-note{display:block;font:11px/1.5 var(--body);margin-top:8px;color:inherit}#sw-ai-design :focus-visible{outline:3px solid currentColor;outline-offset:5px}${scopedDesignCss(d.css)}</style></head>`,
    );
}
