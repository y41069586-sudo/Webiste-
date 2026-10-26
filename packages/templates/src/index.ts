export { brandMarkHtml, brandMarkDataUri } from './brand';
import { renderMalerDesignReview } from './sites/maler-design-review';
import { industryDirection, normalizeDirection } from './art-direction';
export * from './art-direction';
import { buildParts } from './partials/shared';
import { beautyElegant } from './sites/beauty-elegant';
import { beautyModern } from './sites/beauty-modern';
import { beautySoft } from './sites/beauty-soft';
import { handwerkKlar } from './sites/handwerk-klar';
import { handwerkSolid } from './sites/handwerk-solid';
import { handwerkWerkstatt } from './sites/handwerk-werkstatt';
import { PHOTO_TEMPLATES } from './sites/photo-layouts';
import { PLAKAT_TEMPLATES } from './sites/plakat';
import type { BranchGroup, RenderInput, TemplateDef } from './types';

export * from './types';
export * from './palettes';
export { ICON_KEYS, ICONS_BY_GROUP, icon } from './icons';
export { esc, boldMd } from './html';
export { readSiteCss, siteCssPath } from './css';
export { stockPhotoManifest, stockPhotos, imagesDir, type StockPhoto } from './photos';

export const TEMPLATES: TemplateDef[] = [
  handwerkSolid,
  handwerkKlar,
  handwerkWerkstatt,
  beautyElegant,
  beautySoft,
  beautyModern,
  ...PHOTO_TEMPLATES,
  ...PLAKAT_TEMPLATES,
];

export function getTemplate(id: string): TemplateDef {
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`Unbekanntes Template: ${id}`);
  return t;
}

export function templatesForGroup(group: BranchGroup): TemplateDef[] {
  return TEMPLATES.filter((t) => t.group === group);
}

/** Rendert eine vollständige, eigenständige HTML-Seite (CSS inline, kein JavaScript). */
export function renderSite(input: RenderInput): string {
  const tpl = getTemplate(input.templateId);
  if (!tpl.palettes.includes(input.palette)) throw new Error(`Palette ${input.palette} passt nicht zu ${tpl.id}`);
  if (input.mode === 'demo' && !input.demo) throw new Error('Demo-Modus braucht demo-Optionen');
  if (input.mode === 'live' && !input.live) throw new Error('Live-Modus braucht live-Optionen');
  if (input.mode === 'demo' || input.mode === 'screenshot')
    input = { ...input, content: { ...input.content, cta_text: 'Kontakt ansehen' } };
  if (input.artDirection || input.mode === 'demo' || input.mode === 'screenshot')
    input = {
      ...input,
      artDirection: normalizeDirection(input.artDirection, industryDirection(input.facts.group, input.facts.branchLabel)),
    };
  if (
    input.artDirection &&
    input.content.hero_headline.toLocaleLowerCase('de').trim() ===
      `${input.facts.branchLabel} in ${input.facts.city}`.toLocaleLowerCase('de')
  )
    input = { ...input, content: { ...input.content, hero_headline: input.facts.name } };
  const parts = buildParts(input);
  const html = input.designReview ? renderMalerDesignReview({ ...input, parts }) : tpl.render({ ...input, parts });
  const sector = /barber|barbier/i.test(input.facts.branchLabel)
    ? 'barber'
    : /nagel|nail/i.test(input.facts.branchLabel)
      ? 'nails'
      : /elektro|elektriker/i.test(input.facts.branchLabel)
        ? 'electrical'
        : 'general';
  return html.replace(
    '<body ',
    `<body data-template="${tpl.id}" data-sector="${sector}" data-character="${input.artDirection?.character ?? 'legacy'}" data-type="${input.artDirection?.typography ?? 'legacy'}" data-composition="${input.artDirection?.composition ?? 'legacy'}" data-design-source="${input.artDirection?.source ?? 'legacy'}" `,
  );
}
export { renderLetterHtml, embeddedFontCss, LETTER_GEOMETRY, type LetterData, type LetterSender } from './letter';
export { renderInvoiceHtml, type InvoiceData, type InvoiceLine, type InvoiceBuyer, type InvoiceSeller } from './invoice';
export { renderSubpage } from './subpage';
export { renderMaintenanceHtml } from './maintenance';
export { renderClaimLetterHtml, type ClaimLetterData } from './claim-letter';
