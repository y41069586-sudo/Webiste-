import { esc } from './html';
import { BRAND_MARK_WEB, BRAND_MARK_PRINT } from './brand-assets';
/** Self-contained provider branding for CSP-restricted demos and printable PDFs. */
export function brandMarkDataUri(print = false): string {
  return print ? BRAND_MARK_PRINT : BRAND_MARK_WEB;
}
export function brandMarkHtml(size = 28, print = false): string {
  return `<img src="${esc(brandMarkDataUri(print))}" width="${size}" height="${size}" alt="SeitenWerk" style="display:inline-block;vertical-align:middle;object-fit:contain;flex-shrink:0" decoding="async">`;
}
