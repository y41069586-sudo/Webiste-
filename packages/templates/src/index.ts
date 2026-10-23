import { buildParts } from './partials/shared';
import { beautyElegant } from './sites/beauty-elegant';
import { beautyModern } from './sites/beauty-modern';
import { beautySoft } from './sites/beauty-soft';
import { handwerkKlar } from './sites/handwerk-klar';
import { handwerkSolid } from './sites/handwerk-solid';
import { handwerkWerkstatt } from './sites/handwerk-werkstatt';
import type { BranchGroup, RenderInput, TemplateDef } from './types';

export * from './types';
export * from './palettes';
export { ICON_KEYS, ICONS_BY_GROUP, icon } from './icons';
export { esc, boldMd } from './html';
export { readSiteCss, siteCssPath } from './css';

export const TEMPLATES: TemplateDef[] = [handwerkSolid, handwerkKlar, handwerkWerkstatt, beautyElegant, beautySoft, beautyModern];

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
  const parts = buildParts(input);
  return tpl.render({ ...input, parts });
}
export { renderLetterHtml, embeddedFontCss, LETTER_GEOMETRY, type LetterData, type LetterSender } from './letter';
export { renderInvoiceHtml, type InvoiceData, type InvoiceLine, type InvoiceBuyer, type InvoiceSeller } from './invoice';
export { renderSubpage } from './subpage';
export { renderMaintenanceHtml } from './maintenance';
export { renderClaimLetterHtml, type ClaimLetterData } from './claim-letter';
