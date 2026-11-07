import { AUTHORED_TEMPLATES, isAuthoredTemplate } from './authored/render';
export { brandMarkHtml, brandMarkDataUri } from './brand';
import { renderMalerDesignReview } from './sites/maler-design-review';
import { industryDirection, normalizeDirection } from './art-direction';
export * from './art-direction';
import { buildParts } from './partials/shared';
import { esc } from './html';
import { beautyElegant } from './sites/beauty-elegant';
import { beautyModern } from './sites/beauty-modern';
import { beautySoft } from './sites/beauty-soft';
import { handwerkKlar } from './sites/handwerk-klar';
import { handwerkSolid } from './sites/handwerk-solid';
import { handwerkWerkstatt } from './sites/handwerk-werkstatt';
import { PHOTO_TEMPLATES } from './sites/photo-layouts';
import { PLAKAT_TEMPLATES } from './sites/plakat';
import type { BranchGroup, RenderInput, TemplateDef } from './types';
import { KITS, getKit } from './kits/kits';
import { renderKit } from './kits/render';
export { KITS, kitFor, getKit, kitVariantFor, hoursHints, type KitVariantHints } from './kits/kits';
export { editorialPlan, EDITORIAL_VERSION, type EditorialPlan } from './kits/editorial';
export { designBrief, requestLabel, type DesignBrief } from './kits/brief';
export { slopFindings, slopFindingsForPage, type SlopFinding } from './kits/slop';

/** Gestaltungs-Kits (04.11.2026): je Gewerk ein eigenes Konzept, Farbwelten als „Paletten“. */
export const KIT_TEMPLATES: TemplateDef[] = KITS.map((kit) => ({
  id: kit.id,
  group: kit.group,
  name: kit.name,
  description: `Gestaltungs-Kit ${kit.name}: eigenes Schriftpaar, Farbrollen und Signatur-Element`,
  palettes: Object.keys(kit.variants),
  render: (ctx) => renderKit(ctx, kit),
}));

export * from './types';
export { updateAuthoredCopy } from './authored/update';
export { AUTHORED_TEMPLATES, authoredTemplateId, isAuthoredTemplate } from './authored/render';
export { FULL_PAGE_VERSION, AUTHORED_SECTION_KEYS, authoredSectionIssues } from './authored/sections';
export { locationPurpose, locationText, adaptLocationHeading } from './authored/location';
export { applyMobileHeroLayer, MOBILE_LAYER_VERSION } from './authored/mobile';
export {
  FREE_DESIGN_CRITERIA,
  freeDesignBrief,
  authoredCompleteness,
  AUTHORED_MIN_SECTIONS,
  AUTHORED_MIN_TEXT,
} from './authored/criteria';
export { checkAuthoredDesign, authoredText, FREE_DESIGN_VERSION, type AuthoredDesign } from './authored/design';
export * from './palettes';
export { ICON_KEYS, ICONS_BY_GROUP, icon } from './icons';
export { esc, boldMd } from './html';
export { readSiteCss, siteCssPath } from './css';
export { stockPhotoManifest, stockPhotos, stockPhotoDataUri, imagesDir, type StockPhoto } from './photos';

export const TEMPLATES: TemplateDef[] = [
  handwerkSolid,
  handwerkKlar,
  handwerkWerkstatt,
  beautyElegant,
  beautySoft,
  beautyModern,
  ...PHOTO_TEMPLATES,
  ...PLAKAT_TEMPLATES,
  ...KIT_TEMPLATES,
  ...AUTHORED_TEMPLATES,
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
  if (isAuthoredTemplate(tpl.id)) {
    const parts = buildParts({ ...input, artDirection: undefined, palette: 'anthrazit' });
    const d = input.artDirection;
    const meta = d
      ? ` data-character="${esc(d.character)}" data-type="${esc(d.typography)}" data-composition="${esc(d.composition)}" data-design-source="${esc(d.source)}"`
      : '';
    return tpl.render({ ...input, artDirection: undefined, parts }).replace('<body ', `<body data-template="${tpl.id}"${meta} `);
  }
  if (input.mode === 'demo' || input.mode === 'screenshot')
    input = { ...input, content: { ...input.content, cta_text: 'So erreichen Sie uns' } };
  const kit = getKit(tpl.id);
  if (kit) {
    // Kits bringen Farben und Schriften selbst mit: keine Art-Direction-Schicht, neutrale Palette nur für Kopfdaten
    const parts = buildParts({ ...input, artDirection: undefined, palette: 'anthrazit' });
    const d = input.artDirection;
    const meta = d
      ? ` data-character="${esc(d.character)}" data-type="${esc(d.typography)}" data-composition="${esc(d.composition)}" data-design-source="${esc(d.source)}"`
      : '';
    return tpl
      .render({ ...input, artDirection: undefined, parts })
      .replace('<body ', `<body data-template="${tpl.id}" data-kit="${kit.id}" data-variant="${esc(input.palette)}"${meta} `);
  }
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
    `<body data-template="${tpl.id}" data-headline="${input.content.hero_headline.length > 56 ? 'long' : 'standard'}" data-sector="${sector}" data-character="${input.artDirection?.character ?? 'legacy'}" data-type="${input.artDirection?.typography ?? 'legacy'}" data-composition="${input.artDirection?.composition ?? 'legacy'}" data-design-source="${input.artDirection?.source ?? 'legacy'}" `,
  );
}
export {
  renderLetterHtml,
  embeddedFontCss,
  LETTER_GEOMETRY,
  returnAddressLine,
  type LetterData,
  type LetterSender,
} from './letter';
export {
  hasTaxNumber,
  renderInvoiceHtml,
  type InvoiceData,
  type InvoiceLine,
  type InvoiceBuyer,
  type InvoiceSeller,
} from './invoice';
export { renderSubpage } from './subpage';
export { renderMaintenanceHtml } from './maintenance';
export { renderClaimLetterHtml, type ClaimLetterData } from './claim-letter';
export { offerSection } from './partials/shared';
