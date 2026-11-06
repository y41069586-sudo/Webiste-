import type { BranchGroup, RenderContext, TemplateDef } from '../types';
import { documentShell } from '../partials/shared';
import { kitFontCss, kitFontFamily } from '../kits/fonts';
import { purgeCss } from '../kits/purge';
import { protectedBusinessContact } from '../kits/render';
import { authoredFragment, checkAuthoredDesign, scopedDesignCss, FREE_DESIGN_VERSION } from './design';
import { locationText, adaptLocationHeading } from './location';

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
    service_area: locationText(f, p.draft),
    placeholder_photos: 'Entwurfsplatzhalter: Hier ergänzen Sie eigene, freigegebene Fotos Ihres Betriebs.',
    placeholder_team: 'Entwurfsplatzhalter: Hier ergänzen Sie eine bestätigte Vorstellung und eigene Bilder Ihres Teams.',
    placeholder_references: 'Entwurfsplatzhalter: Hier ergänzen Sie echte, zur Veröffentlichung freigegebene Referenzen.',
  };
  const fragment = authoredFragment(adaptLocationHeading(d.html, f), replacements, p.photos(3), p.draft);
  const contact = protectedBusinessContact(ctx, d);
  const body = `<main id="inhalt"><div id="sw-ai-design">${fragment}</div></main>${contact.html}${p.footer({ className: 'sw-authored-footer', linkClass: 'underline' })}`;
  const fonts = kitFontCss([d.displayFont === 'archivo' ? 'archivo-free' : d.displayFont, d.textFont]);
  const vars = `--display:'${kitFontFamily(d.displayFont)}',serif;--body:'${kitFontFamily(d.textFont)}',sans-serif;--design-bg:${d.colors.background};--design-ink:${d.colors.foreground};--design-accent:${d.colors.accent};--design-on:${d.colors.onAccent};`;
  const shell = documentShell(p, 'k sw-authored', body);
  const html = shell
    .replace('<body ', `<body data-design="${FREE_DESIGN_VERSION}" `)
    .replace(
      '</head>',
      `<style>${fonts}${purgeCss(contact.css, shell)}${authoredContactCss(d)}#sw-ai-design{${vars}position:relative;isolation:isolate;contain:layout paint;background:var(--design-bg);color:var(--design-ink);font-family:var(--body)}#sw-ai-design *{box-sizing:border-box}#sw-ai-design img{max-width:100%;height:auto}#sw-ai-design .ad-stock-note{display:block;font:11px/1.5 var(--body);margin-top:8px;color:inherit}#sw-ai-design :focus-visible{outline:3px solid currentColor;outline-offset:5px}${scopedDesignCss(d.css)}</style></head>`,
    );
  // Prune only shared utility CSS; authored selectors and details/media rules stay intact.
  return html.replace(/<style>([\s\S]*?)<\/style>/, (_m, css: string) => `<style>${purgeCss(css, html)}</style>`);
}

/** Theme only: no generated style can reach this protected form. Its markup/actions remain unchanged. */
function authoredContactCss(d: NonNullable<RenderContext['content']['design']>): string {
  const display = `'${kitFontFamily(d.displayFont)}',serif`,
    text = `'${kitFontFamily(d.textFont)}',sans-serif`;
  const c = d.colors;
  return `#anfrage{--ad-contact-bg:${c.background};--ad-contact-ink:${c.foreground};--ad-contact-accent:${c.accent};--ad-contact-on:${c.onAccent};--ad-contact-display:${display};--ad-contact-text:${text};background:var(--ad-contact-bg);color:var(--ad-contact-ink);font-family:var(--ad-contact-text)}#anfrage h2,#anfrage h3{font-family:var(--ad-contact-display);color:var(--ad-contact-ink)}#anfrage p,#anfrage a,#anfrage label,#anfrage legend,#anfrage small,#anfrage dt,#anfrage dd{color:var(--ad-contact-ink)}#anfrage .k-form,#anfrage .k-live-card,#anfrage .k-sim-note{background:var(--ad-contact-bg);color:var(--ad-contact-ink);border-color:var(--ad-contact-ink)}#anfrage input,#anfrage textarea,#anfrage select,#anfrage .k-sim fieldset:disabled input,#anfrage .k-sim fieldset:disabled textarea{background:var(--ad-contact-bg);color:var(--ad-contact-ink);border-color:var(--ad-contact-ink);font-family:var(--ad-contact-text)}#anfrage .k-btn{font-family:var(--ad-contact-text)}#anfrage .k-btn-primary{background:var(--ad-contact-accent);border-color:var(--ad-contact-accent);color:var(--ad-contact-on)!important}#anfrage input::placeholder,#anfrage textarea::placeholder{color:var(--ad-contact-ink);opacity:.7}#anfrage :focus-visible{outline:3px solid var(--ad-contact-ink);outline-offset:4px}`;
}
